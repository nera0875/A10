'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Memory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { formatDate, truncateText } from '@/lib/utils'

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [newMemory, setNewMemory] = useState('')
  const supabase = createClient()

  const fetchMemories = useCallback(async () => {
    try {
      const response = await fetch('/api/memories')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des mémoires')
      }
      
      const data = await response.json()
      setMemories(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des mémoires:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMemories()
      return
    }

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery,
          type: 'memories'
        }),
      })

      if (response.ok) {
        const results = await response.json()
        setMemories(results.map((r: any) => ({
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          updated_at: r.updated_at,
          user_id: r.user_id
        })))
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
    }
  }

  const saveMemory = async () => {
    if (!newMemory.trim()) return

    try {
      if (editingMemory) {
        // Mise à jour d'une mémoire existante
        const response = await fetch('/api/memories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: editingMemory.id,
            content: newMemory
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erreur lors de la mise à jour')
        }
      } else {
        // Création d'une nouvelle mémoire
        const response = await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newMemory }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erreur lors de la création')
        }
      }

      setNewMemory('')
      setEditingMemory(null)
      setShowForm(false)
      fetchMemories()
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur: ' + (error as Error).message)
    }
  }

  const deleteMemory = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mémoire ?')) return

    try {
      const response = await fetch(`/api/memories?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }
      
      fetchMemories()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur: ' + (error as Error).message)
    }
  }

  const startEdit = (memory: Memory) => {
    setEditingMemory(memory)
    setNewMemory(memory.content)
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingMemory(null)
    setNewMemory('')
    setShowForm(false)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mes Mémoires</h1>
        <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          <span className="sm:inline">Nouvelle mémoire</span>
        </Button>
      </div>

      {/* Recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Recherche sémantique</CardTitle>
          <CardDescription>
            Recherchez dans vos mémoires par similarité de sens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Que recherchez-vous ?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1 sm:flex-none">
                <Search className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Rechercher</span>
              </Button>
              <Button variant="outline" onClick={() => {
                setSearchQuery('')
                fetchMemories()
              }} className="flex-1 sm:flex-none">
                <span className="text-xs sm:text-sm">Réinitialiser</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'ajout/édition */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingMemory ? 'Modifier la mémoire' : 'Nouvelle mémoire'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Décrivez votre mémoire..."
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                rows={4}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={saveMemory} className="w-full sm:w-auto">
                  {editingMemory ? 'Mettre à jour' : 'Ajouter'}
                </Button>
                <Button variant="outline" onClick={cancelEdit} className="w-full sm:w-auto">
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des mémoires */}
      <div className="grid gap-4">
        {memories.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                Aucune mémoire trouvée. Commencez par en créer une !
              </p>
            </CardContent>
          </Card>
        ) : (
          memories.map((memory) => (
            <Card key={memory.id}>
              <CardContent className="pt-4 sm:pt-6">
                <div className="space-y-3">
                  <div className="flex-1">
                    <p className="text-gray-900 mb-2 text-sm sm:text-base leading-relaxed">
                      {truncateText(memory.content, 300)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Créé le {formatDate(memory.created_at)}
                      {memory.updated_at !== memory.created_at && 
                        ` • Modifié le ${formatDate(memory.updated_at)}`
                      }
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(memory)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Modifier</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMemory(memory.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Supprimer</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
