import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UnidadeView } from '@/components/unidades/UnidadeView'
import { Plus, Upload, Settings } from 'lucide-react'
import type { Tarefa, ColunaCustomizada } from '@/types'

interface PageProps {
  params: { unidadeId: string }
}

export default async function UnidadePage({ params }: PageProps) {
  const { unidadeId } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = (user.user_metadata?.role ?? 'executor') as 'defensor' | 'gestor' | 'executor'

  const { data: unidade } = await supabase
    .from('unidades')
    .select('*')
    .eq('id', unidadeId)
    .single()

  if (!unidade) redirect('/unidades')

  let tarefasQuery = supabase
    .from('tarefas')
    .select(`
      *,
      executor:profiles!executor_id(id, full_name, email),
      tipo_tarefa:tipos_tarefa(id, nome),
      valores_customizados:tarefa_valores_customizados(*)
    `)
    .eq('unidade_id', unidadeId)
    .order('created_at', { ascending: true })

  if (role === 'executor') {
    tarefasQuery = tarefasQuery.eq('executor_id', user.id)
  }

  const [{ data: tarefas }, { data: colunas }] = await Promise.all([
    tarefasQuery,
    supabase
      .from('colunas_customizadas')
      .select('*')
      .eq('unidade_id', unidadeId)
      .eq('ativo', true)
      .order('ordem', { ascending: true }),
  ])

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      {(role === 'defensor' || role === 'gestor') && (
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/unidades/${unidadeId}/tarefas/nova`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </Link>
          <Link href={`/unidades/${unidadeId}/importar`}>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV/Excel
            </Button>
          </Link>
          {role === 'defensor' && (
            <Link href={`/unidades/${unidadeId}/configuracoes`}>
              <Button variant="ghost">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </Link>
          )}
        </div>
      )}

      <UnidadeView
        unidade={unidade}
        tarefas={(tarefas ?? []) as unknown as Tarefa[]}
        colunas={(colunas ?? []) as ColunaCustomizada[]}
        userRole={role}
        currentUserId={user.id}
      />
    </div>
  )
}
