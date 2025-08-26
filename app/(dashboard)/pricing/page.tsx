'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Database, DollarSign, Zap, TrendingUp, Calculator, TrendingDown, AlertCircle } from 'lucide-react'
import { useCostNotifications } from '@/hooks/use-cost-notifications'

interface UsageStats {
  totalMessages: number
  totalCost: number
  cacheHits: number
  cacheSavings: number
  apiKeyUsage: number
  sessionCost: number
  currentModel: string
}

export default function PricingPage() {
  // Activer les notifications de coût
  useCostNotifications()
  
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalMessages: 0,
    totalCost: 0,
    cacheHits: 0,
    cacheSavings: 0,
    sessionCost: 0,
    apiKeyUsage: 0,
    currentModel: 'gpt-4o-mini'
  })

  const [simulatorInputs, setSimulatorInputs] = useState({
    messagesPerDay: 50,
    tokensPerMessage: 1000,
    days: 30
  })

  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [recentCostUpdate, setRecentCostUpdate] = useState(false)

  useEffect(() => {
    setIsClient(true)
    fetchUsageStats()
    
    // 🔄 RAFRAÎCHISSEMENT TEMPS RÉEL - Toutes les 10 secondes
    const interval = setInterval(fetchUsageStats, 10000)
    
    // 🎯 ÉCOUTER LES ÉVÉNEMENTS DE NOUVEAU MESSAGE
    const handleNewMessage = () => {
      setTimeout(fetchUsageStats, 500) // Délai réduit pour plus de réactivité
    }
    
    // 💰 ÉCOUTER LES ÉVÉNEMENTS DE CALCUL DE COÛT
    const handleCostCalculated = (event: CustomEvent) => {
      console.log('💰 Nouveau coût calculé:', event.detail)
      setTimeout(fetchUsageStats, 300) // Rafraîchir immédiatement après calcul
    }
    
    window.addEventListener('newMessageSent', handleNewMessage)
    window.addEventListener('costCalculated', handleCostCalculated as EventListener)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('newMessageSent', handleNewMessage)
      window.removeEventListener('costCalculated', handleCostCalculated as EventListener)
    }
  }, [])

  const fetchUsageStats = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/usage')
      if (response.ok) {
        const data = await response.json()
        const previousCost = usageStats.totalCost
        setUsageStats(data)
        setLastUpdate(new Date())
        
        // 🎉 NOTIFICATION DE NOUVEAU COÛT
        if (data.totalCost > previousCost && previousCost > 0) {
          setRecentCostUpdate(true)
          setTimeout(() => setRecentCostUpdate(false), 3000) // Animation pendant 3s
          
          // Émettre un événement personnalisé pour d'autres composants
          window.dispatchEvent(new CustomEvent('costUpdated', {
            detail: {
              previousCost,
              newCost: data.totalCost,
              difference: data.totalCost - previousCost
            }
          }))
        }
      } else {
        console.error('Failed to fetch usage stats')
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCost = (cost: number) => {
    if (cost >= 0.01) {
      return `${cost.toFixed(2)}€`
    } else if (cost >= 0.001) {
      return `${cost.toFixed(3)}€`
    } else if (cost >= 0.0001) {
      return `${cost.toFixed(4)}€`
    } else if (cost > 0) {
      return `${cost.toFixed(5)}€`
    } else {
      return '0€'
    }
  }

  const calculateSimulation = () => {
    const models = [
      { id: 'gpt-4o', name: 'GPT-4o', category: 'premium', inputPrice: 5, outputPrice: 15 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'standard', inputPrice: 0.15, outputPrice: 0.6 },
      { id: 'gpt-5', name: 'GPT-5', category: 'premium', inputPrice: 10, outputPrice: 30 },
      { id: 'gpt-5-turbo', name: 'GPT-5 Turbo', category: 'premium', inputPrice: 7, outputPrice: 21 }
    ]

    return models.map(model => {
      const dailyCost = (simulatorInputs.messagesPerDay * simulatorInputs.tokensPerMessage * (model.inputPrice + model.outputPrice)) / 1000000
      const totalCost = dailyCost * simulatorInputs.days
      return {
        ...model,
        dailyCost,
        totalCost
      }
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'premium': return 'border-orange-200 bg-orange-50'
      case 'standard': return 'border-gray-200 bg-gray-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Usage & Pricing</h1>
            <p className="text-gray-600 mt-1">Monitor your AI usage and costs</p>
          </div>
          
          {/* 🔄 INDICATEUR TEMPS RÉEL */}
          <div className="flex items-center space-x-3">
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                <span className="text-sm">Updating...</span>
              </div>
            )}
            
            {lastUpdate && !isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className={`h-2 w-2 rounded-full ${recentCostUpdate ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cache Items</p>
                <p className="text-2xl font-semibold text-gray-900">{usageStats.cacheHits}</p>
              </div>
              <Database className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border bg-white transition-all duration-300 ${
          recentCostUpdate ? 'border-green-300 bg-green-50 shadow-lg' : 'border-gray-200'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className={`text-2xl font-semibold transition-colors duration-300 ${
                  recentCostUpdate ? 'text-green-700' : 'text-gray-900'
                }`}>
                  {formatCost(usageStats.totalCost)}
                  {recentCostUpdate && (
                    <span className="ml-2 text-sm text-green-600 animate-bounce">📈</span>
                  )}
                </p>
              </div>
              <DollarSign className={`h-5 w-5 transition-colors duration-300 ${
                recentCostUpdate ? 'text-green-500' : 'text-gray-400'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">API Usage</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCost(usageStats.apiKeyUsage)}</p>
              </div>
              <Zap className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Savings</p>
                <p className="text-2xl font-semibold text-green-600">{formatCost(usageStats.cacheSavings)}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Details */}
      <Card className="border border-gray-200 bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Messages</span>
              <span className="font-medium text-gray-900">{isClient ? usageStats.totalMessages.toLocaleString() : usageStats.totalMessages}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Cache Hit Rate</span>
              <span className="font-medium text-gray-900">
                {Math.round((usageStats.cacheHits / Math.max(usageStats.totalMessages, 1)) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Current Model</span>
              <span className="font-medium text-gray-900">{usageStats.currentModel}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Session Cost</span>
              <span className="font-medium text-gray-900">{formatCost(usageStats.sessionCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulateur de coûts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-orange-600" />
            Simulateur de Coûts
          </CardTitle>
          <CardDescription>
            Planifiez et comparez vos dépenses futures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paramètres de simulation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <label className="text-sm font-medium">Messages par jour</label>
              <Input 
                type="number" 
                value={simulatorInputs.messagesPerDay}
                onChange={(e) => setSimulatorInputs({...simulatorInputs, messagesPerDay: parseInt(e.target.value) || 0})}
                className="mt-1" 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tokens par message</label>
              <Input 
                type="number" 
                value={simulatorInputs.tokensPerMessage}
                onChange={(e) => setSimulatorInputs({...simulatorInputs, tokensPerMessage: parseInt(e.target.value) || 0})}
                className="mt-1" 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Période (jours)</label>
              <Input 
                type="number" 
                value={simulatorInputs.days}
                onChange={(e) => setSimulatorInputs({...simulatorInputs, days: parseInt(e.target.value) || 0})}
                className="mt-1" 
              />
            </div>
          </div>

          {/* Résultats de simulation */}
          <div className="space-y-3">
            <h4 className="font-semibold">Comparaison des Modèles</h4>
            {calculateSimulation()
              .sort((a, b) => a.totalCost - b.totalCost)
              .map((result) => (
              <div 
                key={result.id}
                className={`p-4 border rounded-lg ${getCategoryColor(result.category)} ${
                  result.id === usageStats.currentModel ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{result.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{result.category}</div>
                    </div>
                    {result.id === usageStats.currentModel && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Actuel
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatCost(result.totalCost)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCost(result.dailyCost)}/jour
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Input: </span>
                    <span className="font-mono">${result.inputPrice}/M tokens</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Output: </span>
                    <span className="font-mono">${result.outputPrice}/M tokens</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Économies Cache RAG */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="h-5 w-5 mr-2 text-green-600" />
            Économies Intelligentes
          </CardTitle>
          <CardDescription>
            Votre système de cache RAG optimise automatiquement les coûts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">
                💰 Optimisations Automatiques
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700 dark:text-green-300">
                <div className="space-y-2">
                  <div>• <strong>Cache sémantique:</strong> Questions similaires réutilisent les résultats</div>
                  <div>• <strong>Embeddings en cache:</strong> Évite de recalculer les vecteurs</div>
                </div>
                <div className="space-y-2">
                  <div>• <strong>Contexte intelligent:</strong> Optimise la taille des prompts</div>
                  <div>• <strong>Réponses partielles:</strong> Réutilise des fragments</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border border-green-200 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((usageStats.cacheHits / Math.max(usageStats.totalMessages, 1)) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Taux de cache</div>
              </div>
              <div className="text-center p-4 border border-green-200 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCost(usageStats.cacheSavings)}
                </div>
                <div className="text-sm text-muted-foreground">Économies Total</div>
              </div>
              <div className="text-center p-4 border border-green-200 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {usageStats.totalMessages > 0 ? formatCost(usageStats.cacheSavings / usageStats.totalMessages) : '$0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Économie/Message</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conseils d'optimisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
            Conseils d'Optimisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <div className="font-medium">Choisissez le bon modèle</div>
                <div className="text-sm text-muted-foreground">GPT-4o Mini pour la plupart des tâches, GPT-4o pour les cas complexes</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-gray-500 mt-2"></div>
              <div>
                <div className="font-medium">Optimisez vos prompts</div>
                <div className="text-sm text-muted-foreground">Des instructions claires réduisent le nombre de tokens nécessaires</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <div className="font-medium">Utilisez le cache</div>
                <div className="text-sm text-muted-foreground">Votre taux de cache de {Math.round((usageStats.cacheHits / Math.max(usageStats.totalMessages, 1)) * 100)}% vous fait déj&agrave; économiser !</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
