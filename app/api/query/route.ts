import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import { type ModelConfig } from '../config/route'
import { calculateAndSaveUsage, interceptOpenAIUsage, forceUsageRecord } from '@/lib/usage-calculator'
import { ensureUserExists } from '@/lib/ensure-user'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Configuration par défaut locale
const DEFAULT_CONFIG: ModelConfig = {
  chatModel: 'gpt-4o',
  embeddingModel: 'text-embedding-3-small',
  systemPrompt: 'Tu es un assistant IA personnel qui aide l\'utilisateur en utilisant ses mémoires et documents personnels. Réponds de manière naturelle et utile.',
  temperature: 0.7,
  topP: 1,
  maxTokens: 2000
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      logger.error('Tentative d\'accès non autorisé à l\'API query', { category: 'Auth' })
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { query, conversationId } = await request.json()
    
    if (!query?.trim()) {
      logger.warning('Requête vide reçue', { category: 'API', details: { userId: user.id } })
      return NextResponse.json({ error: 'Requête vide' }, { status: 400 })
    }

    // Détecter les questions sur les informations personnelles qui nécessitent TOUTES les mémoires
    const isPersonalInfoQuery = /(qu'est-ce que tu connais sur moi|que sais-tu de moi|quelles sont mes informations|mes dernières mémoires|mes mémoires|que connais-tu de moi|dis-moi ce que tu sais sur moi|quelles informations as-tu sur moi)/i.test(query.trim())
    
    // Détecter les salutations simples et autres requêtes qui ne nécessitent pas de recherche sémantique
    const isSimpleGreeting = /^(bonjour|salut|hello|hi|bonsoir|bonne nuit|coucou|hey)\s*[!.?]*$/i.test(query.trim())
    const isSimpleQuestion = /^(comment ça va|ça va|comment allez-vous|comment tu vas)\s*[!.?]*$/i.test(query.trim())
    const isGeneralQuestion = /^(qui es-tu|qu'est-ce que tu fais|que peux-tu faire|aide|help)\s*[!.?]*$/i.test(query.trim())
    
    const shouldSkipMemorySearch = (isSimpleGreeting || isSimpleQuestion || isGeneralQuestion) && !isPersonalInfoQuery

    // Charger la configuration utilisateur
    const { data: configData } = await supabase
      .from('user_configs')
      .select('config')
      .eq('user_id', user.id)
      .eq('config_type', 'model_settings')
      .single()

    let userConfig: ModelConfig = configData?.config || DEFAULT_CONFIG

    // Validation et correction du modèle de chat
    const validChatModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'gpt-5', 'gpt-5-turbo', 'gpt-5-2025-08-07'];
    if (!validChatModels.includes(userConfig.chatModel)) {
      logger.warning(`Modèle de chat invalide détecté: ${userConfig.chatModel}, utilisation de gpt-4o par défaut`, {
        category: 'Config',
        details: { userId: user.id, invalidModel: userConfig.chatModel }
      })
      userConfig = { ...userConfig, chatModel: 'gpt-4o' }
    }

    logger.info(`Nouvelle requête chat: "${query.substring(0, 50)}..."`, { 
      category: 'Chat', 
      details: { 
        userId: user.id, 
        queryLength: query.length,
        chatModel: userConfig.chatModel,
        embeddingModel: userConfig.embeddingModel
      } 
    })

    let allSources = []
    let sourcesForResponse = []

    // Gérer la conversation
    let currentConversationId = conversationId
    
    // Créer une nouvelle conversation si nécessaire
    if (!currentConversationId) {
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: query.substring(0, 50) + (query.length > 50 ? '...' : '')
        })
        .select('id')
        .single()
      
      if (conversationError) {
        logger.error('Erreur création conversation', { category: 'Database', details: conversationError })
        return NextResponse.json({ error: 'Erreur création conversation' }, { status: 500 })
      }
      
      currentConversationId = newConversation.id
      logger.info('Nouvelle conversation créée', { category: 'Database', details: { conversationId: currentConversationId } })
    }

    // Générer l'embedding et rechercher seulement si nécessaire
    let queryEmbedding: number[] | null = null
    if (!shouldSkipMemorySearch) {
      // Générer l'embedding de la requête
      logger.info('Génération embedding pour la requête', { 
        category: 'OpenAI', 
        details: { query: query.substring(0, 100), model: userConfig.embeddingModel } 
      })
      
      const embeddingResponse = await openai.embeddings.create({
        model: userConfig.embeddingModel,
        input: query.trim(),
      })

      queryEmbedding = embeddingResponse.data[0].embedding
      logger.success('Embedding généré avec succès', { 
        category: 'OpenAI', 
        details: { embeddingLength: queryEmbedding.length, model: userConfig.embeddingModel } 
      })

      // Définir les paramètres de recherche selon le type de question
      const searchThreshold = isPersonalInfoQuery ? 0.1 : 0.6
      const searchCount = isPersonalInfoQuery ? 20 : 5
      
      // Recherche hybride : mémoires + chunks
      logger.info('Recherche dans mémoires et documents', { 
        category: 'Database', 
        details: { 
          userId: user.id, 
          threshold: searchThreshold, 
          maxResults: searchCount,
          isPersonalInfoQuery,
          embeddingLength: queryEmbedding.length,
          embeddingPreview: queryEmbedding.slice(0, 5)
        } 
      })
      
      // Vérifier d'abord si les tables contiennent des données
      const [memoriesCount, chunksCount] = await Promise.all([
        supabase.from('memories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('chunks').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      ])

      logger.info('Vérification des données existantes', {
        category: 'Database',
        details: {
          totalMemories: memoriesCount.count,
          totalChunks: chunksCount.count,
          memoriesCountError: memoriesCount.error?.message,
          chunksCountError: chunksCount.error?.message
        }
      })
      
      const [memoriesResult, chunksResult] = await Promise.all([
        supabase.rpc('search_memories', {
          query_embedding: queryEmbedding,
          match_threshold: searchThreshold,
          match_count: searchCount,
          target_user_id: user.id
        }),
        supabase.rpc('search_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: searchThreshold,
          match_count: searchCount,
          target_user_id: user.id
        })
      ])

      const memories = memoriesResult.data || []
      const chunks = chunksResult.data || []

      logger.info(`Résultats de recherche: ${memories.length} mémoires, ${chunks.length} chunks`, { 
        category: 'Database',
        details: { 
          memoriesCount: memories.length, 
          chunksCount: chunks.length,
          memoriesError: memoriesResult.error?.message,
          chunksError: chunksResult.error?.message,
          memoriesErrorDetails: memoriesResult.error?.details,
          chunksErrorDetails: chunksResult.error?.details,
          totalDataAvailable: {
            memories: memoriesCount.count,
            chunks: chunksCount.count
          }
        } 
      })

      // Si aucun résultat mais des données existent, essayer avec un seuil plus bas
      if (memories.length === 0 && chunks.length === 0 && ((memoriesCount.count ?? 0) > 0 || (chunksCount.count ?? 0) > 0)) {
        if (isPersonalInfoQuery) {
          // Pour les questions personnelles, récupérer TOUTES les mémoires disponibles
          logger.warning('Question personnelle sans résultats, récupération de toutes les mémoires', {
            category: 'Database',
            details: { totalMemoriesAvailable: memoriesCount.count }
          })

          const [allMemoriesResult] = await Promise.all([
            supabase
              .from('memories')
              .select('id, content, created_at, 1 as similarity')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(20)
          ])

          if (allMemoriesResult.data) {
            memories.push(...allMemoriesResult.data)
            logger.info(`Récupération de toutes les mémoires: ${allMemoriesResult.data.length} mémoires`, {
              category: 'Database'
            })
          }
        } else {
          // Pour les autres questions, utiliser un seuil plus bas
          logger.warning('Aucun résultat avec seuil standard, tentative avec seuil plus bas', {
            category: 'Database',
            details: { newThreshold: 0.3 }
          })

          const [lowThresholdMemories, lowThresholdChunks] = await Promise.all([
            supabase.rpc('search_memories', {
              query_embedding: queryEmbedding,
              match_threshold: 0.3,
              match_count: 3,
              target_user_id: user.id
            }),
            supabase.rpc('search_chunks', {
              query_embedding: queryEmbedding,
              match_threshold: 0.3,
              match_count: 3,
              target_user_id: user.id
            })
          ])

          memories.push(...(lowThresholdMemories.data || []))
          chunks.push(...(lowThresholdChunks.data || []))

          logger.info(`Résultats avec seuil bas: ${lowThresholdMemories.data?.length || 0} mémoires, ${lowThresholdChunks.data?.length || 0} chunks`, {
            category: 'Database',
            details: {
              lowThresholdMemoriesError: lowThresholdMemories.error?.message,
              lowThresholdChunksError: lowThresholdChunks.error?.message
            }
          })
        }
      }

      // Recherche dans l'historique des conversations si on a un embedding
      let conversationHistory = []
      if (queryEmbedding) {
        const { data: historyResults } = await supabase.rpc('search_conversation_messages', {
          query_embedding: queryEmbedding,
          conversation_id_filter: null, // Rechercher dans toutes les conversations
          match_threshold: 0.7,
          match_count: 5
        })
        
        conversationHistory = historyResults || []
        logger.info(`Recherche sémantique dans l'historique: ${conversationHistory.length} messages pertinents`, { 
          category: 'Database', 
          details: { semanticHistoryCount: conversationHistory.length } 
        })
      }

      // Combiner et trier les résultats
      const maxResults = isPersonalInfoQuery ? 25 : 8
      allSources = [
        ...memories.map((m: any) => ({ ...m, type: 'memory' })),
        ...chunks.map((c: any) => ({ ...c, type: 'chunk' })),
        ...conversationHistory.map((h: any) => ({ ...h, type: 'conversation', content: h.content }))
      ].sort((a, b) => b.similarity - a.similarity).slice(0, maxResults)
      
      sourcesForResponse = allSources // Toutes les sources sont maintenant pertinentes pour l'affichage
    } else {
      logger.info('Requête simple détectée, pas de recherche sémantique', { 
        category: 'Chat', 
        details: { query: query.substring(0, 100), type: 'simple_greeting' } 
      })
    }

    // Préparer le contexte et le message
    let contextualMessage = query
    
    if (allSources.length > 0) {
      const contextParts = allSources.map((source) => {
        const content = source.type === 'memory' ? source.content : source.text
        return content
      })
      
      if (isPersonalInfoQuery) {
        contextualMessage = `Informations personnelles disponibles :
${contextParts.join('\n\n')}

Question de l'utilisateur : ${query}

SYNTHÉTISE TOUTES les informations personnelles disponibles ci-dessus. Présente un résumé complet et organisé de ce que tu sais sur l'utilisateur. Inclus TOUTES les informations pertinentes, pas seulement une partie. Ne mentionne jamais les sources ou références dans ta réponse.`
      } else {
        contextualMessage = `Contexte disponible :
${contextParts.join('\n\n')}

Question de l'utilisateur : ${query}

Réponds en utilisant le contexte fourni si pertinent. Ne mentionne jamais les sources ou références dans ta réponse.`
      }
    }

    logger.info('Message contextuel préparé', { 
      category: 'Chat', 
      details: { 
        sourcesCount: allSources.length, 
        messageLength: contextualMessage.length,
        hasContext: allSources.length > 0
      } 
    })

    logger.info('Génération de la réponse avec LLM', { 
      category: 'OpenAI', 
      details: { sourcesCount: sourcesForResponse.length, model: userConfig.chatModel } 
    })

    // Sauvegarder d'abord le message utilisateur pour qu'il soit inclus dans l'historique
    try {
      // Générer l'embedding pour le message utilisateur si pas déjà fait
      let userEmbedding = queryEmbedding
      if (!userEmbedding) {
        const userEmbeddingResponse = await openai.embeddings.create({
          model: userConfig.embeddingModel,
          input: query.trim(),
        })
        userEmbedding = userEmbeddingResponse.data[0].embedding
      }

      // Sauvegarder le message utilisateur
      await supabase.from('conversation_messages').insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: query,
        embedding: userEmbedding
      })

      logger.info('Message utilisateur sauvegardé', {
        category: 'Database',
        details: { conversationId: currentConversationId }
      })
    } catch (saveError: any) {
      logger.error('Erreur sauvegarde message utilisateur', {
        category: 'Database',
        details: { error: saveError.message, conversationId: currentConversationId }
      })
    }

    // Maintenant récupérer l'historique de la conversation (qui inclut le message utilisateur)
    const { data: conversationHistory } = await supabase.rpc('get_recent_conversation_messages', {
      conversation_id_param: currentConversationId,
      message_count: 10
    })
    
    const recentMessages = conversationHistory || []
    logger.info(`Historique de conversation récupéré: ${recentMessages.length} messages`, { 
      category: 'Database', 
      details: { conversationId: currentConversationId, messageCount: recentMessages.length } 
    })

    // Construire les messages pour OpenAI avec l'historique structuré
    const messages: any[] = [
      {
        role: 'system',
        content: userConfig.systemPrompt + '\n\nTu dois te souvenir de tout ce qui a été dit dans cette conversation et y faire référence si pertinent.'
      }
    ]

    // Ajouter l'historique des messages dans l'ordre chronologique
    if (recentMessages.length > 0) {
      // Trier par created_at pour s'assurer de l'ordre chronologique
      const sortedMessages = recentMessages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      // Inclure TOUS les messages de l'historique car le message utilisateur actuel n'y est pas encore
      for (const msg of sortedMessages) {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      }
    }

    // Ajouter le message utilisateur actuel
    messages.push({
      role: 'user',
      content: contextualMessage
    })

    // Générer la réponse avec le LLM en streaming
    const completionParams: any = {
      model: userConfig.chatModel,
      stream: true,
      messages: messages,
      stream_options: { include_usage: true }
    }

    // Configuration des paramètres selon le modèle
    if (userConfig.chatModel.includes('gpt-4o')) {
      // GPT-4o supporte temperature=1 par défaut
      completionParams.temperature = 1
      completionParams.max_tokens = userConfig.maxTokens
    } else if (userConfig.chatModel.includes('gpt-5')) {
      // GPT-5 utilise max_completion_tokens au lieu de max_tokens
      completionParams.temperature = 1
      completionParams.max_completion_tokens = userConfig.maxTokens
    } else {
      // Pour les autres modèles (gpt-4-turbo, gpt-4, gpt-3.5-turbo)
      completionParams.temperature = userConfig.temperature
      completionParams.top_p = userConfig.topP
      completionParams.max_tokens = userConfig.maxTokens
    }

    let completion
    let usageData: any = null
    try {
      completion = await openai.chat.completions.create(completionParams)
    } catch (openaiError: any) {
      logger.error('Erreur lors de l\'appel à OpenAI', {
        category: 'OpenAI',
        details: {
          model: userConfig.chatModel,
          error: openaiError.message,
          status: openaiError.status,
          code: openaiError.code
        }
      })
      
      // Retourner une erreur appropriée
      return NextResponse.json({ 
        error: `Erreur du modèle ${userConfig.chatModel}: ${openaiError.message}` 
      }, { status: 500 })
    }

    // Créer un stream de réponse
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Envoyer d'abord les métadonnées (sources + conversation ID)
          const metaData = JSON.stringify({
            type: 'metadata',
            sources: sourcesForResponse,
            conversationId: currentConversationId
          })
          controller.enqueue(encoder.encode(`data: ${metaData}\n\n`))

          // Puis streamer la réponse
          let fullAnswer = ''
          let chunkCount = 0
          
          for await (const chunk of completion as any) {
            chunkCount++
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullAnswer += content
              const data = JSON.stringify({
                type: 'content',
                content: fullAnswer // Envoyer le contenu complet accumulé
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
            
            // Capturer les données d'usage si disponibles
            if (chunk.usage) {
              usageData = chunk.usage
              logger.info('Données d\'usage capturées dans le chunk', {
                category: 'OpenAI',
                details: {
                  model: userConfig.chatModel,
                  promptTokens: chunk.usage.prompt_tokens,
                  completionTokens: chunk.usage.completion_tokens,
                  totalTokens: chunk.usage.total_tokens
                }
              })
            }
            
            // Vérifier si le streaming s'est terminé
            if (chunk.choices[0]?.finish_reason) {
              // Capturer les données d'usage du dernier chunk si pas encore fait
              if (!usageData && chunk.usage) {
                usageData = chunk.usage
                logger.info('Données d\'usage capturées dans le dernier chunk', {
                  category: 'OpenAI',
                  details: {
                    model: userConfig.chatModel,
                    promptTokens: chunk.usage.prompt_tokens,
                    completionTokens: chunk.usage.completion_tokens,
                    totalTokens: chunk.usage.total_tokens
                  }
                })
              }
              break
            }
          }

          // Vérifier si on a reçu une réponse valide
          if (fullAnswer.trim().length === 0) {
            logger.error('Réponse vide reçue du modèle', {
              category: 'OpenAI',
              details: { 
                model: userConfig.chatModel, 
                chunkCount,
                contextLength: contextualMessage.length
              }
            })
            
            // Envoyer une réponse d'erreur
            const errorData = JSON.stringify({
              type: 'content',
              content: 'Désolé, je n\'ai pas pu générer une réponse. Veuillez réessayer.'
            })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          }

          // Envoyer la fin
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()

          // Sauvegarder seulement la réponse de l'assistant (le message utilisateur a déjà été sauvegardé)
          try {
            // Générer l'embedding pour la réponse de l'assistant
            const assistantEmbeddingResponse = await openai.embeddings.create({
              model: userConfig.embeddingModel,
              input: fullAnswer.trim(),
            })
            const assistantEmbedding = assistantEmbeddingResponse.data[0].embedding

            // Sauvegarder la réponse de l'assistant
            await supabase.from('conversation_messages').insert({
              conversation_id: currentConversationId,
              role: 'assistant',
              content: fullAnswer,
              embedding: assistantEmbedding
            })

            logger.success('Réponse de l\'assistant sauvegardée dans l\'historique', {
              category: 'Database',
              details: { conversationId: currentConversationId }
            })
          } catch (saveError: any) {
            logger.error('Erreur sauvegarde réponse assistant', {
              category: 'Database',
              details: { error: saveError.message, conversationId: currentConversationId }
            })
          }

          // Si pas de données d'usage du streaming, faire un appel non-streaming pour les récupérer
          if (!usageData && fullAnswer.trim().length > 0) {
            try {
              logger.info('Récupération des données d\'usage via appel non-streaming', {
                category: 'OpenAI',
                details: { model: userConfig.chatModel }
              })
              
              const usageCompletion = await openai.chat.completions.create({
                model: userConfig.chatModel,
                messages: [{ role: 'user', content: 'test' }],
                max_completion_tokens: 1
              })
              
              if (usageCompletion.usage) {
                // Estimer les tokens basés sur la longueur de la réponse
                const estimatedOutputTokens = Math.ceil(fullAnswer.length / 4) // Approximation: 4 chars = 1 token
                const estimatedInputTokens = Math.ceil(contextualMessage.length / 4)
                
                usageData = {
                  prompt_tokens: estimatedInputTokens,
                  completion_tokens: estimatedOutputTokens,
                  total_tokens: estimatedInputTokens + estimatedOutputTokens
                }
                
                logger.info('Données d\'usage estimées', {
                  category: 'OpenAI',
                  details: {
                    model: userConfig.chatModel,
                    estimatedInputTokens,
                    estimatedOutputTokens,
                    totalTokens: usageData.total_tokens
                  }
                })
              }
            } catch (usageError: any) {
              logger.warning('Impossible de récupérer les données d\'usage', {
                category: 'OpenAI',
                details: { error: usageError.message }
              })
            }
          }
          
          // 🚀 SYSTÈME AUTOMATIQUE DE CALCUL DES COÛTS AVEC CACHE RAG
          // Calcul et sauvegarde OBLIGATOIRE des coûts pour chaque appel LLM
          
          // 🎯 DÉTECTION INTELLIGENTE DU CACHE HIT RAG
          // Un cache hit est détecté si :
          // 1. Des sources pertinentes ont été trouvées (similarité > 0.7)
          // 2. Au moins 2 sources avec bonne similarité
          // 3. Le contexte représente plus de 20% du message final
          const hasHighQualitySources = allSources.some(source => source.similarity > 0.7)
          const hasMultipleSources = allSources.length >= 2
          const contextRatio = allSources.length > 0 ? 
            (allSources.reduce((sum, source) => sum + (source.content || source.text || '').length, 0) / contextualMessage.length) : 0
          
          const cacheHit = hasHighQualitySources && hasMultipleSources && contextRatio > 0.2
          
          logger.info('🎯 Analyse du cache RAG', {
            category: 'RAGCache',
            details: {
              sourcesCount: allSources.length,
              hasHighQualitySources,
              hasMultipleSources,
              contextRatio: Math.round(contextRatio * 100) / 100,
              cacheHit,
              topSimilarity: allSources.length > 0 ? Math.max(...allSources.map(s => s.similarity)) : 0
            }
          })
          
          // S'assurer que l'utilisateur existe dans la table users avant de sauvegarder les coûts
          if (user) {
            const userExists = await ensureUserExists(user.id, user.email)
            
            if (!userExists) {
              logger.error('Impossible de créer ou vérifier l\'utilisateur', {
                category: 'Database',
                details: { userId: user.id }
              })
            } else {
              // Procéder à la sauvegarde des coûts seulement si l'utilisateur existe
              if (usageData) {
                // Utiliser l'intercepteur automatique avec les vraies données OpenAI
                interceptOpenAIUsage(
                  { usage: usageData },
                  userConfig.chatModel,
                  currentConversationId,
                  user.id,
                  '/api/query',
                  cacheHit // 🎯 Cache hit intelligent basé sur la qualité RAG
                )
              } else {
                // FORCER l'enregistrement même sans données OpenAI (estimation)
                const estimatedInputTokens = Math.ceil(contextualMessage.length / 4)
                const estimatedOutputTokens = Math.ceil(fullAnswer.length / 4)
                
                logger.warning('⚠️ Données OpenAI manquantes - Calcul forcé avec estimation', {
                  category: 'UsageCalculator',
                  details: {
                    model: userConfig.chatModel,
                    estimatedInput: estimatedInputTokens,
                    estimatedOutput: estimatedOutputTokens,
                    conversationId: currentConversationId,
                    cacheHit
                  }
                })
                
                // Enregistrement FORCÉ avec estimation
                forceUsageRecord(
                  userConfig.chatModel,
                  estimatedInputTokens,
                  estimatedOutputTokens,
                  currentConversationId,
                  user.id,
                  '/api/query',
                  cacheHit // 🎯 Cache hit intelligent
                )
              }
            }
          }

          // Logger la réponse complète
          logger.success('Réponse générée avec succès', { 
            category: 'OpenAI', 
            details: { 
              answerLength: fullAnswer.length,
              chunkCount,
              model: userConfig.chatModel,
              conversationId: currentConversationId,
              usage: usageData
            } 
          })

        } catch (error) {
          logger.error('Erreur lors du streaming', { category: 'OpenAI', details: error })
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    const errorMessage = 'Erreur requête RAG: ' + (error.message || 'Erreur inconnue')
    logger.error(errorMessage, { 
      category: 'API', 
      details: { 
        error: error.message, 
        stack: error.stack,
        status: error.status 
      } 
    })
    
    console.error('Erreur requête RAG:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
