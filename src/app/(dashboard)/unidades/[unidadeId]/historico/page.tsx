import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, History, Clock, User, FileText } from 'lucide-react'
import { CAMPO_DEFAULTS } from '@/types'

interface PageProps {
  params: { unidadeId: string }
}

interface TarefaLog {
  id: string
  tarefa_id: string
  changed_by: string | null
  old_status: string | null
  new_status: string
  tipo_alteracao: string
  campos_alterados: Record<string, { antes: unknown; depois: unknown }> | null
  created_at: string
  tarefa: { numero_processo: string; assistido: string } | null
  changer: { full_name: string; email: string } | null
}

function formatValue(campo: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '(vazio)'
  return String(value)
}

function getCampoLabel(campo: string): string {
  return CAMPO_DEFAULTS[campo] ?? campo
}

export default async function HistoricoPage({ params }: PageProps) {
  const { unidadeId } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'defensor') redirect(`/unidades/${unidadeId}`)

  const { data: unidade } = await supabase
    .from('unidades')
    .select('nome')
    .eq('id', unidadeId)
    .single()

  if (!unidade) redirect('/unidades')

  const { data: tarefaIds } = await supabase
    .from('tarefas')
    .select('id')
    .eq('unidade_id', unidadeId)

  const ids = (tarefaIds ?? []).map((t) => t.id)

  const { data: logs } = ids.length === 0 ? { data: [] } : await supabase
    .from('tarefa_logs')
    .select(`
      id,
      tarefa_id,
      changed_by,
      old_status,
      new_status,
      tipo_alteracao,
      campos_alterados,
      created_at,
      tarefa:tarefas(numero_processo, assistido),
      changer:profiles!tarefa_logs_changed_by_fkey(full_name, email)
    `)
    .eq('tipo_alteracao', 'edicao')
    .in('tarefa_id', ids)
    .order('created_at', { ascending: false })
    .limit(200)

  const typedLogs = (logs ?? []) as unknown as TarefaLog[]

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/unidades/${unidadeId}/configuracoes`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Configurações
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Histórico de Alterações</h1>
              <p className="text-gray-500 text-sm">{unidade.nome}</p>
            </div>
          </div>
        </div>
      </div>

      {typedLogs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">
          Nenhuma alteração registrada pelos gestores ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {typedLogs.map((log) => {
            const campos = log.campos_alterados ?? {}
            const camposList = Object.entries(campos)
            const date = new Date(log.created_at)
            const dateStr = date.toLocaleDateString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })

            return (
              <div
                key={log.id}
                className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/unidades/${unidadeId}/tarefas/${log.tarefa_id}/editar`}
                        className="font-medium text-gray-900 hover:text-blue-600 font-mono text-sm"
                      >
                        {log.tarefa?.numero_processo ?? log.tarefa_id}
                      </Link>
                      <p className="text-sm text-gray-500 truncate">
                        {log.tarefa?.assistido ?? ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-500 justify-end">
                      <User className="h-3.5 w-3.5" />
                      <span>{log.changer?.full_name ?? log.changed_by ?? 'Desconhecido'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 justify-end mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>

                {camposList.length > 0 && (
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 w-1/4">Campo</th>
                          <th className="px-3 py-2 text-left font-semibold text-red-500 w-[37.5%]">Antes</th>
                          <th className="px-3 py-2 text-left font-semibold text-green-600 w-[37.5%]">Depois</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {camposList.map(([campo, { antes, depois }]) => (
                          <tr key={campo}>
                            <td className="px-3 py-2 font-medium text-gray-700">
                              {getCampoLabel(campo)}
                            </td>
                            <td className="px-3 py-2 text-red-600 bg-red-50">
                              {formatValue(campo, antes)}
                            </td>
                            <td className="px-3 py-2 text-green-700 bg-green-50">
                              {formatValue(campo, depois)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
