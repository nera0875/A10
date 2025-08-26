import { createClient } from '@supabase/supabase-js';

// Tarifs par modèle (prix par 1000 tokens)
const MODEL_PRICING = {
  'gpt-4o': {
    input: 0.0025,   // $2.50 per 1M tokens
    output: 0.01     // $10.00 per 1M tokens
  },
  'gpt-4o-mini': {
    input: 0.00015,  // $0.15 per 1M tokens
    output: 0.0006   // $0.60 per 1M tokens
  },
  'gpt-5-2025-08-07': {
    input: 0.005,    // $5.00 per 1M tokens (estimation)
    output: 0.02     // $20.00 per 1M tokens (estimation)
  },
  'gpt-4-turbo': {
    input: 0.001,    // $1.00 per 1M tokens
    output: 0.003    // $3.00 per 1M tokens
  },
  'gpt-3.5-turbo': {
    input: 0.0005,   // $0.50 per 1M tokens
    output: 0.0015   // $1.50 per 1M tokens
  }
};

interface UsageData {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheHit?: boolean;
  conversationId?: string;
  userId?: string;
  endpoint?: string;
}

interface CalculatedCost {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  cacheSavings: number;
  finalCost: number;
}

/**
 * Calcule les coûts basés sur les tokens et le modèle utilisé
 */
export function calculateCosts(data: UsageData): CalculatedCost {
  const pricing = MODEL_PRICING[data.model as keyof typeof MODEL_PRICING];
  
  if (!pricing) {
    console.warn(`Tarification non trouvée pour le modèle: ${data.model}`);
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      cacheSavings: 0,
      finalCost: 0
    };
  }

  // Calcul des coûts de base (prix par 1000 tokens)
  const inputCost = (data.inputTokens / 1000) * pricing.input;
  const outputCost = (data.outputTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;

  // Calcul des économies de cache RAG (50% de réduction si cache hit)
  const cacheSavings = data.cacheHit ? totalCost * 0.5 : 0;
  const finalCost = totalCost - cacheSavings;

  return {
    inputCost: Math.round(inputCost * 100000) / 100000, // 5 décimales
    outputCost: Math.round(outputCost * 100000) / 100000,
    totalCost: Math.round(totalCost * 100000) / 100000,
    cacheSavings: Math.round(cacheSavings * 100000) / 100000,
    finalCost: Math.round(finalCost * 100000) / 100000
  };
}

/**
 * Sauvegarde automatiquement les statistiques d'usage dans la base de données
 */
export async function calculateAndSaveUsage(data: UsageData): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calcul des coûts
    const costs = calculateCosts(data);

    // Préparation des données pour la base
    const usageRecord = {
      user_id: data.userId || 'anonymous',
      conversation_id: data.conversationId || null,
      model_used: data.model,
      tokens_input: data.inputTokens,
      tokens_output: data.outputTokens,
      cost_input: costs.inputCost,
      cost_output: costs.outputCost,
      total_cost: costs.finalCost,
      cache_hit: data.cacheHit || false,
      cache_savings: costs.cacheSavings,
      endpoint: data.endpoint || 'unknown',
      created_at: new Date().toISOString()
    };

    // Insertion forcée dans la base de données
    const { error } = await supabase
      .from('usage_stats')
      .insert(usageRecord);

    if (error) {
      console.error('❌ Erreur lors de la sauvegarde des coûts:', error);
      throw error;
    }

    // Log de confirmation
    console.log('✅ Coûts calculés et sauvegardés:', {
      model: data.model,
      tokens: `${data.inputTokens}→${data.outputTokens}`,
      cost: `$${costs.finalCost}`,
      cache: data.cacheHit ? '🎯 HIT' : '❌ MISS',
      savings: data.cacheHit ? `$${costs.cacheSavings}` : '$0'
    });

    // Émettre une notification de coût
     if (typeof window !== 'undefined') {
       try {
         const { notifyCostCalculated } = await import('@/hooks/use-cost-notifications')
         notifyCostCalculated({
           model: data.model,
           totalCost: costs.finalCost,
           inputCost: costs.inputCost,
           outputCost: costs.outputCost,
           tokensInput: data.inputTokens,
           tokensOutput: data.outputTokens,
           cacheHit: data.cacheHit
         })
       } catch (error) {
         console.warn('Erreur lors de la notification de coût:', error)
       }
     }

    // Notification optionnelle (peut être étendue)
    if (typeof window !== 'undefined' && window.postMessage) {
      window.postMessage({
        type: 'USAGE_RECORDED',
        data: { ...costs, model: data.model }
      }, '*');
    }

  } catch (error) {
    console.error('❌ Erreur critique dans calculateAndSaveUsage:', error);
    // Ne pas faire échouer l'appel principal, mais logger l'erreur
  }
}

/**
 * Intercepteur automatique pour les réponses OpenAI
 */
export async function interceptOpenAIUsage(
  response: any,
  model: string,
  userId?: string,
  conversationId?: string,
  endpoint?: string,
  cacheHit?: boolean
): Promise<void> {
  try {
    // Extraction des données d'usage depuis la réponse OpenAI
    const usage = response?.usage;
    
    if (usage && usage.prompt_tokens && usage.completion_tokens) {
      // Calcul et sauvegarde automatique
      await calculateAndSaveUsage({
        model,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cacheHit,
        conversationId,
        userId,
        endpoint
      });
    } else {
      console.warn('⚠️ Données d\'usage manquantes dans la réponse OpenAI:', { model, endpoint });
    }
  } catch (error) {
    console.error('❌ Erreur dans interceptOpenAIUsage:', error);
  }
}

/**
 * Fonction pour forcer l'enregistrement même sans données d'usage OpenAI
 */
export async function forceUsageRecord(
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  userId?: string,
  conversationId?: string,
  endpoint?: string,
  cacheHit?: boolean
): Promise<void> {
  await calculateAndSaveUsage({
    model,
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
    cacheHit,
    conversationId,
    userId,
    endpoint
  });
  
  // Calculate costs for logging
  const calculatedCost = calculateCosts({
    model,
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
    cacheHit,
    conversationId,
    userId,
    endpoint
  });
  
  console.log('💰 Usage forcé et sauvegardé:', {
    model,
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
    totalCost: calculatedCost.totalCost,
    cacheHit,
    endpoint
  })
  
  // Émettre une notification de coût
   if (typeof window !== 'undefined') {
     try {
       const { notifyCostCalculated } = await import('@/hooks/use-cost-notifications')
       notifyCostCalculated({
         model,
         totalCost: calculatedCost.totalCost,
         inputCost: calculatedCost.inputCost,
         outputCost: calculatedCost.outputCost,
         tokensInput: estimatedInputTokens,
         tokensOutput: estimatedOutputTokens,
         cacheHit
       })
     } catch (error) {
       console.warn('Erreur lors de la notification de coût:', error)
     }
   }
}