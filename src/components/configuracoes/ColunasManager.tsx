'use client'

import { useState } from 'react'
import { createColunaCustomizada, updateColunaCustomizada } from '@/actions/unidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Columns, Plus, Loader2, GripVertical, X } from 'lucide-react'
import type { ColunaCustomizada, ColunaTipo } from '@/types'
import { cn } from '@/lib/utils/cn'

interface ColunasManagerProps {
  unidadeId: string
  colunas: ColunaCustomizada[]
}

const TIPO_LABELS: Record<ColunaTipo, string> = {
  texto: 'Texto',
  numero: 'Número',
  data: 'Data',
  lista: 'Lista de opções',
}

export function ColunasManager({ unidadeId, colunas: initialColunas }: ColunasManagerProps) {
  const [colunas, setColunas] = useState<ColunaCustomizada[]>(initialColunas)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [newColuna, setNewColuna] = useState({
    nome: '',
    tipo: 'texto' as ColunaTipo,
    opcoes: '',
    obrigatorio: false,
  })

  async function handleCreate() {
    if (!newColuna.nome.trim()) return
    setLoading(true)
    setError('')

    const result = await createColunaCustomizada(unidadeId, {
      nome: newColuna.nome.trim(),
      tipo: newColuna.tipo,
      opcoes: newColuna.tipo === 'lista' ? newColuna.opcoes : undefined,
      obrigatorio: newColuna.obrigatorio,
      ordem: colunas.length,
    })

    if (result.error) {
      setError(result.error)
    } else {
      setColunas((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          unidade_id: unidadeId,
          nome: newColuna.nome.trim(),
          tipo: newColuna.tipo,
          opcoes: newColuna.tipo === 'lista' ? newColuna.opcoes.split('\n').filter(Boolean) : null,
          obrigatorio: newColuna.obrigatorio,
          ordem: colunas.length,
          ativo: true,
          created_at: new Date().toISOString(),
        },
      ])
      setNewColuna({ nome: '', tipo: 'texto', opcoes: '', obrigatorio: false })
      setShowForm(false)
    }

    setLoading(false)
  }

  async function handleToggleAtivo(coluna: ColunaCustomizada) {
    await updateColunaCustomizada(coluna.id, unidadeId, {
      nome: coluna.nome,
      ativo: !coluna.ativo,
      obrigatorio: coluna.obrigatorio,
      opcoes: coluna.opcoes?.join('\n'),
      ordem: coluna.ordem,
    })
    setColunas((prev) =>
      prev.map((c) => (c.id === coluna.id ? { ...c, ativo: !c.ativo } : c))
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Columns className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Colunas Customizadas</CardTitle>
              <CardDescription>
                Adicione campos extras à planilha desta unidade
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {showForm ? 'Cancelar' : 'Nova Coluna'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New column form */}
        {showForm && (
          <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700">Nova Coluna</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome da Coluna *</Label>
                <Input
                  value={newColuna.nome}
                  onChange={(e) => setNewColuna((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Número de Guia, Obs..."
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={newColuna.tipo}
                  onValueChange={(v) => setNewColuna((p) => ({ ...p, tipo: v as ColunaTipo }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newColuna.tipo === 'lista' && (
              <div className="space-y-1">
                <Label className="text-xs">Opções (uma por linha)</Label>
                <textarea
                  value={newColuna.opcoes}
                  onChange={(e) => setNewColuna((p) => ({ ...p, opcoes: e.target.value }))}
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newColuna.obrigatorio}
                onChange={(e) => setNewColuna((p) => ({ ...p, obrigatorio: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Campo obrigatório</span>
            </label>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                {error}
              </div>
            )}

            <Button size="sm" onClick={handleCreate} disabled={loading || !newColuna.nome.trim()}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1" />
              )}
              Adicionar Coluna
            </Button>
          </div>
        )}

        {colunas.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm border rounded-lg">
            Nenhuma coluna customizada. Os campos padrão já estão incluídos.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
            {colunas.map((coluna) => (
              <div
                key={coluna.id}
                className={cn(
                  'flex items-center justify-between px-4 py-3 hover:bg-gray-50',
                  !coluna.ativo && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-gray-300" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{coluna.nome}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {TIPO_LABELS[coluna.tipo]}
                      </span>
                      {coluna.obrigatorio && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          Obrigatório
                        </span>
                      )}
                      {!coluna.ativo && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 text-xs',
                    coluna.ativo
                      ? 'text-gray-400 hover:text-red-600'
                      : 'text-green-600 hover:text-green-700'
                  )}
                  onClick={() => handleToggleAtivo(coluna)}
                >
                  {coluna.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
