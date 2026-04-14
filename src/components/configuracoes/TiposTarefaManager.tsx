'use client'

import { useState } from 'react'
import { createTipoTarefa, updateTipoTarefa } from '@/actions/unidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Plus, Loader2, Check, X, Pencil } from 'lucide-react'
import type { TipoTarefa } from '@/types'
import { cn } from '@/lib/utils/cn'

interface TiposTarefaManagerProps {
  unidadeId: string
  tipos: TipoTarefa[]
}

export function TiposTarefaManager({ unidadeId, tipos: initialTipos }: TiposTarefaManagerProps) {
  const [tipos, setTipos] = useState<TipoTarefa[]>(initialTipos)
  const [newNome, setNewNome] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNome, setEditingNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!newNome.trim()) return
    setLoading(true)
    setError('')

    const result = await createTipoTarefa(unidadeId, newNome.trim())
    if (result.error) {
      setError(result.error)
    } else {
      // Optimistic: add to list with temp id
      setTipos((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, unidade_id: unidadeId, nome: newNome.trim(), ativo: true, created_at: new Date().toISOString() },
      ])
      setNewNome('')
    }

    setLoading(false)
  }

  async function handleUpdate(tipo: TipoTarefa, novoNome: string, ativo: boolean) {
    await updateTipoTarefa(tipo.id, unidadeId, novoNome, ativo)
    setTipos((prev) =>
      prev.map((t) => (t.id === tipo.id ? { ...t, nome: novoNome, ativo } : t))
    )
    setEditingId(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Tipos de Petição</CardTitle>
            <CardDescription>
              Configure os tipos de tarefa disponíveis nesta unidade
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new type */}
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Recurso, Contestação, Habeas Corpus..."
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={loading || !newNome.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1">Adicionar</span>
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}

        {tipos.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm border rounded-lg">
            Nenhum tipo de petição cadastrado
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
            {tipos.map((tipo) => (
              <div
                key={tipo.id}
                className={cn(
                  'flex items-center justify-between px-4 py-3',
                  !tipo.ativo && 'opacity-50 bg-gray-50'
                )}
              >
                {editingId === tipo.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Input
                      value={editingNome}
                      onChange={(e) => setEditingNome(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdate(tipo, editingNome, tipo.ativo)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{tipo.nome}</span>
                      {!tipo.ativo && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-gray-700"
                        onClick={() => {
                          setEditingId(tipo.id)
                          setEditingNome(tipo.nome)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-8 text-xs',
                          tipo.ativo
                            ? 'text-gray-400 hover:text-red-600'
                            : 'text-green-600 hover:text-green-700'
                        )}
                        onClick={() => handleUpdate(tipo, tipo.nome, !tipo.ativo)}
                      >
                        {tipo.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
