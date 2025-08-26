import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import { calculateAndSaveUsage, interceptOpenAIUsage, forceUsageRecord } from '@/lib/usage-calculator'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    }

    // Test 1: Connexion Supabase
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      results.tests.push({
        name: 'Supabase Connection',
        status: 'success',
        data: {
          authenticated: !!user,
          userId: user?.id || null,
          authError: authError?.message || null
        }
      })

      if (user) {
        // Test 2: Vérifier les tables
        const [memoriesCount, chunksCount] = await Promise.all([
          supabase.from('memories').select('id', { count: 'exact', head: true }),
          supabase.from('chunks').select('id', { count: 'exact', head: true })
        ])

        results.tests.push({
          name: 'Database Tables',
          status: 'success',
          data: {
            memoriesCount: memoriesCount.count,
            chunksCount: chunksCount.count,
            memoriesError: memoriesCount.error?.message || null,
            chunksError: chunksCount.error?.message || null
          }
        })

        // Test 3: Tester les fonctions RPC
        const testEmbedding = new Array(1536).fill(0.1) // Embedding de test
        
        const [memoriesRpc, chunksRpc] = await Promise.all([
          supabase.rpc('search_memories', {
            query_embedding: testEmbedding,
            match_threshold: 0.1,
            match_count: 1,
            user_id: user.id
          }),
          supabase.rpc('search_chunks', {
            query_embedding: testEmbedding,
            match_threshold: 0.1,
            match_count: 1,
            user_id: user.id
          })
        ])

        results.tests.push({
          name: 'RPC Functions',
          status: 'success',
          data: {
            memoriesRpcResults: memoriesRpc.data?.length || 0,
            chunksRpcResults: chunksRpc.data?.length || 0,
            memoriesRpcError: memoriesRpc.error?.message || null,
            chunksRpcError: chunksRpc.error?.message || null
          }
        })

        // Test 4: Tester OpenAI
        try {
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: 'test query',
          })

          // Calcul automatique des coûts pour l'embedding de test
          if (embeddingResponse.usage) {
            await interceptOpenAIUsage(embeddingResponse, 'text-embedding-3-small', user.id, undefined)
          } else {
            // Estimation si pas d'usage retourné
            const estimatedTokens = Math.ceil('test query'.length / 4)
            await forceUsageRecord('text-embedding-3-small', estimatedTokens, 0, user.id, undefined)
          }

          results.tests.push({
            name: 'OpenAI Embeddings',
            status: 'success',
            data: {
              embeddingLength: embeddingResponse.data[0].embedding.length,
              model: 'text-embedding-3-small'
            }
          })
        } catch (openaiError: any) {
          results.tests.push({
            name: 'OpenAI Embeddings',
            status: 'error',
            error: openaiError.message
          })
        }

        // Test 5: Vérifier quelques données réelles
        const [sampleMemories, sampleChunks] = await Promise.all([
          supabase.from('memories').select('id, content, created_at').eq('user_id', user.id).limit(3),
          supabase.from('chunks').select('id, content, document_name').eq('user_id', user.id).limit(3)
        ])

        results.tests.push({
          name: 'Sample Data',
          status: 'success',
          data: {
            sampleMemories: sampleMemories.data?.map(m => ({
              id: m.id,
              contentPreview: m.content?.substring(0, 100) + '...',
              created_at: m.created_at
            })) || [],
            sampleChunks: sampleChunks.data?.map(c => ({
              id: c.id,
              contentPreview: c.content?.substring(0, 100) + '...',
              document_name: c.document_name
            })) || []
          }
        })
      }
    } catch (supabaseError: any) {
      results.tests.push({
        name: 'Supabase Connection',
        status: 'error',
        error: supabaseError.message
      })
    }

    logger.info('Debug API appelée', {
      category: 'Debug',
      details: {
        testsCount: results.tests.length,
        successfulTests: results.tests.filter((t: any) => t.status === 'success').length
      }
    })

    return NextResponse.json(results)
  } catch (error: any) {
    logger.error('Erreur dans l\'API debug', {
      category: 'Debug',
      details: {
        error: error.message,
        stack: error.stack
      }
    })

    return NextResponse.json({
      error: 'Erreur lors du debug',
      message: error.message
    }, { status: 500 })
  }
}