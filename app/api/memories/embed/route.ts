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

    const { content, memoryId } = await request.json()
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })
    }

    // Générer l'embedding avec OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content.trim(),
    })

    const embedding = embeddingResponse.data[0].embedding

    // Mettre à jour la mémoire avec l'embedding
    let query = supabase
      .from('memories')
      .update({ embedding })
      .eq('user_id', user.id)

    if (memoryId) {
      query = query.eq('id', memoryId)
    } else {
      // Si pas d'ID spécifié, prendre la plus récente
      query = query.order('created_at', { ascending: false }).limit(1)
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur génération embedding:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
