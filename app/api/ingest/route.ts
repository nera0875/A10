import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { chunkText } from '@/lib/utils'
import OpenAI from 'openai'
// @ts-ignore
import pdf from 'pdf-parse'

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    // Vérifier la taille du fichier (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10MB)' }, { status: 400 })
    }

    let content = ''
    let fileType = ''

    // Extraire le contenu selon le type de fichier
    if (file.type === 'application/pdf') {
      fileType = 'pdf'
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const data = await pdf(buffer)
      content = data.text
    } else if (file.type === 'text/plain') {
      fileType = 'txt'
      content = await file.text()
    } else if (file.type === 'text/markdown') {
      fileType = 'md'
      content = await file.text()
    } else {
      return NextResponse.json({ error: 'Type de fichier non supporté' }, { status: 400 })
    }

    // Créer l'entrée document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert([{
        user_id: user.id,
        title: file.name,
        content: content.substring(0, 1000), // Preview du contenu
        file_type: fileType,
        file_size: file.size,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (docError) throw docError

    // Chunker le contenu
    const chunks = chunkText(content, 400) // ~400 tokens par chunk
    
    // Traiter chaque chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      try {
        // Générer l'embedding
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
        })

        const embedding = embeddingResponse.data[0].embedding
        
        // Estimer le nombre de tokens
        const tokenCount = Math.ceil(chunk.length / 4)

        // Insérer le chunk
        await supabase
          .from('chunks')
          .insert([{
            document_id: document.id,
            content: chunk,
            tokens: tokenCount,
            embedding: embedding,
            chunk_index: i,
            created_at: new Date().toISOString()
          }])

        // Petite pause pour éviter de surcharger l'API OpenAI
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (chunkError) {
        console.error(`Erreur traitement chunk ${i}:`, chunkError)
        // Continuer avec les autres chunks même en cas d'erreur
      }
    }

    return NextResponse.json({
      success: true,
      document: document,
      chunksProcessed: chunks.length
    })
  } catch (error) {
    console.error('Erreur ingestion:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
