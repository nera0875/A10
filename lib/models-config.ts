/**
 * Configuration centralisée des modèles LLM
 */

export interface ModelCapabilities {
  supportsTemperature: boolean
  fixedTemperature?: number
  maxTokensKey: 'max_tokens' | 'max_completion_tokens'
  defaultMaxTokens: number
  maxAllowedTokens: number
}

export const MODELS_CONFIG: Record<string, ModelCapabilities> = {
  // GPT-5 models
  'gpt-5': {
    supportsTemperature: false,
    fixedTemperature: 1,
    maxTokensKey: 'max_completion_tokens',
    defaultMaxTokens: 2000,
    maxAllowedTokens: 400000
  },
  'gpt-5-turbo': {
    supportsTemperature: false,
    fixedTemperature: 1,
    maxTokensKey: 'max_completion_tokens',
    defaultMaxTokens: 2000,
    maxAllowedTokens: 400000
  },
  'gpt-5-2025-08-07': {
    supportsTemperature: false,
    fixedTemperature: 1,
    maxTokensKey: 'max_completion_tokens',
    defaultMaxTokens: 2000,
    maxAllowedTokens: 400000
  },
  
  // GPT-4o models
  'gpt-4o': {
    supportsTemperature: false,
    fixedTemperature: 1,
    maxTokensKey: 'max_tokens',
    defaultMaxTokens: 2000,
    maxAllowedTokens: 128000
  },
  'gpt-4o-mini': {
    supportsTemperature: false,
    fixedTemperature: 1,
    maxTokensKey: 'max_tokens',
    defaultMaxTokens: 2000,
    maxAllowedTokens: 128000
  },
  
  // GPT-4 models
  'gpt-4-turbo': {
    supportsTemperature: true,
    maxTokensKey: 'max_tokens',
    defaultMaxTokens: 2000,
    maxAllowedTokens: 128000
  },
  'gpt-4': {
    supportsTemperature: true,
    maxTokensKey: 'max_tokens',
    defaultMaxTokens: 2000,
    maxAllowedTokens: 8192
  },
  
  // GPT-3.5 models
  'gpt-3.5-turbo': {
    supportsTemperature: true,
    maxTokensKey: 'max_tokens',
    defaultMaxTokens: 2000,
    maxAllowedTokens: 16385
  }
}

export function getModelConfig(modelName: string): ModelCapabilities | null {
  // Chercher d'abord une correspondance exacte
  if (MODELS_CONFIG[modelName]) {
    return MODELS_CONFIG[modelName]
  }
  
  // Chercher par préfixe pour gérer les variantes
  for (const [key, config] of Object.entries(MODELS_CONFIG)) {
    if (modelName.startsWith(key)) {
      return config
    }
  }
  
  return null
}

export function requiresFixedTemperature(modelName: string): boolean {
  const config = getModelConfig(modelName)
  return config ? !config.supportsTemperature : false
}