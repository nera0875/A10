'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Document } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const fetchDocuments = useCallback(async () => {
    if (!supabase) return
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Vérifier le type de fichier
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown']
    if (!allowedTypes.includes(file.type)) {
      alert('Type de fichier non supporté. Veuillez choisir un PDF, TXT ou MD.')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload')
      }

      const result = await response.json()
      console.log('Document traité:', result)
      
      // Recharger la liste des documents
      fetchDocuments()
      
      // Réinitialiser l'input
      event.target.value = ''
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      alert('Erreur lors du traitement du document')
    } finally {
      setUploading(false)
    }
  }

  const deleteDocument = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document et tous ses chunks ?')) return
    if (!supabase) return

    try {
      // Supprimer d'abord les chunks
      await supabase
        .from('chunks')
        .delete()
        .eq('document_id', id)

      // Puis supprimer le document
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchDocuments()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mes Documents</h1>
      </div>

      {/* Upload de documents */}
      <Card>
        <CardHeader>
          <CardTitle>Importer un document</CardTitle>
          <CardDescription>
            Importez des fichiers PDF, TXT ou Markdown. Ils seront automatiquement chunked et indexés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Input
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileUpload}
              disabled={uploading}
              className="w-full file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
            {uploading && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Traitement en cours...</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Formats supportés: PDF, TXT, Markdown (max 10MB)
          </p>
        </CardContent>
      </Card>

      {/* Liste des documents */}
      <div className="grid gap-4">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                Aucun document importé. Commencez par en ajouter un !
              </p>
            </CardContent>
          </Card>
        ) : (
          documents.map((document) => (
            <Card key={document.id}>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex items-start space-x-2 sm:space-x-3 flex-1">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 mt-0.5 sm:mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{document.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mt-1">
                        <span>{document.file_type.toUpperCase()}</span>
                        <span>{formatFileSize(document.file_size)}</span>
                        <span className="hidden sm:inline">Importé le {formatDate(document.created_at)}</span>
                        <span className="sm:hidden">{new Date(document.created_at).toLocaleDateString()}</span>
                      </div>
                      {document.content && (
                        <p className="text-gray-600 text-xs sm:text-sm mt-2 line-clamp-2">
                          {document.content.substring(0, 200)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteDocument(document.id)}
                    className="self-end sm:self-start"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="ml-2 sm:hidden">Supprimer</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
