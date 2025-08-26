import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * Vérifie si l'utilisateur existe dans la table users et le crée s'il n'existe pas
 * @param userId - L'ID de l'utilisateur authentifié
 * @param userEmail - L'email de l'utilisateur (optionnel)
 * @returns Promise<boolean> - true si l'utilisateur existe ou a été créé avec succès
 */
export async function ensureUserExists(userId: string, userEmail?: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (existingUser) {
      logger.info('Utilisateur existe déjà dans la table users', {
        category: 'Database',
        details: { userId }
      })
      return true
    }
    
    // Si l'utilisateur n'existe pas, le créer
    if (checkError?.code === 'PGRST116') { // No rows found
      logger.info('Création de l\'utilisateur dans la table users', {
        category: 'Database',
        details: { userId, userEmail }
      })
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userEmail || 'unknown@example.com',
          name: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      
      if (insertError) {
        logger.error('Erreur lors de la création de l\'utilisateur', {
          category: 'Database',
          details: { userId, error: insertError.message }
        })
        return false
      }
      
      logger.success('Utilisateur créé avec succès dans la table users', {
        category: 'Database',
        details: { userId }
      })
      return true
    }
    
    // Autre erreur lors de la vérification
    logger.error('Erreur lors de la vérification de l\'utilisateur', {
      category: 'Database',
      details: { userId, error: checkError?.message }
    })
    return false
    
  } catch (error: any) {
    logger.error('Erreur critique dans ensureUserExists', {
      category: 'Database',
      details: { userId, error: error.message }
    })
    return false
  }
}