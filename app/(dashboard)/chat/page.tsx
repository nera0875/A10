'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessage } from '@/lib/types'
import { Loader2, MessageSquare, Plus, History, DollarSign, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageBubble } from './components/MessageBubble'
import TypingIndicator from './components/TypingIndicator'
import { createClient } from '@/lib/supabase/client'

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  totalCost?: number
  cacheSavings?: number
  messageCount?: number
}



export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
  // Alias pour la compatibilité
  const isLoading = loading
  const loadingText = isThinking ? "Réflexion..." : "Génération de la réponse..."

  // Fonction pour formater les coûts
  const formatCost = (cost: number) => {
    if (cost >= 0.01) {
      return `${cost.toFixed(2)}€`
    } else if (cost >= 0.001) {
      return `${(cost * 1000).toFixed(1)}m€`
    } else {
      return `${(cost * 1000000).toFixed(0)}µ€`
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Calculer les coûts d'une conversation
  const calculateConversationCosts = async (conversationId: string) => {
    try {
      // Récupérer les statistiques d'usage pour cette conversation
      const { data: usageData, error: usageError } = await supabase
        .from('usage_stats')
        .select('total_cost, cache_hit, cost_input, cost_output')
        .eq('conversation_id', conversationId)

      if (usageError) {
        console.error('Erreur récupération usage_stats:', usageError)
      }
      
      // Récupérer les messages pour compter
      const { data: messagesData, error: messagesError } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('conversation_id', conversationId)

      if (messagesError) {
        console.error('Erreur récupération messages:', messagesError)
      }
      
      let totalCost = 0
      let totalCacheSavings = 0
      const messageCount = messagesData?.length || 0
      
      if (usageData && usageData.length > 0) {
        // Utiliser les vraies données de coût
        totalCost = usageData.reduce((sum, record) => sum + parseFloat(record.total_cost || 0), 0)
        
        // Calculer les économies de cache
        const cacheHits = usageData.filter(record => record.cache_hit).length
        if (cacheHits > 0) {
          const avgCostPerMessage = totalCost / usageData.length
          totalCacheSavings = cacheHits * avgCostPerMessage * 0.8 // 80% d'économie estimée
        }
      } else if (messageCount > 0) {
        // Fallback: estimation basée sur le nombre de messages
        totalCost = messageCount * 0.001 // Estimation approximative
      }
      
      return {
        totalCost: totalCost,
        cacheSavings: totalCacheSavings > 0 ? totalCacheSavings : undefined,
        messageCount
      }
    } catch (error) {
      console.error('Erreur calcul coûts conversation:', error)
      return {
        totalCost: 0,
        cacheSavings: undefined,
        messageCount: 0
      }
    }
  }

  // Charger les conversations de l'utilisateur
  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20)

      if (error) throw error
      
      // Calculer les coûts pour chaque conversation
      const conversationsWithCosts = await Promise.all(
        (data || []).map(async (conv) => {
          const costs = await calculateConversationCosts(conv.id)
          return {
            ...conv,
            ...costs
          }
        })
      )
      
      setConversations(conversationsWithCosts)
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error)
    }
  }

  // Charger les messages d'une conversation
  const loadConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      const chatMessages: ChatMessage[] = (data || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
      
      setMessages(chatMessages)
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error)
    }
  }

  // Créer une nouvelle conversation
  const createNewConversation = () => {
    setCurrentConversationId(null)
    setMessages([])
    setShowHistory(false)
  }

  // Sélectionner une conversation existante
  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    loadConversationMessages(conversationId)
    setShowHistory(false)
  }

  // Mettre à jour les coûts d'une conversation spécifique
  const updateConversationCosts = async (conversationId: string) => {
    if (!conversationId) return
    
    const costs = await calculateConversationCosts(conversationId)
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, ...costs }
          : conv
      )
    )
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking])

  useEffect(() => {
    loadConversations()
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      pricing: {
        inputTokens: Math.floor(input.trim().length / 4), // Approximation simple
        outputTokens: 0,
        cost: Math.random() * 0.001 + 0.0001, // Coût simulé entre 0.0001 et 0.0011
        cacheHit: Math.random() > 0.7, // 30% de chance de cache hit
        cacheSavings: Math.random() > 0.7 ? Math.random() * 0.0005 : undefined,
        model: 'GPT-4o'
      }
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input.trim()
    setInput('')
    setLoading(true)
    setIsThinking(true)
    
    // Déclencher l'événement pour mettre à jour les stats de pricing
    window.dispatchEvent(new CustomEvent('newMessageSent'))

    // Simuler un délai de thinking
    await new Promise(resolve => setTimeout(resolve, 800))
    setIsThinking(false)

    // Créer le message de l'assistant qui va être streamé
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      sources: [],
      pricing: {
        inputTokens: Math.floor(currentInput.length / 4),
        outputTokens: 0, // Sera mis à jour pendant le streaming
        cost: Math.random() * 0.005 + 0.001, // Coût plus élevé pour l'assistant
        cacheHit: Math.random() > 0.5, // 50% de chance de cache hit
        cacheSavings: Math.random() > 0.5 ? Math.random() * 0.002 : undefined,
        model: 'GPT-4o'
      }
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: currentInput,
          conversationId: currentConversationId 
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      let buffer = ''
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += new TextDecoder().decode(value)
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'content' && data.content) {
                // Streaming immédiat - affichage direct du contenu complet
                accumulatedContent = data.content
                
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = accumulatedContent
                    // Mettre à jour les outputTokens basé sur la longueur du contenu
                    if (lastMessage.pricing) {
                      lastMessage.pricing.outputTokens = Math.floor(accumulatedContent.length / 4)
                      // Recalculer le coût basé sur les tokens
                      lastMessage.pricing.cost = (lastMessage.pricing.inputTokens * 0.00001) + (lastMessage.pricing.outputTokens * 0.00003)
                    }
                  }
                  return newMessages
                })
              } else if (data.type === 'metadata' && data.conversationId) {
                // Mettre à jour l'ID de conversation si c'est une nouvelle conversation
                if (!currentConversationId) {
                  setCurrentConversationId(data.conversationId)
                  loadConversations() // Recharger la liste des conversations
                } else {
                  // Mettre à jour les coûts de la conversation existante
                  updateConversationCosts(data.conversationId)
                }
              }
              // On ignore les sources maintenant qu'elles ne sont plus affichées
            } catch (e) {
              console.error('Error parsing SSE data:', e, 'Line:', line)
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur chat:', error)
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = 'Désolé, une erreur est survenue lors de la génération de la réponse.'
        }
        return newMessages
      })
    } finally {
      setLoading(false)
      // Émettre un événement pour notifier qu'un nouveau message a été envoyé
      window.dispatchEvent(new CustomEvent('newMessageSent'))
      
      // Mettre à jour les coûts de la conversation courante
      if (currentConversationId) {
        updateConversationCosts(currentConversationId)
      }
    }
  }

  return (
    <div className="flex bg-gray-50 relative h-[calc(100vh-140px)]">
      {/* Sidebar Historique */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full"
          >
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Historique</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                onClick={createNewConversation}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle conversation
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <motion.button
                    key={conversation.id}
                    onClick={() => selectConversation(conversation.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentConversationId === conversation.id
                        ? 'bg-gray-200 border border-gray-300'
                        : 'hover:bg-gray-100 border border-transparent'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {conversation.title}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500">
                        {new Date(conversation.updated_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        {conversation.cacheSavings && conversation.cacheSavings > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs border border-green-200">
                            <Zap className="w-3 h-3" />
                            <span className="font-medium">-{formatCost(conversation.cacheSavings)}</span>
                          </div>
                        )}
                        {conversation.totalCost && conversation.totalCost > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 text-gray-700 rounded text-xs border border-gray-200">
                            <DollarSign className="w-3 h-3" />
                            <span className="font-medium">{formatCost(conversation.totalCost)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {conversation.messageCount && conversation.messageCount > 0 && (
                      <div className="text-xs text-gray-400 mt-1">
                        {conversation.messageCount} message{conversation.messageCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col h-[calc(100vh-140px)]">
        {/* Zone des messages */}
        <div className="flex-1 overflow-y-auto pb-32 px-6 relative">
          {/* Boutons intégrés en haut à droite */}
          <div className="sticky top-0 z-10 flex justify-end p-4 bg-gradient-to-b from-gray-50 to-transparent">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200"
              >
                <History className="w-4 h-4" />
                Historique
              </button>
              <button
                onClick={createNewConversation}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nouveau
              </button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto py-6">
            {messages.length === 0 && !loading ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center h-full py-20 px-6 text-center"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Commencez une conversation
                </h3>
                <p className="text-gray-500 max-w-md">
                  Posez vos questions sur vos mémoires et documents. L'IA vous aidera à explorer vos connaissances.
                </p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInput("Quelles sont mes dernières mémoires ?")}
                    className="p-5 text-left bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="font-semibold text-gray-900 mb-2">Mes mémoires récentes</div>
                    <div className="text-sm text-gray-600">Voir les dernières informations sauvegardées</div>
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInput("Résume-moi les points importants de mes documents")}
                    className="p-5 text-left bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="font-semibold text-gray-900 mb-2">Résumé des documents</div>
                    <div className="text-sm text-gray-600">Obtenir un aperçu de vos contenus</div>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-0 py-6">
                {messages.map((message, index) => (
                  <MessageBubble key={message.id || index} message={message} index={index} />
                ))}
                {loading && (
                  <TypingIndicator />
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white shadow-sm z-10">
          <div className="max-w-4xl mx-auto px-6 py-6">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question sur vos mémoires..."
                className="w-full rounded-xl border border-gray-300 bg-white px-5 py-4 pr-14 text-base text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-3 rounded-lg bg-gray-900 px-4 py-2.5 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}
