'use client'

import { useState, useEffect } from 'react'
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
import { calcPrazoFinal } from '@/lib/utils/workdays'
import { Loader2, ArrowLeft, CalendarCheck } from 'lucide-react'
import type { Tarefa, TipoTarefa, Profile, ColunaCustomizada, CampoLabel } from '@/types'
import Link from 'next/link'

interface TarefaFormProps {
  unidadeId: string
  tiposTarefa: TipoTarefa[]
  executores: Profile[]
  colunas: ColunaCustomizada[]
  tarefa?: Tarefa
  campoLabels?: CampoLabel[]
  isOverdue?: boolean
}

function getLabel(campoLabels: CampoLabel[] | undefined, campo: string, defaultLabel: string) {
  return campoLabels?.find((cl) => cl.campo === campo)?.label ?? defaultLabel
}

export function TarefaForm({
  unidadeId,
  tiposTarefa,
  executores,
  colunas,
  tarefa,
  campoLabels,
  isOverdue = false,
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
    inicio: tarefa?.inicio ? isoToDisplay(tarefa.inicio) : '',
    prazo_dias: tarefa?.prazo_dias ? String(tarefa.prazo_dias) : '',
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

  // Auto-calculate prazo_final_pje when inicio or prazo_dias changes
  useEffect(() => {
    const dias = parseInt(formData.prazo_dias, 10)
    if (formData.inicio && dias > 0) {
      const calc = calcPrazoFinal(formData.inicio, dias)
      if (calc) {
        setFormData((prev) => ({ ...prev, prazo_final_pje: calc }))
        // Also pre-fill prazo_interno if still empty
        setFormData((prev) => ({
          ...prev,
          prazo_final_pje: calc,
          prazo_interno: prev.prazo_interno || calc,
        }))
      }
    }
  }, [formData.inicio, formData.prazo_dias])

  function handleProcessoInput(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, numero_processo: maskProcesso(e.target.value) }))
  }

  function handleDateInput(field: keyof typeof formData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: maskDate(e.target.value) }))
    }
  }

  function handleTextBlur(field: keyof typeof formData) {
    return () => {
      setFormData((prev) => ({ ...prev, [field]: toTitleCase(prev[field]) }))
    }
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
      inicio: formData.inicio ? dateToISO(formData.inicio) : undefined,
      prazo_dias: formData.prazo_dias ? parseInt(formData.prazo_dias, 10) : undefined,
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

  const lbl = (campo: string, def: string) => getLabel(campoLabels, campo, def)

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

      {isOverdue && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          Esta tarefa está <strong>vencida</strong>. Apenas o Defensor pode editá-la.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Processo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Número do Processo */}
            <div className="space-y-2">
              <Label htmlFor="numero_processo">{lbl('numero_processo', 'Nº Processo')} *</Label>
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
              <Label htmlFor="assistido">{lbl('assistido', 'Assistido')} *</Label>
              <Input
                id="assistido"
                value={formData.assistido}
                onChange={(e) => setFormData((p) => ({ ...p, assistido: e.target.value }))}
                onBlur={handleTextBlur('assistido')}
                placeholder="Nome do assistido"
                required
              />
            </div>

            {/* Data do Ciente */}
            <div className="space-y-2">
              <Label htmlFor="data_intimacao">{lbl('data_intimacao', 'Data do Ciente')} *</Label>
              <Input
                id="data_intimacao"
                value={formData.data_intimacao}
                onChange={handleDateInput('data_intimacao')}
                placeholder="00/00/0000"
                required
              />
            </div>

            {/* Tipo de Petição */}
            <div className="space-y-2">
              <Label htmlFor="tipo_tarefa_id">{lbl('tipo_tarefa', 'Petição')}</Label>
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
            {/* Início */}
            <div className="space-y-2">
              <Label htmlFor="inicio">{lbl('inicio', 'Início')}</Label>
              <Input
                id="inicio"
                value={formData.inicio}
                onChange={handleDateInput('inicio')}
                placeholder="00/00/0000"
              />
              <p className="text-xs text-gray-400">Data de início para contagem do prazo</p>
            </div>

            {/* Prazo (dias) */}
            <div className="space-y-2">
              <Label htmlFor="prazo_dias">{lbl('prazo_dias', 'Prazo (dias)')}</Label>
              <Input
                id="prazo_dias"
                type="number"
                min={1}
                max={365}
                value={formData.prazo_dias}
                onChange={(e) => setFormData((p) => ({ ...p, prazo_dias: e.target.value }))}
                placeholder="Ex: 5"
              />
              <p className="text-xs text-gray-400">Dias úteis — inclui o dia de Início</p>
            </div>

            {/* Final do Prazo (auto-calculado) */}
            <div className="space-y-2">
              <Label htmlFor="prazo_final_pje" className="flex items-center gap-2">
                {lbl('prazo_final_pje', 'Final do Prazo')} *
                {formData.inicio && formData.prazo_dias && (
                  <span className="text-xs text-blue-600 font-normal flex items-center gap-1">
                    <CalendarCheck className="h-3 w-3" />
                    calculado automaticamente
                  </span>
                )}
              </Label>
              <Input
                id="prazo_final_pje"
                value={formData.prazo_final_pje}
                onChange={handleDateInput('prazo_final_pje')}
                placeholder="00/00/0000"
                required
                className={formData.inicio && formData.prazo_dias ? 'bg-blue-50 border-blue-200' : ''}
              />
              <p className="text-xs text-gray-400">
                Calculado a partir de Início + Prazo (dias úteis, sem sábado, domingo ou feriados)
              </p>
            </div>

            {/* Prazo Interno */}
            <div className="space-y-2">
              <Label htmlFor="prazo_interno">{lbl('prazo_interno', 'Prazo Interno')} *</Label>
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

            {/* Responsável */}
            <div className="space-y-2">
              <Label htmlFor="executor_id">{lbl('executor', 'Responsável')}</Label>
              <Select
                value={formData.executor_id}
                onValueChange={(v) => setFormData((p) => ({ ...p, executor_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável..." />
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
                      {coluna.nome}{coluna.obrigatorio && ' *'}
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
                            <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
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
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
            ) : isEdit ? 'Salvar Alterações' : 'Criar Tarefa'}
          </Button>
          <Link href={`/unidades/${unidadeId}`}>
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
