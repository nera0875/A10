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
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    type: 'memory' | 'chunk'
    id: string
    content: string
    similarity: number
  }>
}

export interface SearchResult {
  id: string
  content: string
  similarity: number
  type: 'memory' | 'chunk'
  metadata?: any
}
