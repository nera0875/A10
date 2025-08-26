import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

interface Rule {
  id: string
  name: string
  emoji: string
  content: string
  category: string
}

interface ModelConfig {
  chatModel: string
  embeddingModel: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  topP: number
  rules?: Rule[]
  defaultModel?: string
}

const DEFAULT_CONFIG: ModelConfig = {
  chatModel: 'gpt-4-turbo',
  embeddingModel: 'text-embedding-3-small',
  systemPrompt: `Tu es un assistant intelligent qui aide à répondre aux questions en utilisant les mémoires personnelles et documents de l'utilisateur. 

Règles importantes:
- Réponds uniquement en français
- Base ta réponse sur le contexte fourni
- Cite tes sources en utilisant [1], [2], etc.
- Si l'information n'est pas dans le contexte, dis-le clairement
- Sois concis mais informatif
- Maintiens un ton professionnel et bienveillant`,
  temperature: 0.7,
  maxTokens: 1000,
  topP: 1
}

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Chercher la configuration de l'utilisateur
    const { data: config, error } = await supabase
      .from('user_configs')
      .select('config')
      .eq('user_id', user.id)
      .eq('config_type', 'model_settings')
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('Erreur lecture config', { category: 'Config', details: error.message })
      throw error
    }

    // Retourner la config utilisateur ou la config par défaut
    const userConfig = config?.config || DEFAULT_CONFIG
    
    logger.info('Configuration chargée', { 
      category: 'Config', 
      details: { 
        userId: user.id, 
        hasCustomConfig: !!config,
        chatModel: userConfig.chatModel 
      } 
    })

    return NextResponse.json(userConfig)
  } catch (error) {
    logger.error('Erreur GET config', { category: 'Config', details: error })
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

    const config: ModelConfig = await request.json()
    
    // Validation basique
    if (!config.chatModel || !config.embeddingModel || !config.systemPrompt) {
      return NextResponse.json({ error: 'Configuration incomplète' }, { status: 400 })
    }

    // Validation de la température selon le modèle
    if (config.chatModel.includes('gpt-4o') || config.chatModel.includes('gpt-5')) {
      // Les modèles GPT-4o et GPT-5 ne supportent que temperature=1
      if (config.temperature !== 1) {
        return NextResponse.json({ 
          error: `Le modèle ${config.chatModel} ne supporte que temperature=1. Utilisez un autre modèle pour personnaliser la température.` 
        }, { status: 400 })
      }
    } else {
      // Pour les autres modèles, validation normale
      if (config.temperature < 0 || config.temperature > 2) {
        return NextResponse.json({ error: 'Température doit être entre 0 et 2' }, { status: 400 })
      }
    }

    if (config.maxTokens < 1 || config.maxTokens > 10000) {
      return NextResponse.json({ error: 'MaxTokens doit être entre 1 et 10000' }, { status: 400 })
    }

    // Upsert de la configuration
    const { error } = await supabase
      .from('user_configs')
      .upsert({
        user_id: user.id,
        config_type: 'model_settings',
        config: config
      }, {
        onConflict: 'user_id,config_type'
      })

    if (error) {
      logger.error('Erreur sauvegarde config', { category: 'Config', details: error.message })
      throw error
    }

    logger.info('Configuration sauvegardée', { 
      category: 'Config', 
      details: { 
        userId: user.id, 
        chatModel: config.chatModel,
        embeddingModel: config.embeddingModel 
      } 
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Erreur POST config', { category: 'Config', details: error })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Export du type pour utilisation dans d'autres APIs
export type { ModelConfig }