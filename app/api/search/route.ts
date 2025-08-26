import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { calculateAndSaveUsage, interceptOpenAIUsage, forceUsageRecord } from '@/lib/usage-calculator'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

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

    if (!openai) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Générer l'embedding de la requête
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.trim(),
    })

    // 🚀 CALCUL AUTOMATIQUE DES COÛTS POUR L'EMBEDDING
    // Détection du cache RAG basée sur les résultats de recherche (sera calculée après)
    let cacheHit = false
    
    if (embeddingResponse.usage) {
      interceptOpenAIUsage(
        embeddingResponse,
        'text-embedding-3-small',
        undefined, // pas de conversation pour la recherche
        user.id,
        '/api/search',
        cacheHit // sera mis à jour après analyse des résultats
      )
    } else {
      // Estimation si pas d'usage retourné
      const estimatedTokens = Math.ceil(query.trim().length / 4)
      forceUsageRecord(
        'text-embedding-3-small',
        estimatedTokens,
        0,
        undefined,
        user.id,
        '/api/search',
        cacheHit
      )
    }

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
    
    // 🎯 DÉTECTION INTELLIGENTE DU CACHE HIT RAG POUR LA RECHERCHE
    // Un cache hit est détecté si des résultats pertinents sont trouvés
    const hasHighQualityResults = results.some(result => result.similarity > 0.7)
    const hasMultipleResults = results.length >= 2
    cacheHit = hasHighQualityResults && hasMultipleResults
    
    console.log('🎯 Analyse cache RAG pour recherche:', {
      resultsCount: results.length,
      hasHighQualityResults,
      hasMultipleResults,
      cacheHit,
      topSimilarity: results.length > 0 ? results[0].similarity : 0
    })
    
    // 🔄 MISE À JOUR DU CACHE HIT DANS LES STATISTIQUES
    // Recalculer les coûts avec le cache hit correct
    if (embeddingResponse.usage) {
      interceptOpenAIUsage(
        embeddingResponse,
        'text-embedding-3-small',
        undefined,
        user.id,
        '/api/search',
        cacheHit // 🎯 Cache hit mis à jour
      )
    } else {
      const estimatedTokens = Math.ceil(query.trim().length / 4)
      forceUsageRecord(
        'text-embedding-3-small',
        estimatedTokens,
        0,
        undefined,
        user.id,
        '/api/search',
        cacheHit // 🎯 Cache hit mis à jour
      )
    }

    return NextResponse.json(results.slice(0, limit))
  } catch (error) {
    console.error('Erreur recherche:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
