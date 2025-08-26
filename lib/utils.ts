import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function chunkText(text: string, maxTokens: number = 400): string[] {
  // Estimation approximative : 1 token ≈ 4 caractères
  const maxChars = maxTokens * 4
  const chunks: string[] = []
  
  // Diviser par paragraphes d'abord
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0)
  
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    // Si le paragraphe seul dépasse la limite, le diviser par phrases
    if (paragraph.length > maxChars) {
      // Sauvegarder le chunk actuel s'il existe
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      
      // Diviser le long paragraphe par phrases
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0)
      
      for (const sentence of sentences) {
        const sentenceWithPunct = sentence.trim() + '.'
        
        if (currentChunk.length + sentenceWithPunct.length > maxChars) {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim())
          }
          currentChunk = sentenceWithPunct
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunct
        }
      }
    } else {
      // Vérifier si ajouter ce paragraphe dépasserait la limite
      if (currentChunk.length + paragraph.length + 2 > maxChars) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = paragraph
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }
  }
  
  // Ajouter le dernier chunk s'il existe
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.length > 0 ? chunks : [text]
}
