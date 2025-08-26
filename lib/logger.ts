type LogLevel = 'error' | 'warning' | 'info' | 'success'

interface LogOptions {
  category?: string
  details?: any
}

class Logger {
  private sanitizeDetails(details: any): any {
    if (details === null || details === undefined) {
      return null
    }
    
    if (typeof details === 'string' || typeof details === 'number' || typeof details === 'boolean') {
      return details
    }
    
    if (Array.isArray(details)) {
      return details.map(item => this.sanitizeDetails(item))
    }
    
    if (typeof details === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(details)) {
        if (value !== undefined) {
          sanitized[key] = this.sanitizeDetails(value)
        }
      }
      return Object.keys(sanitized).length > 0 ? sanitized : null
    }
    
    return details
  }

  private async sendLog(level: LogLevel, message: string, options: LogOptions = {}) {
    const sanitizedDetails = this.sanitizeDetails(options.details)
    
    const logData = {
      level,
      category: options.category || 'App',
      message,
      details: sanitizedDetails
    }

    // Toujours logger en console en premier
    const timestamp = new Date().toLocaleTimeString('fr-FR')
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${logData.category}]`
    
    switch (level) {
      case 'error':
        console.error(prefix, message, sanitizedDetails || '')
        break
      case 'warning':
        console.warn(prefix, message, sanitizedDetails || '')
        break
      case 'success':
        console.log(prefix, '✅', message, sanitizedDetails || '')
        break
      default:
        console.log(prefix, message, sanitizedDetails || '')
    }

    // Puis essayer d'envoyer au serveur (sans attendre) - seulement côté client
    try {
      if (typeof window !== 'undefined') {
        // Côté client seulement
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logData),
        }).catch(error => {
          console.error('Échec envoi log vers serveur:', error)
        })
      }
    } catch (error) {
      console.error('Erreur envoi log:', error)
    }
  }

  error(message: string, options: LogOptions = {}) {
    return this.sendLog('error', message, { category: 'Error', ...options })
  }

  warning(message: string, options: LogOptions = {}) {
    return this.sendLog('warning', message, { category: 'Warning', ...options })
  }

  info(message: string, options: LogOptions = {}) {
    return this.sendLog('info', message, { category: 'Info', ...options })
  }

  success(message: string, options: LogOptions = {}) {
    return this.sendLog('success', message, { category: 'Success', ...options })
  }

  // Méthodes spécialisées
  auth(message: string, details?: any) {
    return this.sendLog('info', message, { category: 'Auth', details })
  }

  api(message: string, details?: any) {
    return this.sendLog('info', message, { category: 'API', details })
  }

  database(message: string, details?: any) {
    return this.sendLog('info', message, { category: 'Database', details })
  }

  openai(message: string, details?: any) {
    return this.sendLog('info', message, { category: 'OpenAI', details })
  }

  supabase(message: string, details?: any) {
    return this.sendLog('info', message, { category: 'Supabase', details })
  }

  // Méthode pour initialiser avec des logs de test
  initWithTestLogs() {
    this.info('Application démarrée', { category: 'System' })
    this.success('Système de logs initialisé', { category: 'System' })
    this.warning('Ceci est un avertissement de test', { category: 'Test' })
    this.error('Ceci est une erreur de test', { category: 'Test', details: { errorCode: 'TEST_ERROR' } })
  }
}

// Instance globale
export const logger = new Logger()

// Hook pour React
export function useLogger() {
  return logger
}
