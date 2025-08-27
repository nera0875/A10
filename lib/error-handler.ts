import { NextResponse } from 'next/server'
import { logger } from './logger'

export interface AppError extends Error {
  status?: number
  code?: string
  details?: any
}

export class ApiError extends Error implements AppError {
  status: number
  code: string
  details?: any

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function createErrorResponse(error: any, defaultMessage: string = 'Une erreur est survenue') {
  // Logger l'erreur
  logger.error('Erreur API', {
    category: 'Error',
    details: {
      message: error.message || defaultMessage,
      stack: error.stack,
      code: error.code,
      status: error.status
    }
  })

  // Déterminer le statut HTTP
  const status = error.status || error.statusCode || 500

  // Créer le message d'erreur approprié
  let message = defaultMessage
  if (error instanceof ApiError) {
    message = error.message
  } else if (error.message && status < 500) {
    // Pour les erreurs client (4xx), on peut afficher le message
    message = error.message
  }

  // Réponse standardisée
  return NextResponse.json(
    {
      error: message,
      code: error.code || 'UNKNOWN_ERROR',
      ...(process.env.NODE_ENV === 'development' && { details: error.details || error.stack })
    },
    { status }
  )
}

// Gestionnaire spécifique pour les erreurs OpenAI
export function handleOpenAIError(error: any): ApiError {
  if (error.status === 429) {
    return new ApiError(
      'Limite de taux dépassée. Veuillez réessayer dans quelques instants.',
      429,
      'RATE_LIMIT_EXCEEDED'
    )
  }
  
  if (error.status === 401) {
    return new ApiError(
      'Clé API OpenAI invalide ou manquante.',
      500,
      'INVALID_API_KEY'
    )
  }
  
  if (error.status === 404) {
    return new ApiError(
      `Modèle non trouvé: ${error.message}`,
      400,
      'MODEL_NOT_FOUND'
    )
  }
  
  if (error.code === 'context_length_exceeded') {
    return new ApiError(
      'Le contexte est trop long pour ce modèle. Essayez avec moins de contexte.',
      400,
      'CONTEXT_LENGTH_EXCEEDED'
    )
  }
  
  return new ApiError(
    `Erreur OpenAI: ${error.message}`,
    error.status || 500,
    'OPENAI_ERROR',
    error
  )
}

// Gestionnaire pour les erreurs Supabase
export function handleSupabaseError(error: any): ApiError {
  if (error.code === '23505') {
    return new ApiError(
      'Cette ressource existe déjà.',
      409,
      'DUPLICATE_RESOURCE'
    )
  }
  
  if (error.code === '23503') {
    return new ApiError(
      'Référence invalide.',
      400,
      'INVALID_REFERENCE'
    )
  }
  
  if (error.code === 'PGRST301') {
    return new ApiError(
      'Accès non autorisé à cette ressource.',
      403,
      'UNAUTHORIZED_ACCESS'
    )
  }
  
  return new ApiError(
    'Erreur de base de données.',
    500,
    'DATABASE_ERROR',
    error
  )
}