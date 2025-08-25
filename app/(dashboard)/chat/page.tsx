'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Bot, User, FileText, Brain } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la requête')
      }

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Erreur:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Désolé, une erreur s\'est produite. Veuillez réessayer.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chat Intelligent</h1>
        <p className="text-gray-600">Posez des questions sur vos mémoires et documents</p>
      </div>

      {/* Zone de messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 p-0">
          <div className="h-full overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Commencez une conversation !</p>
                  <p className="text-sm mt-2">
                    Je peux répondre à vos questions en utilisant vos mémoires et documents.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex space-x-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <Bot className="h-8 w-8 text-blue-600" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <ReactMarkdown className="prose prose-sm max-w-none">
                      {message.content}
                    </ReactMarkdown>
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 mb-2">
                          Sources utilisées:
                        </p>
                        <div className="space-y-1">
                          {message.sources.map((source, sourceIndex) => (
                            <div
                              key={sourceIndex}
                              className="flex items-start space-x-2 text-xs bg-white rounded p-2"
                            >
                              {source.type === 'memory' ? (
                                <Brain className="h-3 w-3 text-green-600 mt-0.5" />
                              ) : (
                                <FileText className="h-3 w-3 text-blue-600 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <span className="text-gray-600">
                                  {source.content.substring(0, 100)}...
                                </span>
                                <span className="ml-2 text-gray-400">
                                  ({Math.round(source.similarity * 100)}% similarité)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <User className="h-8 w-8 text-gray-600" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {loading && (
              <div className="flex space-x-3 justify-start">
                <div className="flex-shrink-0">
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Zone de saisie */}
      <div className="mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Posez votre question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
