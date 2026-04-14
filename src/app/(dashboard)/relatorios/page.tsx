import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, BarChart3, ChevronRight } from 'lucide-react'

export default async function RelatoriosGlobaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role ?? 'executor'

  let unidades: any[] = []
  if (role === 'defensor') {
    const { data } = await supabase
      .from('unidades')
      .select('id, nome')
      .eq('defensor_id', user.id)
      .order('nome')
    unidades = data ?? []
  } else {
    const { data } = await supabase
      .from('unidade_membros')
      .select('unidade_id, unidades(id, nome)')
      .eq('profile_id', user.id)
    unidades = data?.map((m: any) => m.unidades).filter(Boolean) ?? []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios de Performance</h1>
          <p className="text-gray-500 text-sm">Selecione uma unidade para ver os selos</p>
        </div>
      </div>

      {unidades.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 text-gray-400">
          Nenhuma unidade disponível
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unidades.map((u) => (
            <Link key={u.id} href={`/unidades/${u.id}/relatorios`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-blue-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 p-2 rounded-lg">
                      <Building2 className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="font-medium text-gray-900">{u.nome}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
