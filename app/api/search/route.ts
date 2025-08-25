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

    const { query, type = 'all', limit = 10 } = await request.json()
    
    if (!query?.trim()) {
      return NextResponse.json({ error: 'Requête vide' }, { status: 400 })
    }

    // Générer l'embedding de la requête
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.trim(),
    })

    const queryEmbedding = embeddingResponse.data[0].embedding
    const results = []

    // Recherche dans les mémoires
    if (type === 'all' || type === 'memories') {
      const { data: memories } = await supabase.rpc('search_memories', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        user_id: user.id
      })

      if (memories) {
        results.push(...memories.map((m: any) => ({
          ...m,
          type: 'memory'
        })))
      }
    }

    // Recherche dans les chunks de documents
    if (type === 'all' || type === 'chunks') {
      const { data: chunks } = await supabase.rpc('search_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        user_id: user.id
      })

      if (chunks) {
        results.push(...chunks.map((c: any) => ({
          ...c,
          type: 'chunk'
        })))
      }
    }

    // Trier par similarité
    results.sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json(results.slice(0, limit))
  } catch (error) {
    console.error('Erreur recherche:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
