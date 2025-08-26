'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, Save, RotateCcw, Zap, Settings, Info, Plus, Trash2, Edit, ChevronUp, ChevronDown, Check, X, ChevronRight, AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Modèles disponibles avec informations de prix
interface ModelInfo {
  id: string
  name: string
  description: string
  category: 'gpt5' | 'gpt4o'
  maxTokens: number
  pricing: {
    input: number  // Prix par 1000 tokens d'input
    output: number // Prix par 1000 tokens d'output
    currency: string
  }
  available: boolean
}

const AVAILABLE_MODELS: ModelInfo[] = [
  // GPT-5 - Nouvelle génération
  {
    id: 'gpt-5',
    name: 'GPT-5 Standard',
    description: 'Le modèle GPT-5 standard avec performances optimales',
    category: 'gpt5',
    maxTokens: 400000,
    pricing: { input: 1.0, output: 8.0, currency: 'USD' },
    available: true
  },
  {
    id: 'gpt-5-turbo',
    name: 'GPT-5 Turbo',
    description: 'Version accélérée de GPT-5 pour des réponses plus rapides',
    category: 'gpt5',
    maxTokens: 400000,
    pricing: { input: 1.5, output: 12.0, currency: 'USD' },
    available: true
  },
  {
    id: 'gpt-5-2025-08-07',
    name: 'GPT-5',
    description: 'Le modèle le plus avancé avec fenêtre de contexte 400K tokens',
    category: 'gpt5',
    maxTokens: 400000,
    pricing: { input: 1.25, output: 10.0, currency: 'USD' },
    available: true
  },
  {
    id: 'gpt-5-mini-2025-08-07',
    name: 'GPT-5 Mini',
    description: 'Version optimisée et économique de GPT-5',
    category: 'gpt5',
    maxTokens: 400000,
    pricing: { input: 0.25, output: 2.0, currency: 'USD' },
    available: true
  },
  {
    id: 'gpt-5-nano-2025-08-07',
    name: 'GPT-5 Nano',
    description: 'Version ultra-rapide et ultra-économique de GPT-5',
    category: 'gpt5',
    maxTokens: 400000,
    pricing: { input: 0.05, output: 0.40, currency: 'USD' },
    available: true
  },
  
  // GPT-4o - Modèles fiables
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Le modèle multimodal le plus avancé actuellement',
    category: 'gpt4o',
    maxTokens: 128000,
    pricing: { input: 5.0, output: 15.0, currency: 'USD' },
    available: true
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Version rapide et économique de GPT-4o',
    category: 'gpt4o',
    maxTokens: 128000,
    pricing: { input: 0.15, output: 0.60, currency: 'USD' },
    available: true
  }
]

interface Rule {
  id: string
  name: string
  emoji: string
  content: string
  category: string
}

const DEFAULT_RULES: Rule[] = [
  {
    id: '1',
    name: 'Personnalité de base',
    emoji: '🤖',
    content: 'Tu es un assistant intelligent qui aide à répondre aux questions en utilisant les mémoires personnelles et documents de l&#39;utilisateur.',
    category: 'Identité'
  },
  {
    id: '2', 
    name: 'Langue et Communication',
    emoji: '🗣️',
    content: 'Réponds uniquement en français',
    category: 'Communication'
  },
  {
    id: '3',
    name: 'Utilisation du Contexte', 
    emoji: '📚',
    content: 'Base ta réponse sur le contexte fourni',
    category: 'Traitement'
  },
  {
    id: '4',
    name: 'Citations et Sources',
    emoji: '📝', 
    content: 'Cite tes sources en utilisant [1], [2], etc.',
    category: 'Références'
  },
  {
    id: '5',
    name: 'Gestion des Limites',
    emoji: '❓',
    content: 'Si l&#39;information n&#39;est pas dans le contexte, dis-le clairement',
    category: 'Limites'
  },
  {
    id: '6',
    name: 'Style de Réponse', 
    emoji: '✍️',
    content: 'Sois concis mais informatif',
    category: 'Style'
  },
  {
    id: '7',
    name: 'Ton et Attitude',
    emoji: '😊', 
    content: 'Maintiens un ton professionnel et bienveillant',
    category: 'Attitude'
  }
]

const DEFAULT_SYSTEM_PROMPT = DEFAULT_RULES.map(rule => rule.content).join('\n\n')



interface ModelConfig {
  chatModel: string
  embeddingModel: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  topP: number
  rules?: Rule[]
  defaultModel?: string
}

export default function NeuronsPage() {
  const [config, setConfig] = useState<ModelConfig>({
    chatModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1,
    rules: DEFAULT_RULES
  })
  
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRule, setNewRule] = useState<Partial<Rule>>({
    name: '',
    emoji: '💡',
    content: '',
    category: 'Personnalisé'
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availableModels, setAvailableModels] = useState(AVAILABLE_MODELS)
  
  // États pour les sections dépliantes
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'gpt5': true,
    'gpt4o': true
  })
  
  // Statistiques d'usage




  // Charger la configuration actuelle
  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config')
      if (response.ok) {
        const data = await response.json()
        // S'assurer que les règles existent et sont au bon format
        if (!data.rules || !Array.isArray(data.rules)) {
          data.rules = DEFAULT_RULES
        }
        setConfig(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la config:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        alert('Configuration sauvegardée avec succès ! ✅')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`Erreur lors de la sauvegarde: ${errorMessage} ❌`)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = () => {
    if (confirm('Réinitialiser à la configuration par défaut ?')) {
      setConfig({
        chatModel: 'gpt-4o-mini',
        embeddingModel: 'text-embedding-3-small',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1,
        rules: DEFAULT_RULES
      })
    }
  }

  const updateRuleContent = (ruleId: string, content: string) => {
    const newRules = config.rules?.map(rule => 
      rule.id === ruleId ? { ...rule, content } : rule
    ) || []
    updateSystemPrompt(newRules)
  }

  const updateRuleName = (ruleId: string, name: string) => {
    const newRules = config.rules?.map(rule => 
      rule.id === ruleId ? { ...rule, name } : rule
    ) || []
    updateSystemPrompt(newRules)
  }

  const updateRuleEmoji = (ruleId: string, emoji: string) => {
    const newRules = config.rules?.map(rule => 
      rule.id === ruleId ? { ...rule, emoji } : rule
    ) || []
    updateSystemPrompt(newRules)
  }

  const deleteRule = (ruleId: string) => {
    if (confirm('Supprimer cette règle ?')) {
      const newRules = config.rules?.filter(rule => rule.id !== ruleId) || []
      updateSystemPrompt(newRules)
    }
  }

  const addRule = () => {
    if (newRule.name && newRule.content) {
      const rule: Rule = {
        id: Date.now().toString(),
        name: newRule.name || '',
        emoji: newRule.emoji || '💡',
        content: newRule.content || '',
        category: newRule.category || 'Personnalisé'
      }
      const newRules = [...(config.rules || []), rule]
      updateSystemPrompt(newRules)
      setNewRule({ name: '', emoji: '💡', content: '', category: 'Personnalisé' })
      setShowAddRule(false)
    }
  }

  const updateSystemPrompt = (rules: Rule[]) => {
    const systemPrompt = rules.map(rule => rule.content).join('\n\n')
    setConfig({
      ...config,
      rules,
      systemPrompt
    })
  }

  const moveRule = (ruleId: string, direction: 'up' | 'down') => {
    const rules = [...(config.rules || [])]
    const index = rules.findIndex(r => r.id === ruleId)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= rules.length) return

    [rules[index], rules[newIndex]] = [rules[newIndex], rules[index]]
    updateSystemPrompt(rules)
  }

  const getModelInfo = (modelId: string) => {
    return availableModels.find(m => m.id === modelId) || availableModels[0]
  }

  const toggleSection = (category: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const calculateCost = (model: ModelInfo, inputTokens: number, outputTokens: number) => {
    const inputCost = (inputTokens / 1000) * model.pricing.input
    const outputCost = (outputTokens / 1000) * model.pricing.output
    return inputCost + outputCost
  }

  const formatCost = (cost: number) => {
    if (cost >= 0.01) {
      return `$${cost.toFixed(4)}`
    } else if (cost >= 0.001) {
      return `$${cost.toFixed(5)}`
    } else if (cost >= 0.0001) {
      return `$${cost.toFixed(6)}`
    } else if (cost > 0) {
      return `$${cost.toFixed(7)}`
    } else {
      return '$0'
    }
  }

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'gpt5': return '🚀 GPT-5 - Nouvelle Génération'
      case 'gpt4o': return '⭐ GPT-4o - Modèles Fiables'
      default: return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gpt5': return 'border-purple-200 bg-purple-50 dark:bg-purple-900/20'
      case 'gpt4o': return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20'
      default: return 'border-gray-200'
    }
  }

  const getCategoryModels = (category: string) => {
    return availableModels.filter(model => model.category === category)
  }

  const setAsDefault = (modelId: string) => {
    const newConfig = {
      ...config,
      defaultModel: modelId,
      chatModel: modelId
    }
    
    // Forcer temperature=1 pour GPT-4o et GPT-5
    if (modelId.includes('gpt-4o') || modelId.includes('gpt-5')) {
      newConfig.temperature = 1
    }
    
    setConfig(newConfig)
  }

  // Vérifier si le modèle nécessite temperature=1
  const requiresFixedTemperature = (modelId: string) => {
    return modelId.includes('gpt-4o') || modelId.includes('gpt-5')
  }

  // Gérer le changement de modèle
  const handleModelChange = (modelId: string) => {
    const newConfig = {
      ...config,
      chatModel: modelId
    }
    
    // Forcer temperature=1 pour GPT-4o et GPT-5
    if (requiresFixedTemperature(modelId)) {
      newConfig.temperature = 1
    }
    
    setConfig(newConfig)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Neurones IA</h1>
            <p className="text-sm sm:text-base text-gray-600">Configuration des modèles et règles d'intelligence artificielle</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models">🤖 Modèles</TabsTrigger>
          <TabsTrigger value="rules">📋 Règles</TabsTrigger>
          <TabsTrigger value="parameters">⚙️ Paramètres</TabsTrigger>
        </TabsList>

        {/* Onglet Modèles */}
        <TabsContent value="models" className="space-y-6">
          {/* Sections de modèles par catégorie */}
          {['gpt5', 'gpt4o'].map((category) => {
            const categoryModels = getCategoryModels(category)
            if (categoryModels.length === 0) return null
            
            return (
              <Card key={category}>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection(category)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <span className="mr-2">{getCategoryTitle(category)}</span>
                      {category === 'gpt5' && (
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                          Disponible maintenant !
                        </span>
                      )}
                    </CardTitle>
                    <ChevronRight 
                      className={`h-5 w-5 transition-transform ${
                        expandedSections[category] ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>
                  <CardDescription>
                    {categoryModels.length} modèle{categoryModels.length > 1 ? 's' : ''} disponible{categoryModels.length > 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                
                {expandedSections[category] && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryModels.map((model) => (
                        <div
                          key={model.id}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all card-hover ${
                            config.chatModel === model.id
                              ? 'border-primary bg-primary/5 dark:bg-primary/10'
                              : 'border-border hover:border-accent'
                          } ${!model.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => model.available && handleModelChange(model.id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground">{model.name}</h3>
                                {config.defaultModel === model.id && (
                                  <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                                    Défaut
                                  </span>
                                )}
                                {!model.available && (
                                  <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded">
                                    Bientôt
                                  </span>
                                )}
                                {model.category === 'gpt5' && model.available && (
                                  <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded">
                                    Nouveau !
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{model.description}</p>
                              
                              {/* Informations de prix */}
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Input:</span>
                                  <span className="font-mono">{formatCost(model.pricing.input/1000)}/1K tokens</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Output:</span>
                                  <span className="font-mono">{formatCost(model.pricing.output/1000)}/1K tokens</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Max tokens:</span>
                                  <span className="font-mono">{model.maxTokens.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          {model.available && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                              {config.chatModel === model.id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setAsDefault(model.id)
                                  }}
                                  className="text-xs flex-1"
                                >
                                  Définir par défaut
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
          
          {/* Info du modèle sélectionné */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 text-gray-500 mr-2" />
                Modèle Actuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{getModelInfo(config.chatModel).name}</h3>
                  <p className="text-muted-foreground mb-3">{getModelInfo(config.chatModel).description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Coût input:</span>
                      <div className="font-mono">{formatCost(getModelInfo(config.chatModel).pricing.input/1000)}/1K tokens</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coût output:</span>
                      <div className="font-mono">{formatCost(getModelInfo(config.chatModel).pricing.output/1000)}/1K tokens</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modèle d'Embedding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-600" />
                Modèle d'Embeddings
              </CardTitle>
              <CardDescription>
                Modèle utilisé pour convertir le texte en vecteurs pour la recherche sémantique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-3 border rounded-lg">
                  <input
                    type="radio"
                    name="embedding"
                    checked={config.embeddingModel === 'text-embedding-3-small'}
                    onChange={() => setConfig({...config, embeddingModel: 'text-embedding-3-small'})}
                  />
                  <div>
                    <div className="font-medium">text-embedding-3-small</div>
                    <div className="text-sm text-gray-600">Modèle compact et économique (1536 dimensions)</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-3 border rounded-lg">
                  <input
                    type="radio"
                    name="embedding"
                    checked={config.embeddingModel === 'text-embedding-3-large'}
                    onChange={() => setConfig({...config, embeddingModel: 'text-embedding-3-large'})}
                  />
                  <div>
                    <div className="font-medium">text-embedding-3-large</div>
                    <div className="text-sm text-gray-600">Modèle puissant pour plus de précision (3072 dimensions)</div>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Règles */}
        <TabsContent value="rules" className="space-y-6">
          <div className="space-y-4">
            {/* En-tête avec bouton d'ajout */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-orange-600" />
                      Règles de Comportement
                    </CardTitle>
                    <CardDescription>
                      Définissez les règles de comportement de votre assistant d'IA
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddRule(true)} className="shrink-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une règle
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Formulaire d'ajout de règle */}
            {showAddRule && (
              <Card className="border-dashed border-2 border-gray-300">
                <CardHeader>
                  <CardTitle className="text-base text-gray-600">✨ Nouvelle Règle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Emoji</label>
                      <Input
                        value={newRule.emoji}
                        onChange={(e) => setNewRule({...newRule, emoji: e.target.value})}
                        placeholder="💡"
                        className="text-center text-lg"
                        maxLength={2}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Nom de la règle</label>
                      <Input
                        value={newRule.name}
                        onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                        placeholder="Ma nouvelle règle"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contenu de la règle</label>
                    <Textarea
                      value={newRule.content}
                      onChange={(e) => setNewRule({...newRule, content: e.target.value})}
                      rows={3}
                      placeholder="Décrivez le comportement souhaité..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={addRule} disabled={!newRule.name || !newRule.content}>
                      <Check className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddRule(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Liste des règles */}
            <div className="space-y-3">
              {config.rules?.map((rule, index) => (
                <Card key={rule.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-4">
                      {/* Contrôles de réorganisation */}
                      <div className="flex flex-col space-y-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveRule(rule.id, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" 
                          size="sm"
                          onClick={() => moveRule(rule.id, 'down')}
                          disabled={index === (config.rules?.length || 0) - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Contenu de la règle */}
                      <div className="flex-1 space-y-3">
                        {/* En-tête de la règle */}
                        <div className="flex items-center space-x-3">
                          {editingRule === rule.id ? (
                            <>
                              <Input
                                value={rule.emoji}
                                onChange={(e) => updateRuleEmoji(rule.id, e.target.value)}
                                className="w-12 text-center text-lg"
                                maxLength={2}
                              />
                              <Input
                                value={rule.name}
                                onChange={(e) => updateRuleName(rule.id, e.target.value)}
                                className="flex-1 font-medium"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingRule(null)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-lg">{rule.emoji}</span>
                              <h3 className="font-medium text-gray-900">{rule.name}</h3>
                              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRule(rule.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteRule(rule.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Contenu de la règle */}
                        <Textarea
                          value={rule.content}
                          onChange={(e) => updateRuleContent(rule.id, e.target.value)}
                          rows={3}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Aperçu du prompt final */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  👁️ Aperçu du Prompt Final
                </CardTitle>
                <CardDescription>
                  Voici comment vos {config.rules?.length || 0} règles seront envoyées à l'IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {config.systemPrompt}
                  </pre>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  💡 Le prompt est automatiquement généré dans l'ordre de vos règles.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onglet Paramètres */}
        <TabsContent value="parameters" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Température */}
            <Card>
              <CardHeader>
                <CardTitle>🌡️ Température</CardTitle>
                <CardDescription>
                  Contrôle la créativité des réponses (0 = précis, 1 = créatif)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requiresFixedTemperature(config.chatModel) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Température verrouillée</span>
                      </div>
                      <p className="text-sm text-amber-700 mt-1">
                        Les modèles GPT-4o et GPT-5 nécessitent une température de 1.0 pour fonctionner correctement.
                      </p>
                    </div>
                  )}
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                    disabled={requiresFixedTemperature(config.chatModel)}
                    className={requiresFixedTemperature(config.chatModel) ? 'opacity-50 cursor-not-allowed' : ''}
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Précis (0.0)</span>
                    <span className="font-medium">{config.temperature}</span>
                    <span>Créatif (1.0)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Max Tokens */}
            <Card>
              <CardHeader>
                <CardTitle>📏 Longueur Maximum</CardTitle>
                <CardDescription>
                  Nombre maximum de tokens dans la réponse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min="100"
                  max="4000"
                  step="100"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value)})}
                />
                <div className="mt-2 text-sm text-gray-500">
                  ~{Math.round(config.maxTokens * 0.75)} mots environ
                </div>
              </CardContent>
            </Card>

            {/* Top P */}
            <Card>
              <CardHeader>
                <CardTitle>🎯 Top P</CardTitle>
                <CardDescription>
                  Contrôle la diversité du vocabulaire (0.1 = focalisé, 1.0 = diversifié)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={config.topP}
                    onChange={(e) => setConfig({...config, topP: parseFloat(e.target.value)})}
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Focalisé (0.1)</span>
                    <span className="font-medium">{config.topP}</span>
                    <span>Diversifié (1.0)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Résumé Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Configuration Actuelle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Chat:</strong> {getModelInfo(config.chatModel).name}</div>
                <div><strong>Embedding:</strong> {config.embeddingModel}</div>
                <div><strong>Température:</strong> {config.temperature}</div>
                <div><strong>Max tokens:</strong> {config.maxTokens}</div>
                <div><strong>Top P:</strong> {config.topP}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


      </Tabs>
    </div>
  )
}
