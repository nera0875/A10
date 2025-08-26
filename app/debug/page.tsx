'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface DebugTest {
  name: string
  status: 'success' | 'error'
  data?: any
  error?: string
}

interface DebugResult {
  timestamp: string
  tests: DebugTest[]
}

export default function DebugPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DebugResult | null>(null)

  const runDebugTests = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setResults(data)
      console.log('Tests de debug terminés')
    } catch (error: any) {
      console.error(`Erreur lors des tests: ${error.message}`)
      console.error('Erreur debug:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">Succès</span>
      case 'error':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Erreur</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Inconnu</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debug MEMORY</h1>
          <p className="text-gray-600">Diagnostics et tests de l&apos;application de chat RAG</p>
        </div>

        <div className="mb-6">
          <Button 
            onClick={runDebugTests} 
            disabled={loading}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tests en cours...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Lancer les tests
              </>
            )}
          </Button>
        </div>

        {results && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Résultats des tests</h2>
                <div className="text-sm text-gray-500">
                  {new Date(results.timestamp).toLocaleString('fr-FR')}
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.tests.map((test, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getStatusIcon(test.status)}
                          {test.name}
                        </CardTitle>
                        {getStatusBadge(test.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {test.status === 'error' && test.error && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-red-600 mb-1">Erreur:</p>
                          <p className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-200">
                            {test.error}
                          </p>
                        </div>
                      )}
                      
                      {test.data && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Données:</p>
                          <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">
                              {JSON.stringify(test.data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Résumé</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {results.tests.filter(t => t.status === 'success').length}
                  </div>
                  <div className="text-sm text-green-700">Tests réussis</div>
                </div>
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    {results.tests.filter(t => t.status === 'error').length}
                  </div>
                  <div className="text-sm text-red-700">Tests échoués</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="text-2xl font-bold text-gray-600">
                    {results.tests.length}
                  </div>
                  <div className="text-sm text-gray-700">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!results && !loading && (
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle>Aucun test exécuté</CardTitle>
              <CardDescription>
                Cliquez sur &quot;Lancer les tests&quot; pour diagnostiquer l&apos;application.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}