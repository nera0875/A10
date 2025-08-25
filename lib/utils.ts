import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function chunkText(text: string, maxTokens: number = 500): string[] {
  // Estimation simple : ~4 caractères par token
  const maxChars = maxTokens * 4
  const chunks: string[] = []
  
  const sentences = text.split(/[.!?]+\s+/)
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 0)
}
