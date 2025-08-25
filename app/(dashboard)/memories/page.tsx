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
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMemories(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des mémoires:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

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
      let result
      if (editingMemory) {
        result = await supabase
          .from('memories')
          .update({ 
            content: newMemory,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMemory.id)
      } else {
        result = await supabase
          .from('memories')
          .insert([{ content: newMemory }])
      }

      if (result.error) throw result.error

      // Générer l'embedding pour la nouvelle mémoire
      await fetch('/api/memories/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newMemory,
          memoryId: editingMemory?.id 
        }),
      })

      setNewMemory('')
      setEditingMemory(null)
      setShowForm(false)
      fetchMemories()
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }
  }

  const deleteMemory = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mémoire ?')) return

    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchMemories()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Mes Mémoires</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle mémoire
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
          <div className="flex space-x-2">
            <Input
              placeholder="Que recherchez-vous ?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => {
              setSearchQuery('')
              fetchMemories()
            }}>
              Réinitialiser
            </Button>
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
              <div className="flex space-x-2">
                <Button onClick={saveMemory}>
                  {editingMemory ? 'Mettre à jour' : 'Ajouter'}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
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
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-gray-900 mb-2">
                      {truncateText(memory.content, 300)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Créé le {formatDate(memory.created_at)}
                      {memory.updated_at !== memory.created_at && 
                        ` • Modifié le ${formatDate(memory.updated_at)}`
                      }
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(memory)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMemory(memory.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
