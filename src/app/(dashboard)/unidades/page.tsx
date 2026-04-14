import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Building2, AlertTriangle } from 'lucide-react'

export default async function UnidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role ?? 'executor'

  // Fetch units based on role
  let unidades: any[] = []
  if (role === 'defensor') {
    const { data } = await supabase
      .from('unidades')
      .select('*')
      .eq('defensor_id', user.id)
      .order('created_at', { ascending: false })
    unidades = data ?? []
  } else {
    const { data } = await supabase
      .from('unidade_membros')
      .select('unidade_id, unidades(*)')
      .eq('profile_id', user.id)
    unidades = data?.map((m: any) => m.unidades).filter(Boolean) ?? []
  }

  // Get task counts per unit
  const unidadeIds = unidades.map((u) => u.id)
  const { data: tarefasStats } = await supabase
    .from('tarefas')
    .select('unidade_id, status, prazo_interno')
    .in('unidade_id', unidadeIds)

  const statsByUnidade = unidadeIds.reduce(
    (acc, id) => {
      const unitTarefas = (tarefasStats ?? []).filter((t) => t.unidade_id === id)
      const now = new Date()
      acc[id] = {
        total: unitTarefas.length,
        pendentes: unitTarefas.filter((t) => t.status === 'pendente').length,
        vencidas: unitTarefas.filter(
          (t) => t.status === 'pendente' && new Date(t.prazo_interno) < now
        ).length,
      }
      return acc
    },
    {} as Record<string, { total: number; pendentes: number; vencidas: number }>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Unidades</h1>
          <p className="text-gray-500 mt-1">
            Gerencie suas Defensorias e controle os prazos de cada unidade
          </p>
        </div>
        {role === 'defensor' && (
          <Link href="/unidades/nova">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Unidade
            </Button>
          </Link>
        )}
      </div>

      {unidades.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {role === 'defensor' ? 'Nenhuma unidade criada' : 'Você não pertence a nenhuma unidade'}
          </h3>
          <p className="text-gray-500 mb-6">
            {role === 'defensor'
              ? 'Crie sua primeira unidade para começar a gerenciar prazos.'
              : 'Aguarde o Defensor adicioná-lo a uma unidade.'}
          </p>
          {role === 'defensor' && (
            <Link href="/unidades/nova">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Unidade
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unidades.map((unidade) => {
            const stats = statsByUnidade[unidade.id] ?? { total: 0, pendentes: 0, vencidas: 0 }
            return (
              <Link key={unidade.id} href={`/unidades/${unidade.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      {stats.vencidas > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          {stats.vencidas} vencida{stats.vencidas > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-3">{unidade.nome}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-2">
                        <p className="text-xl font-bold text-yellow-700">{stats.pendentes}</p>
                        <p className="text-xs text-yellow-600">Pendentes</p>
                      </div>
                      <div className={stats.vencidas > 0 ? 'bg-red-50 rounded-lg p-2' : 'bg-green-50 rounded-lg p-2'}>
                        <p className={`text-xl font-bold ${stats.vencidas > 0 ? 'text-red-700' : 'text-green-700'}`}>
                          {stats.vencidas}
                        </p>
                        <p className={`text-xs ${stats.vencidas > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Vencidas
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
