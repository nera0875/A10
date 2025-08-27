import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import { type ModelConfig } from '../config/route'
import { calculateAndSaveUsage, interceptOpenAIUsage, forceUsageRecord } from '@/lib/usage-calculator'

// Configuration par défaut locale
const DEFAULT_CONFIG: ModelConfig = {
  chatModel: 'gpt-4o',
  embeddingModel: 'text-embedding-3-small',
  systemPrompt: 'Tu es un assistant IA personnel qui aide l\'utilisateur en utilisant ses mémoires et documents personnels. Réponds de manière naturelle et utile.',
  temperature: 0.7,
  topP: 1,
  maxTokens: 2000
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

// Helper pour charger la config utilisateur
async function getUserConfig(supabase: any, userId: string): Promise<ModelConfig> {
  const { data: configData } = await supabase
    .from('user_configs')
    .select('config')
    .eq('user_id', userId)
    .eq('config_type', 'model_settings')
    .single()

  return configData?.config || DEFAULT_CONFIG
}

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET memories:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { content } = await request.json()
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })
    }

    logger.info(`Création mémoire pour ${user.email}`, { 
      category: 'Memory', 
      details: { content: content.substring(0, 50) + '...' } 
    })

    // Charger la configuration utilisateur
    const userConfig = await getUserConfig(supabase, user.id)

    if (!openai) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Générer l'embedding avec OpenAI
    logger.info('Génération embedding pour la mémoire', { 
      category: 'OpenAI',
      details: { model: userConfig.embeddingModel }
    })
    
    const embeddingResponse = await openai.embeddings.create({
      model: userConfig.embeddingModel,
      input: content.trim(),
    })

    // Calcul automatique des coûts pour l'embedding
    if (embeddingResponse.usage) {
      await interceptOpenAIUsage(embeddingResponse, userConfig.embeddingModel, user.id, undefined)
    } else {
      // Estimation si pas d'usage retourné
      const estimatedTokens = Math.ceil(content.trim().length / 4)
      await forceUsageRecord(userConfig.embeddingModel, estimatedTokens, 0, user.id, undefined)
    }

    const embedding = embeddingResponse.data[0].embedding
    logger.success('Embedding généré pour la mémoire', { category: 'OpenAI' })

    // Préparer les données d'insertion selon le modèle d'embedding
    const insertData: any = {
      user_id: user.id,
      content: content.trim(),
      embedding_model: userConfig.embeddingModel,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Assigner l'embedding à la bonne colonne selon le modèle
    if (userConfig.embeddingModel === 'text-embedding-3-large') {
      insertData.embedding_large = embedding
    } else {
      insertData.embedding = embedding
    }

    const { data, error } = await supabase
      .from('memories')
      .insert([insertData])
      .select()
      .single()

    if (error) throw error

    logger.success(`Mémoire créée avec embedding`, { 
      category: 'Memory', 
      details: { id: data.id, user: user.email } 
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    const errorMsg = 'Erreur création mémoire: ' + (error as Error).message
    logger.error(errorMsg, { category: 'Memory', details: { error: (error as Error).message } })
    console.error('Erreur POST memories:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id, content } = await request.json()
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })
    }

    logger.info(`Mise à jour mémoire ${id}`, { 
      category: 'Memory', 
      details: { content: content.substring(0, 50) + '...' } 
    })

    // Charger la configuration utilisateur
    const userConfig = await getUserConfig(supabase, user.id)

    if (!openai) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Générer un nouvel embedding pour le contenu modifié
    logger.info('Génération nouvel embedding pour la mémoire', { 
      category: 'OpenAI',
      details: { model: userConfig.embeddingModel }
    })
    
    const embeddingResponse = await openai.embeddings.create({
      model: userConfig.embeddingModel,
      input: content.trim(),
    })

    // Calcul automatique des coûts pour l'embedding
    if (embeddingResponse.usage) {
      await interceptOpenAIUsage(embeddingResponse, userConfig.embeddingModel, user.id, undefined)
    } else {
      // Estimation si pas d'usage retourné
      const estimatedTokens = Math.ceil(content.trim().length / 4)
      await forceUsageRecord(userConfig.embeddingModel, estimatedTokens, 0, user.id, undefined)
    }

    const embedding = embeddingResponse.data[0].embedding
    logger.success('Nouvel embedding généré', { category: 'OpenAI' })

    // Préparer les données de mise à jour selon le modèle d'embedding
    const updateData: any = {
      content: content.trim(),
      embedding_model: userConfig.embeddingModel,
      updated_at: new Date().toISOString()
    }

    // Assigner l'embedding à la bonne colonne selon le modèle
    if (userConfig.embeddingModel === 'text-embedding-3-large') {
      updateData.embedding_large = embedding
      updateData.embedding = null // Nettoyer l'ancien si on passe au large
    } else {
      updateData.embedding = embedding
      updateData.embedding_large = null // Nettoyer l'ancien si on revient au small
    }

    const { data, error } = await supabase
      .from('memories')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    logger.success(`Mémoire mise à jour avec nouvel embedding`, { 
      category: 'Memory', 
      details: { id: data.id } 
    })

    return NextResponse.json(data)
  } catch (error) {
    const errorMsg = 'Erreur mise à jour mémoire: ' + (error as Error).message
    logger.error(errorMsg, { category: 'Memory', details: { error: (error as Error).message } })
    console.error('Erreur PUT memories:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE memories:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
