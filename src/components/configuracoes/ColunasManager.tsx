'use client'

import { useState } from 'react'
import {
  createColunaCustomizada,
  saveColunasLayout,
  deleteColunaCustomizada,
} from '@/actions/unidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Columns,
  Plus,
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  Save,
  RotateCcw,
} from 'lucide-react'
import type { ColunaCustomizada, ColunaTipo, Unidade } from '@/types'
import {
  DEFAULT_COLUMN_LABELS,
  isDefaultColumnKey,
  buildEffectiveLayout,
} from '@/lib/config/colunas'

interface ColunasManagerProps {
  unidade: Unidade
  colunas: ColunaCustomizada[]
}

const TIPO_LABELS: Record<ColunaTipo, string> = {
  texto: 'Texto',
  numero: 'Número',
  data: 'Data',
  lista: 'Lista de opções',
}

type ColumnItem =
  | { kind: 'default'; key: string; label: string }
  | { kind: 'custom'; coluna: ColunaCustomizada }

function itemId(item: ColumnItem): string {
  return item.kind === 'default' ? item.kind + ':' + item.key : item.coluna.id
}

function itemLabel(item: ColumnItem): string {
  return item.kind === 'default' ? item.label : item.coluna.nome
}

function layoutToItems(layout: string[], colunas: ColunaCustomizada[]): ColumnItem[] {
  const items: ColumnItem[] = []
  for (const key of layout) {
    if (isDefaultColumnKey(key)) {
      items.push({ kind: 'default', key, label: DEFAULT_COLUMN_LABELS[key] })
    } else {
      const col = colunas.find((c) => c.id === key && c.ativo)
      if (col) items.push({ kind: 'custom', coluna: col })
    }
  }
  return items
}

function itemsToLayout(items: ColumnItem[]): string[] {
  return items.map((item) => (item.kind === 'default' ? item.key : item.coluna.id))
}

export function ColunasManager({ unidade, colunas: initialColunas }: ColunasManagerProps) {
  const [colunas, setColunas] = useState<ColunaCustomizada[]>(initialColunas)

  // Build initial layout
  const [layout, setLayout] = useState<ColumnItem[]>(() => {
    const activeIds = initialColunas.filter((c) => c.ativo).sort((a, b) => a.ordem - b.ordem).map((c) => c.id)
    const effective = buildEffectiveLayout(unidade.colunas_layout, activeIds)
    return layoutToItems(effective, initialColunas)
  })

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [error, setError] = useState('')

  const [newColuna, setNewColuna] = useState({
    nome: '',
    tipo: 'texto' as ColunaTipo,
    opcoes: '',
    obrigatorio: false,
  })

  function moveUp(index: number) {
    if (index === 0) return
    setLayout((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setSaveMsg('')
  }

  function moveDown(index: number) {
    if (index === layout.length - 1) return
    setLayout((prev) => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
    setSaveMsg('')
  }

  function removeItem(index: number) {
    setLayout((prev) => prev.filter((_, i) => i !== index))
    setSaveMsg('')
  }

  function resetLayout() {
    const activeIds = colunas.filter((c) => c.ativo).sort((a, b) => a.ordem - b.ordem).map((c) => c.id)
    const effective = buildEffectiveLayout(null, activeIds)
    setLayout(layoutToItems(effective, colunas))
    setSaveMsg('')
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    const result = await saveColunasLayout(unidade.id, itemsToLayout(layout))
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSaveMsg('Salvo!')
      setTimeout(() => setSaveMsg(''), 2500)
    }
  }

  async function handleDeleteCustom(item: ColumnItem & { kind: 'custom' }, index: number) {
    if (!confirm(`Excluir a coluna "${item.coluna.nome}"? Os dados existentes serão mantidos mas não aparecerão mais.`)) return
    const result = await deleteColunaCustomizada(item.coluna.id, unidade.id)
    if (result.error) { setError(result.error); return }
    // Remove from layout and from colunas list
    removeItem(index)
    setColunas((prev) => prev.filter((c) => c.id !== item.coluna.id))
    // Save new layout immediately
    const newLayout = layout.filter((_, i) => i !== index)
    await saveColunasLayout(unidade.id, itemsToLayout(newLayout))
  }

  async function handleCreate() {
    if (!newColuna.nome.trim()) return
    setSaving(true)
    setError('')

    const result = await createColunaCustomizada(unidade.id, {
      nome: newColuna.nome.trim(),
      tipo: newColuna.tipo,
      opcoes: newColuna.tipo === 'lista' ? newColuna.opcoes : undefined,
      obrigatorio: newColuna.obrigatorio,
      ordem: colunas.length,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    const newCol: ColunaCustomizada = {
      id: result.id ?? `temp-${Date.now()}`,
      unidade_id: unidade.id,
      nome: newColuna.nome.trim(),
      tipo: newColuna.tipo,
      opcoes: newColuna.tipo === 'lista' ? newColuna.opcoes.split('\n').filter(Boolean) : null,
      obrigatorio: newColuna.obrigatorio,
      ordem: colunas.length,
      ativo: true,
      created_at: new Date().toISOString(),
    }

    const updatedColunas = [...colunas, newCol]
    setColunas(updatedColunas)

    const newItem: ColumnItem = { kind: 'custom', coluna: newCol }
    const newLayout = [...layout, newItem]
    setLayout(newLayout)

    // Persist layout with new column appended
    await saveColunasLayout(unidade.id, itemsToLayout(newLayout))

    setNewColuna({ nome: '', tipo: 'texto', opcoes: '', obrigatorio: false })
    setShowForm(false)
    setSaving(false)
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
              <CardTitle>Colunas da Planilha</CardTitle>
              <CardDescription>
                Ordene, remova ou adicione colunas. A coluna &ldquo;Ações&rdquo; é sempre a última.
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={resetLayout} title="Restaurar ordem padrão">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
              {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {showForm ? 'Cancelar' : 'Nova Coluna'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New column form */}
        {showForm && (
          <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700">Nova Coluna Personalizada</h4>

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

            <Button size="sm" onClick={handleCreate} disabled={saving || !newColuna.nome.trim()}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1" />
              )}
              Adicionar Coluna
            </Button>
          </div>
        )}

        {/* Column list */}
        <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
          {layout.map((item, index) => (
            <div
              key={itemId(item)}
              className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 bg-white"
            >
              {/* Move buttons */}
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === layout.length - 1}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Column info */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {itemLabel(item)}
                </span>
                {item.kind === 'default' ? (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                    Padrão
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {TIPO_LABELS[item.coluna.tipo]}
                  </span>
                )}
              </div>

              {/* Remove/delete button */}
              {item.kind === 'default' ? (
                <button
                  onClick={() => removeItem(index)}
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0 p-1"
                  title="Remover desta unidade"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleDeleteCustom(item as ColumnItem & { kind: 'custom' }, index)}
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0 p-1"
                  title="Excluir coluna"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {/* Actions column (always last, not moveable) */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 opacity-50">
            <div className="w-8 shrink-0" />
            <span className="text-sm font-medium text-gray-500">Ações</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              Fixo
            </span>
          </div>
        </div>

        {error && !showForm && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {error}
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            Salvar Ordem
          </Button>
          {saveMsg && (
            <span className="text-sm text-green-600">{saveMsg}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
