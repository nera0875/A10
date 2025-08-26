'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, CheckCircle, XCircle, AlertCircle, Save, TestTube } from 'lucide-react'

interface ApiConfig {
  supabase_url: string
  supabase_anon_key: string
  openai_api_key: string
}

interface ConnectionStatus {
  supabase: 'testing' | 'connected' | 'error' | 'idle'
  openai: 'testing' | 'connected' | 'error' | 'idle'
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ApiConfig>({
    supabase_url: '',
    supabase_anon_key: '',
    openai_api_key: ''
  })
  
  const [status, setStatus] = useState<ConnectionStatus>({
    supabase: 'idle',
    openai: 'idle'
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadSavedConfig()
  }, [])

  const loadSavedConfig = async () => {
    try {
      // Charger la configuration depuis localStorage ou Supabase
      const saved = localStorage.getItem('api_config')
      if (saved) {
        const parsedConfig = JSON.parse(saved)
        setConfig(parsedConfig)
        // Tester automatiquement les connexions si les clés sont présentes
        if (parsedConfig.supabase_url && parsedConfig.supabase_anon_key) {
          testSupabaseConnection(parsedConfig)
        }
        if (parsedConfig.openai_api_key) {
          testOpenAIConnection(parsedConfig)
        }
      } else {
        // Valeurs par défaut
        setConfig({
          supabase_url: 'https://clcpszhztwfhnvirexao.supabase.co',
          supabase_anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY3Bzemh6dHdmaG52aXJleGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzY1NDIsImV4cCI6MjA3MTQ1MjU0Mn0.PWnQqh6lKQKKO8-9_GoyzWxKLNVxWsVWoZ-fdMPb2HA',
          openai_api_key: ''
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error)
    }
  }

  const saveConfig = async () => {
    try {
      setLoading(true)
      
      // Sauvegarder en localStorage
      localStorage.setItem('api_config', JSON.stringify(config))
      
      // Sauvegarder les variables d'environnement côté serveur
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        setMessage('Configuration sauvegardée avec succès !')
        // Tester les connexions après sauvegarde
        testAllConnections()
      } else {
        setMessage('Erreur lors de la sauvegarde côté serveur, mais sauvé localement')
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      setMessage('Configuration sauvegardée localement')
    } finally {
      setLoading(false)
    }
  }

  const testSupabaseConnection = async (configToTest = config) => {
    setStatus(prev => ({ ...prev, supabase: 'testing' }))
    
    try {
      const response = await fetch('/api/test-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: configToTest.supabase_url,
          key: configToTest.supabase_anon_key
        }),
      })

      if (response.ok) {
        setStatus(prev => ({ ...prev, supabase: 'connected' }))
      } else {
        setStatus(prev => ({ ...prev, supabase: 'error' }))
      }
    } catch (error) {
      console.error('Test Supabase échoué:', error)
      setStatus(prev => ({ ...prev, supabase: 'error' }))
    }
  }

  const testOpenAIConnection = async (configToTest = config) => {
    setStatus(prev => ({ ...prev, openai: 'testing' }))
    
    try {
      const response = await fetch('/api/test-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: configToTest.openai_api_key
        }),
      })

      if (response.ok) {
        setStatus(prev => ({ ...prev, openai: 'connected' }))
      } else {
        setStatus(prev => ({ ...prev, openai: 'error' }))
      }
    } catch (error) {
      console.error('Test OpenAI échoué:', error)
      setStatus(prev => ({ ...prev, openai: 'error' }))
    }
  }

  const testAllConnections = () => {
    testSupabaseConnection()
    testOpenAIConnection()
  }

  const getStatusIcon = (statusType: 'testing' | 'connected' | 'error' | 'idle') => {
    switch (statusType) {
      case 'testing':
        return <AlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (statusType: 'testing' | 'connected' | 'error' | 'idle') => {
    switch (statusType) {
      case 'testing':
        return 'Test en cours...'
      case 'connected':
        return 'Connecté'
      case 'error':
        return 'Erreur de connexion'
      default:
        return 'Non testé'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-gray-900">Configuration des API</h1>
      </div>

      {/* Supabase Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Supabase</span>
                {getStatusIcon(status.supabase)}
              </CardTitle>
              <CardDescription>
                Configuration de la base de données Supabase
              </CardDescription>
            </div>
            <div className="text-sm text-gray-600">
              {getStatusText(status.supabase)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">URL du projet</label>
            <Input
              placeholder="https://votre-projet.supabase.co"
              value={config.supabase_url}
              onChange={(e) => setConfig(prev => ({ ...prev, supabase_url: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Clé anonyme (anon key)</label>
            <Input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={config.supabase_anon_key}
              onChange={(e) => setConfig(prev => ({ ...prev, supabase_anon_key: e.target.value }))}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => testSupabaseConnection()}
            disabled={!config.supabase_url || !config.supabase_anon_key}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Tester la connexion
          </Button>
        </CardContent>
      </Card>

      {/* OpenAI Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>OpenAI</span>
                {getStatusIcon(status.openai)}
              </CardTitle>
              <CardDescription>
                Configuration de l'API OpenAI pour les embeddings et le chat
              </CardDescription>
            </div>
            <div className="text-sm text-gray-600">
              {getStatusText(status.openai)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Clé API OpenAI</label>
            <Input
              type="password"
              placeholder="sk-proj-..."
              value={config.openai_api_key}
              onChange={(e) => setConfig(prev => ({ ...prev, openai_api_key: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Obtenez votre clé sur <a href="https://platform.openai.com/api-keys" target="_blank" className="text-gray-700 hover:underline">platform.openai.com</a>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => testOpenAIConnection()}
            disabled={!config.openai_api_key}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Tester la connexion
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <Button
              onClick={saveConfig}
              disabled={loading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
            </Button>
            <Button
              variant="outline"
              onClick={testAllConnections}
              disabled={!config.supabase_url || !config.supabase_anon_key || !config.openai_api_key}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Tester tout
            </Button>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded ${
              message.includes('succès') 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">État des connexions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>Supabase:</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.supabase)}
                  <span>{getStatusText(status.supabase)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>OpenAI:</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.openai)}
                  <span>{getStatusText(status.openai)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
