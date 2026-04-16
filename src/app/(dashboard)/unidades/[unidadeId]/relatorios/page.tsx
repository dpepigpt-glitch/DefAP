import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { calcularSelo, SELO_LABEL, SELO_DESCRIPTION, SELO_COLOR } from '@/lib/utils/badgeCalculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Award, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { Tarefa, Profile } from '@/types'
import { cn } from '@/lib/utils/cn'

interface PageProps {
  params: { unidadeId: string }
}

const SELO_ICONS: Record<string, string> = {
  flamengo: '🔴⚫',
  diamante: '💎',
  ouro: '🥇',
  prata: '🥈',
  bronze: '🥉',
}

export default async function RelatoriosPage({ params }: PageProps) {
  const { unidadeId } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: unidade } = await supabase
    .from('unidades')
    .select('nome')
    .eq('id', unidadeId)
    .single()

  // Get all completed tasks with executor info
  const { data: tarefas } = await supabase
    .from('tarefas')
    .select('*, executor:profiles!executor_id(id, full_name, email)')
    .eq('unidade_id', unidadeId)
    .eq('status', 'protocolado')
    .not('protocolado_at', 'is', null)

  const typedTarefas = (tarefas ?? []) as unknown as Tarefa[]

  // Group tasks by executor
  const byExecutor = typedTarefas.reduce(
    (acc, t) => {
      const execId = t.executor_id ?? 'sem_executor'
      if (!acc[execId]) {
        acc[execId] = { executor: t.executor, tarefas: [] }
      }
      acc[execId].tarefas.push(t)
      return acc
    },
    {} as Record<string, { executor: Profile | undefined; tarefas: Tarefa[] }>
  )

  // Calculate badge for each executor
  const rankings = Object.values(byExecutor)
    .filter((e) => e.executor)
    .map((entry) => ({
      executor: entry.executor!,
      tarefas: entry.tarefas,
      total: entry.tarefas.length,
      noPrazo: entry.tarefas.filter(
        (t) => t.protocolado_at && new Date(t.protocolado_at) <= new Date(t.prazo_interno)
      ).length,
      selo: calcularSelo(entry.tarefas),
    }))
    .sort((a, b) => {
      // Sort by seal prestige
      const seloOrder = ['flamengo', 'diamante', 'ouro', 'prata', 'bronze', null]
      return seloOrder.indexOf(a.selo) - seloOrder.indexOf(b.selo)
    })

  // Overall unit badge
  const seloGeral = calcularSelo(typedTarefas)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/unidades/${unidadeId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Performance</h1>
          <p className="text-gray-500 text-sm">{unidade?.nome}</p>
        </div>
      </div>

      {/* Unit overall badge */}
      <Card className="border-2 border-blue-100 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-blue-600" />
            Desempenho Geral da Unidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {seloGeral ? (
            <div className="flex items-center gap-4">
              <div className="text-4xl">{SELO_ICONS[seloGeral]}</div>
              <div>
                <p className={cn('text-2xl font-bold', SELO_COLOR[seloGeral])}>
                  {SELO_LABEL[seloGeral]}
                </p>
                <p className="text-sm text-gray-600">{SELO_DESCRIPTION[seloGeral]}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Baseado em {typedTarefas.length} tarefa{typedTarefas.length !== 1 ? 's' : ''} protocolada{typedTarefas.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Nenhum dado suficiente para calcular o selo.{' '}
              {typedTarefas.length === 0 && 'Nenhuma tarefa protocolada ainda.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Critérios de Selos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(['flamengo', 'diamante', 'ouro', 'prata', 'bronze'] as const).map((selo) => (
              <div key={selo} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{SELO_ICONS[selo]}</span>
                  <span className={cn('font-semibold text-sm', SELO_COLOR[selo])}>
                    {SELO_LABEL[selo]}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{SELO_DESCRIPTION[selo]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rankings per executor */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance por Executor</h2>

        {rankings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-400">
            Nenhuma tarefa protocolada ainda
          </div>
        ) : (
          <div className="space-y-3">
            {rankings.map(({ executor, total, noPrazo, selo }) => {
              const pct = total > 0 ? Math.round((noPrazo / total) * 100) : 0
              return (
                <Card key={executor.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                          {executor.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{executor.full_name}</p>
                          <p className="text-xs text-gray-500">
                            {noPrazo}/{total} no prazo ({pct}%)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Progress bar */}
                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              pct >= 100 ? 'bg-green-500' :
                              pct >= 95 ? 'bg-blue-500' :
                              pct >= 90 ? 'bg-amber-500' :
                              'bg-red-500'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Badge */}
                        {selo ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl">{SELO_ICONS[selo]}</span>
                            <span className={cn('text-sm font-semibold', SELO_COLOR[selo])}>
                              {SELO_LABEL[selo]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sem selo</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
