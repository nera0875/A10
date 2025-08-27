export interface Memory {
  id: string
  user_id: string
  content: string
  embedding?: number[]
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  title: string
  content: string
  file_type: string
  file_size: number
  created_at: string
}

export interface Chunk {
  id: string
  document_id: string
  content: string
  tokens: number
  embedding?: number[]
  tsvector?: string
  chunk_index: number
  created_at: string
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    type: 'memory' | 'chunk' | 'conversation'
    id: string
    content: string
    similarity: number
  }>
  pricing?: {
    inputTokens: number
    outputTokens: number
    cost: number
    cacheHit: boolean
    cacheSavings?: number
    model: string
  }
}

export interface SearchResult {
  id: string
  content: string
  similarity: number
  type: 'memory' | 'chunk' | 'conversation'
  metadata?: any
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  embedding?: number[]
  embedding_large?: number[]
  embedding_model?: string
  created_at: string
}

export interface ModelConfig {
  chatModel: string
  embeddingModel: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  topP: number
  rules?: any[]
  defaultModel?: string
}

export interface ApiError {
  error: string
  details?: any
  status?: number
}
