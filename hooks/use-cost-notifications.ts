'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

interface CostNotificationData {
  model: string
  totalCost: number
  inputCost: number
  outputCost: number
  tokensInput: number
  tokensOutput: number
  cacheHit?: boolean
}

export function useCostNotifications() {
  useEffect(() => {
    const handleCostCalculated = (event: CustomEvent<CostNotificationData>) => {
      const { model, totalCost, inputCost, outputCost, tokensInput, tokensOutput, cacheHit } = event.detail
      
      // Format du coût en euros
      const formatCost = (cost: number) => `${cost.toFixed(4)}€`
      
      // Message principal
      const costMessage = `Coût calculé: ${formatCost(totalCost)}`
      
      // Détails supplémentaires
      const details = [
        `Modèle: ${model}`,
        `Tokens: ${tokensInput} → ${tokensOutput}`,
        `Entrée: ${formatCost(inputCost)} | Sortie: ${formatCost(outputCost)}`,
        cacheHit ? '🎯 Cache hit - Économie réalisée!' : ''
      ].filter(Boolean).join(' • ')
      
      // Afficher la notification avec style approprié
      if (cacheHit) {
        toast.success(costMessage, {
          description: details,
          duration: 4000,
        })
      } else {
        toast.info(costMessage, {
          description: details,
          duration: 3000,
        })
      }
    }

    // Écouter l'événement personnalisé
    window.addEventListener('costCalculated', handleCostCalculated as EventListener)
    
    return () => {
      window.removeEventListener('costCalculated', handleCostCalculated as EventListener)
    }
  }, [])
}

// Fonction utilitaire pour déclencher une notification de coût
export function notifyCostCalculated(data: CostNotificationData) {
  const event = new CustomEvent('costCalculated', { detail: data })
  window.dispatchEvent(event)
}