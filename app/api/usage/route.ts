import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UsageStats {
  totalMessages: number
  totalCost: number
  cacheHits: number
  cacheSavings: number
  apiKeyUsage: number
  sessionCost: number
  currentModel: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Récupérer les statistiques d'usage depuis la base de données
    const { data: usageData, error: usageError } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('user_id', user.id)
    
    if (usageError) {
      console.error('Error fetching usage data:', usageError)
      return NextResponse.json(
        { error: 'Failed to fetch usage data' },
        { status: 500 }
      )
    }

    // Calculer les statistiques agrégées
    const totalMessages = usageData?.length || 0
    const totalCost = usageData?.reduce((sum, record) => sum + parseFloat(record.total_cost || 0), 0) || 0
    const cacheHits = usageData?.filter(record => record.cache_hit).length || 0
    
    // Calculer les économies de cache depuis la base de données
    const cacheSavings = usageData?.reduce((sum, record) => sum + parseFloat(record.cache_savings || 0), 0) || 0
    
    // Trouver le modèle le plus utilisé
    const modelCounts = usageData?.reduce((acc, record) => {
      acc[record.model_used] = (acc[record.model_used] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    const currentModel = Object.keys(modelCounts).reduce((a, b) => 
      modelCounts[a] > modelCounts[b] ? a : b, 'gpt-4o-mini'
    )
    
    // Calculer le coût de la session actuelle (dernières 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const sessionData = usageData?.filter(record => 
      new Date(record.created_at) > new Date(twentyFourHoursAgo)
    ) || []
    
    const sessionCost = sessionData.reduce((sum, record) => 
      sum + parseFloat(record.total_cost || 0), 0
    )
    
    const usageStats: UsageStats = {
      totalMessages,
      totalCost,
      cacheHits,
      cacheSavings,
      apiKeyUsage: totalCost, // Même valeur que totalCost pour l'API usage
      sessionCost,
      currentModel
    }
    
    return NextResponse.json(usageStats)
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    )
  }
}