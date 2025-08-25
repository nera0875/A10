import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { query } = await request.json()
    
    if (!query?.trim()) {
      return NextResponse.json({ error: 'Requête vide' }, { status: 400 })
    }

    // Générer l'embedding de la requête
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.trim(),
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Recherche hybride : mémoires + chunks
    const [memoriesResult, chunksResult] = await Promise.all([
      supabase.rpc('search_memories', {
        query_embedding: queryEmbedding,
        match_threshold: 0.6,
        match_count: 5,
        user_id: user.id
      }),
      supabase.rpc('search_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.6,
        match_count: 5,
        user_id: user.id
      })
    ])

    const memories = memoriesResult.data || []
    const chunks = chunksResult.data || []

    // Combiner et trier les résultats
    const allSources = [
      ...memories.map((m: any) => ({ ...m, type: 'memory' })),
      ...chunks.map((c: any) => ({ ...c, type: 'chunk' }))
    ].sort((a, b) => b.similarity - a.similarity).slice(0, 8)

    if (allSources.length === 0) {
      return NextResponse.json({
        answer: "Je n'ai pas trouvé d'informations pertinentes dans vos mémoires et documents pour répondre à cette question.",
        sources: []
      })
    }

    // Construire le contexte pour le LLM
    const context = allSources.map((source, index) => 
      `[${index + 1}] ${source.type === 'memory' ? 'Mémoire' : 'Document'}: ${source.content}`
    ).join('\n\n')

    // Générer la réponse avec le LLM
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tu es un assistant intelligent qui aide à répondre aux questions en utilisant les mémoires personnelles et documents de l'utilisateur. 

Règles importantes:
- Réponds uniquement en français
- Base ta réponse sur le contexte fourni
- Cite tes sources en utilisant [1], [2], etc.
- Si l'information n'est pas dans le contexte, dis-le clairement
- Sois concis mais informatif
- Maintiens un ton professionnel et bienveillant`
        },
        {
          role: 'user',
          content: `Contexte disponible:\n${context}\n\nQuestion: ${query}\n\nRéponds en te basant sur le contexte fourni et en citant tes sources.`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const answer = completion.choices[0].message.content || 
                  "Désolé, je n'ai pas pu générer une réponse appropriée."

    // Formater les sources pour le client
    const sources = allSources.map(source => ({
      type: source.type,
      id: source.id,
      content: source.content,
      similarity: source.similarity
    }))

    return NextResponse.json({
      answer,
      sources
    })
  } catch (error) {
    console.error('Erreur requête RAG:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
