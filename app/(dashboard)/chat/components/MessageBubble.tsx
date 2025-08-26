'use client'

import { motion } from 'framer-motion'
import { User, MessageSquare, DollarSign, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { ChatMessage } from '@/lib/types'

interface MessageBubbleProps {
  message: ChatMessage
  index: number
}

export function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  
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
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={`flex gap-4 px-6 py-8 ${isUser ? 'bg-transparent' : 'bg-gray-50/30'} transition-colors`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-gray-900 text-white' 
          : 'bg-white border-2 border-gray-200 text-gray-700'
      }`}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <MessageSquare className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Role Label */}
        <div className="mb-2 flex items-center justify-between">
          <span className={`text-sm font-semibold ${
            isUser ? 'text-gray-900' : 'text-gray-700'
          }`}>
            {isUser ? 'You' : 'Assistant'}
          </span>
          
          {/* Price Indicator */}
          {message.pricing && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {message.pricing.cacheHit && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                  <Zap className="w-3 h-3" />
                  <span>Cache</span>
                  {message.pricing.cacheSavings && (
                    <span className="font-medium">-{formatCost(message.pricing.cacheSavings)}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded-full border border-gray-200">
                <DollarSign className="w-3 h-3" />
                <span className="font-medium">{formatCost(message.pricing.cost)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="max-w-none">
          {isUser ? (
            <div className="flex justify-end">
              <div className="max-w-2xl px-5 py-4 rounded-2xl bg-black text-white">
                <p className="text-base leading-relaxed font-normal">{message.content}</p>
              </div>
            </div>
          ) : (
            <div className="max-w-none">
              <div className="text-gray-900 font-normal">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="mb-4 last:mb-0 text-base leading-7 text-gray-900 font-normal">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-4 space-y-2 text-base leading-7 text-gray-900">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-4 space-y-2 text-base leading-7 text-gray-900">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="text-gray-900">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                    code: ({ children }) => (
                      <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm font-mono">
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {message.content || ''}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>


      </div>
    </motion.div>
  )
}