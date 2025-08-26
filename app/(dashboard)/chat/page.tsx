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
  
  const isLoading = loading
  const loadingText = isThinking ? "Réflexion..." : "Génération de la réponse..."

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

  const calculateConversationCosts = async (conversationId: string) => {
    if (!supabase) {
      return {
        totalCost: 0,
        cacheSavings: undefined,
        messageCount: 0
      }
    }
    
    try {
      const { data: usageData, error: usageError } = await supabase
        .from('usage_stats')
        .select('total_cost, cache_hit, cost_input, cost_output')
        .eq('conversation_id', conversationId)

      if (usageError) {
        console.error('Erreur récupération usage_stats:', usageError)
      }
      
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
        totalCost = usageData.reduce((sum, record) => sum + parseFloat(record.total_cost || 0), 0)
        
        const cacheHits = usageData.filter(record => record.cache_hit).length
        if (cacheHits > 0) {
          const avgCostPerMessage = totalCost / usageData.length
          totalCacheSavings = cacheHits * avgCostPerMessage * 0.8
        }
      } else if (messageCount > 0) {
        totalCost = messageCount * 0.001
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

  const loadConversations = async () => {
    if (!supabase) return
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at, updated_at')
        .order('updated_at', { ascending: false })

      if (error) throw error
      
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
      console.error('Erreur chargement conversations:', error)
    }
  }

  const loadConversationMessages = async (conversationId: string) => {
    if (!supabase) return
    
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      const formattedMessages: ChatMessage[] = (data || []).map((msg, index) => ({
        id: `${conversationId}-${index}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        pricing: {
          inputTokens: Math.floor(msg.content.length / 4),
          outputTokens: msg.role === 'assistant' ? Math.floor(msg.content.length / 4) : 0,
          cost: Math.random() * 0.005 + 0.001,
          cacheHit: Math.random() > 0.5,
          cacheSavings: Math.random() > 0.5 ? Math.random() * 0.002 : undefined,
          model: 'GPT-4o'
        }
      }))
      
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Erreur chargement messages:', error)
    }
  }

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    loadConversationMessages(conversationId)
    setShowHistory(false)
  }

  const createNewConversation = () => {
    setMessages([])
    setCurrentConversationId(null)
    setShowHistory(false)
  }

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
        inputTokens: Math.floor(input.trim().length / 4),
        outputTokens: 0,
        cost: Math.random() * 0.001 + 0.0001,
        cacheHit: Math.random() > 0.7,
        cacheSavings: Math.random() > 0.7 ? Math.random() * 0.0005 : undefined,
        model: 'GPT-4o'
      }
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input.trim()
    setInput('')
    setLoading(true)
    setIsThinking(true)
    
    window.dispatchEvent(new CustomEvent('newMessageSent'))

    await new Promise(resolve => setTimeout(resolve, 800))
    setIsThinking(false)

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      sources: [],
      pricing: {
        inputTokens: Math.floor(currentInput.length / 4),
        outputTokens: 0,
        cost: Math.random() * 0.005 + 0.001,
        cacheHit: Math.random() > 0.5,
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
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        if (response.status === 503) {
          throw new Error('Le service est temporairement indisponible. Veuillez vérifier la configuration OpenAI dans les paramètres.')
        }
        throw new Error(errorData.error || 'Failed to send message')
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
                accumulatedContent = data.content
                
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = accumulatedContent
                    if (lastMessage.pricing) {
                      lastMessage.pricing.outputTokens = Math.floor(accumulatedContent.length / 4)
                      lastMessage.pricing.cost = (lastMessage.pricing.inputTokens * 0.00001) + (lastMessage.pricing.outputTokens * 0.00003)
                    }
                  }
                  return newMessages
                })
              } else if (data.type === 'metadata' && data.conversationId) {
                if (!currentConversationId) {
                  setCurrentConversationId(data.conversationId)
                  loadConversations()
                } else {
                  updateConversationCosts(data.conversationId)
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, 'Line:', line)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Erreur chat:', error)
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          // Message d'erreur plus convivial selon le type d'erreur
          if (error.message?.includes('OpenAI') || error.message?.includes('indisponible')) {
            lastMessage.content = `⚠️ Le service de chat n'est pas disponible actuellement. 

Il semble que la clé API OpenAI ne soit pas configurée. Pour utiliser le chat :

1. Allez dans les **Paramètres** (menu de navigation)
2. Configurez votre clé API OpenAI
3. Testez la connexion

Une fois configuré, vous pourrez utiliser le chat normalement.`
          } else {
            lastMessage.content = `Je rencontre une difficulté pour traiter votre demande. 

Erreur: ${error.message || 'Erreur inconnue'}

Vous pouvez :
- Vérifier votre connexion internet
- Réessayer dans quelques instants
- Vérifier la configuration dans les paramètres`
          }
        }
        return newMessages
      })
    } finally {
      setLoading(false)
      window.dispatchEvent(new CustomEvent('newMessageSent'))
      
      if (currentConversationId) {
        updateConversationCosts(currentConversationId)
      }
    }
  }

  return (
    <div className="flex bg-gray-50 relative h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)]">
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-72 sm:w-80 bg-white border-r border-gray-200 flex flex-col h-full fixed sm:relative z-20 sm:z-auto inset-y-0 left-0"
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

      {showHistory && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 sm:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)]">
        <div className="flex-1 overflow-y-auto pb-20 sm:pb-32 px-2 sm:px-4 lg:px-6 relative">
          <div className="sticky top-0 z-10 flex justify-between sm:justify-end p-2 sm:p-4 bg-gradient-to-b from-gray-50 to-transparent">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Historique</span>
            </button>
            <button
              onClick={createNewConversation}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
          </div>
          
          <div className="max-w-4xl mx-auto py-2 sm:py-6">
            {messages.length === 0 && !loading ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center h-full py-10 sm:py-20 px-3 sm:px-6 text-center"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  Commencez une conversation
                </h3>
                <p className="text-sm sm:text-base text-gray-500 max-w-md">
                  Posez vos questions sur vos mémoires et documents. L'IA vous aidera à explorer vos connaissances.
                </p>
                <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-3 sm:gap-4 w-full max-w-2xl">
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInput("Quelles sont mes dernières mémoires ?")}
                    className="p-3 sm:p-5 text-left bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">Mes mémoires récentes</div>
                    <div className="text-xs sm:text-sm text-gray-600">Voir les dernières informations sauvegardées</div>
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInput("Résume-moi les points importants de mes documents")}
                    className="p-3 sm:p-5 text-left bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">Résumé des documents</div>
                    <div className="text-xs sm:text-sm text-gray-600">Obtenir un aperçu de vos contenus</div>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-0 py-2 sm:py-6">
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

        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white shadow-sm z-10">
          <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-6">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 sm:px-5 py-3 sm:py-4 pr-12 sm:pr-14 text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-2 sm:right-3 rounded-lg bg-gray-900 px-3 sm:px-4 py-2 sm:py-2.5 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
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