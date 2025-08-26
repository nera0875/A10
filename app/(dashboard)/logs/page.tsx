'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Terminal, AlertTriangle, Info, XCircle, CheckCircle, Trash2, Download, RefreshCw, Zap } from 'lucide-react'
import { logger } from '@/lib/logger'

interface LogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info' | 'success'
  category: string
  message: string
  details?: any
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info' | 'success'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLogs()
    
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 2000) // Refresh toutes les 2 secondes
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error)
    }
  }

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/logs', { method: 'DELETE' })
      if (response.ok) {
        setLogs([])
      }
    } catch (error) {
      console.error('Erreur suppression logs:', error)
    }
  }

  const generateTestLogs = () => {
    logger.info('Génération de logs de test...', { category: 'Test' })
    logger.success('Test de log de succès', { category: 'Test' })
    logger.warning('Test d\'avertissement', { category: 'Test' })
    logger.error('Test d\'erreur', { category: 'Test', details: { code: 'TEST_001', severity: 'low' } })
    logger.auth('Test de log d\'authentification', { user: 'test@example.com' })
    logger.api('Test de log d\'API', { endpoint: '/api/test', method: 'POST' })
    logger.database('Test de log de base de données', { query: 'SELECT * FROM test', duration: '150ms' })
    logger.openai('Test de log OpenAI', { model: 'gpt-4', tokens: 100 })
    
    // Recharger les logs après génération
    setTimeout(loadLogs, 500)
  }

  const exportLogs = () => {
    const filteredLogs = getFilteredLogs()
    const content = filteredLogs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${
        log.details ? '\n' + JSON.stringify(log.details, null, 2) : ''
      }`
    ).join('\n\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memoire-logs-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getFilteredLogs = () => {
    return filter === 'all' ? logs : logs.filter(log => log.level === filter)
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'border-l-red-500 bg-red-50'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'success':
        return 'border-l-green-500 bg-green-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR')
  }

  const getLogCounts = () => {
    const counts = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      all: logs.length,
      error: counts.error || 0,
      warning: counts.warning || 0,
      info: counts.info || 0,
      success: counts.success || 0
    }
  }

  const counts = getLogCounts()
  const filteredLogs = getFilteredLogs()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-gray-900">Logs et Débogage</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateTestLogs}
            className="bg-purple-50 border-purple-200 hover:bg-purple-100"
          >
            <Zap className="h-4 w-4 mr-2" />
            Logs de test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </Button>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button variant="destructive" size="sm" onClick={clearLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Vider
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-5 gap-4">
        <Card className={`cursor-pointer ${filter === 'all' ? 'ring-2 ring-gray-500' : ''}`} 
              onClick={() => setFilter('all')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{counts.all}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer ${filter === 'error' ? 'ring-2 ring-red-500' : ''}`} 
              onClick={() => setFilter('error')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{counts.error}</div>
            <div className="text-sm text-gray-600">Erreurs</div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer ${filter === 'warning' ? 'ring-2 ring-yellow-500' : ''}`} 
              onClick={() => setFilter('warning')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{counts.warning}</div>
            <div className="text-sm text-gray-600">Avertissements</div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer ${filter === 'info' ? 'ring-2 ring-gray-500' : ''}`} 
              onClick={() => setFilter('info')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{counts.info}</div>
            <div className="text-sm text-gray-600">Infos</div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer ${filter === 'success' ? 'ring-2 ring-green-500' : ''}`} 
              onClick={() => setFilter('success')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{counts.success}</div>
            <div className="text-sm text-gray-600">Succès</div>
          </CardContent>
        </Card>
      </div>

      {/* Console de logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Console de logs ({filteredLogs.length})</span>
            <span className="text-sm font-normal text-gray-500">
              Filtre: {filter === 'all' ? 'Tous' : filter}
            </span>
          </CardTitle>
          <CardDescription>
            Logs en temps réel de l'application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <p>Aucun log {filter !== 'all' ? `de type "${filter}"` : ''} disponible</p>
                <p className="mt-2 text-sm">
                  Cliquez sur "Logs de test" pour générer des exemples de logs
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`mb-3 p-3 border-l-4 rounded ${getLogColor(log.level)}`}
                >
                  <div className="flex items-start space-x-2">
                    {getLogIcon(log.level)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          [{log.category}]
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      
                      <div className="text-gray-800 mb-2">
                        {log.message}
                      </div>
                      
                      {log.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            Voir les détails
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-gray-700 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Comment utiliser les logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Logs de test</strong> : Cliquez pour générer des exemples de logs</p>
            <p>• <strong>Auto-refresh</strong> : Les logs s'actualisent automatiquement toutes les 2 secondes</p>
            <p>• <strong>Filtres</strong> : Cliquez sur les cartes de statistiques pour filtrer par type</p>
            <p>• <strong>Export</strong> : Téléchargez tous les logs en fichier texte</p>
            <p>• <strong>Détails</strong> : Développez "Voir les détails" pour plus d'informations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
