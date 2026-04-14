'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createTarefa, updateTarefa, type TarefaPayload } from '@/actions/tarefas'
import { maskProcesso } from '@/lib/utils/processoMask'
import { maskDate, dateToISO, isoToDisplay } from '@/lib/utils/dateMask'
import { toTitleCase } from '@/lib/utils/titleCase'
import { Loader2, ArrowLeft } from 'lucide-react'
import type { Tarefa, TipoTarefa, Profile, ColunaCustomizada } from '@/types'
import Link from 'next/link'

interface TarefaFormProps {
  unidadeId: string
  tiposTarefa: TipoTarefa[]
  executores: Profile[]
  colunas: ColunaCustomizada[]
  tarefa?: Tarefa  // If provided, edit mode
}

export function TarefaForm({
  unidadeId,
  tiposTarefa,
  executores,
  colunas,
  tarefa,
}: TarefaFormProps) {
  const router = useRouter()
  const isEdit = !!tarefa
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    numero_processo: tarefa?.numero_processo ?? '',
    assistido: tarefa?.assistido ?? '',
    data_intimacao: tarefa ? isoToDisplay(tarefa.data_intimacao) : '',
    tipo_tarefa_id: tarefa?.tipo_tarefa_id ?? '',
    prazo_final_pje: tarefa ? isoToDisplay(tarefa.prazo_final_pje) : '',
    prazo_interno: tarefa ? isoToDisplay(tarefa.prazo_interno.split('T')[0]) : '',
    executor_id: tarefa?.executor_id ?? '',
  })

  const [valoresCustomizados, setValoresCustomizados] = useState<Record<string, string>>(
    tarefa?.valores_customizados?.reduce(
      (acc, v) => ({ ...acc, [v.coluna_id]: v.valor ?? '' }),
      {}
    ) ?? {}
  )

  function handleProcessoInput(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({
      ...prev,
      numero_processo: maskProcesso(e.target.value),
    }))
  }

  function handleDateInput(field: keyof typeof formData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: maskDate(e.target.value),
      }))
    }
  }

  function handleAssistidoBlur() {
    setFormData((prev) => ({
      ...prev,
      assistido: toTitleCase(prev.assistido),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload: TarefaPayload = {
      unidade_id: unidadeId,
      numero_processo: formData.numero_processo,
      assistido: formData.assistido,
      data_intimacao: dateToISO(formData.data_intimacao),
      tipo_tarefa_id: formData.tipo_tarefa_id || undefined,
      prazo_final_pje: dateToISO(formData.prazo_final_pje),
      prazo_interno: dateToISO(formData.prazo_interno) + 'T17:00:00',
      executor_id: formData.executor_id || undefined,
      valores_customizados: valoresCustomizados,
    }

    let result
    if (isEdit && tarefa) {
      result = await updateTarefa(tarefa.id, payload)
    } else {
      result = await createTarefa(payload)
    }

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(`/unidades/${unidadeId}`)
    router.refresh()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/unidades/${unidadeId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Processo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Número do Processo */}
            <div className="space-y-2">
              <Label htmlFor="numero_processo">Número do Processo *</Label>
              <Input
                id="numero_processo"
                value={formData.numero_processo}
                onChange={handleProcessoInput}
                placeholder="0000000-00.0000.0.00.0000"
                className="font-mono"
                required
              />
              <p className="text-xs text-gray-400">Formato CNJ — máscara automática</p>
            </div>

            {/* Assistido */}
            <div className="space-y-2">
              <Label htmlFor="assistido">Assistido *</Label>
              <Input
                id="assistido"
                value={formData.assistido}
                onChange={(e) => setFormData((p) => ({ ...p, assistido: e.target.value }))}
                onBlur={handleAssistidoBlur}
                placeholder="Nome do assistido"
                required
              />
              <p className="text-xs text-gray-400">Será convertido automaticamente para Title Case</p>
            </div>

            {/* Data Intimação */}
            <div className="space-y-2">
              <Label htmlFor="data_intimacao">Data da Intimação *</Label>
              <Input
                id="data_intimacao"
                value={formData.data_intimacao}
                onChange={handleDateInput('data_intimacao')}
                placeholder="00/00/0000"
                required
              />
            </div>

            {/* Tipo de Tarefa */}
            <div className="space-y-2">
              <Label htmlFor="tipo_tarefa_id">Tipo de Petição</Label>
              <Select
                value={formData.tipo_tarefa_id}
                onValueChange={(v) => setFormData((p) => ({ ...p, tipo_tarefa_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposTarefa.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Prazos e Atribuição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prazo Final PJE */}
            <div className="space-y-2">
              <Label htmlFor="prazo_final_pje">Prazo Final PJE *</Label>
              <Input
                id="prazo_final_pje"
                value={formData.prazo_final_pje}
                onChange={handleDateInput('prazo_final_pje')}
                placeholder="00/00/0000"
                required
              />
            </div>

            {/* Prazo Interno */}
            <div className="space-y-2">
              <Label htmlFor="prazo_interno">Prazo Interno *</Label>
              <Input
                id="prazo_interno"
                value={formData.prazo_interno}
                onChange={handleDateInput('prazo_interno')}
                placeholder="00/00/0000"
                required
              />
              <p className="text-xs text-gray-400">
                Controla o semáforo de alertas visuais e notificações
              </p>
            </div>

            {/* Executor */}
            <div className="space-y-2">
              <Label htmlFor="executor_id">Executor</Label>
              <Select
                value={formData.executor_id}
                onValueChange={(v) => setFormData((p) => ({ ...p, executor_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o executor..." />
                </SelectTrigger>
                <SelectContent>
                  {executores.map((exec) => (
                    <SelectItem key={exec.id} value={exec.id}>
                      {exec.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Custom columns */}
        {colunas.filter((c) => c.ativo).length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Campos Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {colunas
                .filter((c) => c.ativo)
                .sort((a, b) => a.ordem - b.ordem)
                .map((coluna) => (
                  <div key={coluna.id} className="space-y-2">
                    <Label htmlFor={`col_${coluna.id}`}>
                      {coluna.nome}
                      {coluna.obrigatorio && ' *'}
                    </Label>

                    {coluna.tipo === 'lista' && coluna.opcoes ? (
                      <Select
                        value={valoresCustomizados[coluna.id] ?? ''}
                        onValueChange={(v) =>
                          setValoresCustomizados((prev) => ({ ...prev, [coluna.id]: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Selecione ${coluna.nome}...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {coluna.opcoes.map((opcao) => (
                            <SelectItem key={opcao} value={opcao}>
                              {opcao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : coluna.tipo === 'data' ? (
                      <Input
                        id={`col_${coluna.id}`}
                        value={valoresCustomizados[coluna.id] ?? ''}
                        onChange={(e) =>
                          setValoresCustomizados((prev) => ({
                            ...prev,
                            [coluna.id]: maskDate(e.target.value),
                          }))
                        }
                        placeholder="00/00/0000"
                        required={coluna.obrigatorio}
                      />
                    ) : (
                      <Input
                        id={`col_${coluna.id}`}
                        type={coluna.tipo === 'numero' ? 'number' : 'text'}
                        value={valoresCustomizados[coluna.id] ?? ''}
                        onChange={(e) =>
                          setValoresCustomizados((prev) => ({
                            ...prev,
                            [coluna.id]: e.target.value,
                          }))
                        }
                        placeholder={coluna.nome}
                        required={coluna.obrigatorio}
                      />
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : isEdit ? (
              'Salvar Alterações'
            ) : (
              'Criar Tarefa'
            )}
          </Button>
          <Link href={`/unidades/${unidadeId}`}>
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
