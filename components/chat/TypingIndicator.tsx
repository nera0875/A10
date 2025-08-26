'use client'

import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'

interface TypingIndicatorProps {
  isThinking?: boolean
}

export default function TypingIndicator({ isThinking = false }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="flex gap-4 px-6 py-8 bg-gray-50/30 transition-colors"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Thinking Content */}
      <div className="flex-1 max-w-none">
        <div className="flex items-center gap-3">
          <span className="text-base text-gray-600 font-normal">
            {isThinking ? 'Thinking...' : 'Typing...'}
          </span>
          
          {/* Animated dots */}
          <div className="flex gap-1">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}