import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TarefasDataTable } from '@/components/tarefas/TarefasDataTable'
import { UnidadePageHeader } from '@/components/unidades/UnidadePageHeader'
import { FilterSidebar } from '@/components/tarefas/FilterSidebar'
import { Plus, Upload, Settings } from 'lucide-react'
import type { Tarefa, ColunaCustomizada, TipoTarefa, Profile } from '@/types'

interface PageProps {
  params: { unidadeId: string }
}

export default async function UnidadePage({ params }: PageProps) {
  const { unidadeId } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = (user.user_metadata?.role ?? 'executor') as 'defensor' | 'executor'

  // Fetch unit
  const { data: unidade } = await supabase
    .from('unidades')
    .select('*')
    .eq('id', unidadeId)
    .single()

  if (!unidade) redirect('/unidades')

  // Fetch tasks with related data
  let tarefasQuery = supabase
    .from('tarefas')
    .select(`
      *,
      executor:profiles!executor_id(id, full_name, email),
      tipo_tarefa:tipos_tarefa(id, nome),
      valores_customizados:tarefa_valores_customizados(*)
    `)
    .eq('unidade_id', unidadeId)
    .order('prazo_interno', { ascending: true })

  // Executor sees only their own tasks
  if (role === 'executor') {
    tarefasQuery = tarefasQuery.eq('executor_id', user.id)
  }

  const { data: tarefas } = await tarefasQuery

  // Fetch custom columns
  const { data: colunas } = await supabase
    .from('colunas_customizadas')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  // Fetch task types for filter
  const { data: tiposTarefa } = await supabase
    .from('tipos_tarefa')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
    .order('nome')

  // Fetch executors for filter (defensor only)
  let executores: Profile[] = []
  if (role === 'defensor') {
    const { data: membros } = await supabase
      .from('unidade_membros')
      .select('profile:profiles(id, full_name, email)')
      .eq('unidade_id', unidadeId)
    executores = membros?.map((m: any) => m.profile).filter(Boolean) ?? []
  }

  const typedTarefas = (tarefas ?? []) as unknown as Tarefa[]

  return (
    <div className="space-y-6">
      <UnidadePageHeader
        unidade={unidade}
        role={role}
        tarefas={typedTarefas}
      />

      {/* Action buttons */}
      {role === 'defensor' && (
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
          <Link href={`/unidades/${unidadeId}/configuracoes`}>
            <Button variant="ghost">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </Link>
        </div>
      )}

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <div className="w-60 flex-shrink-0">
          <FilterSidebar
            tiposTarefa={(tiposTarefa ?? []) as TipoTarefa[]}
            executores={executores}
            userRole={role}
          />
        </div>

        {/* Main DataTable */}
        <div className="flex-1 min-w-0">
          <TarefasDataTable
            tarefas={typedTarefas}
            colunas={(colunas ?? []) as ColunaCustomizada[]}
            unidadeId={unidadeId}
            userRole={role}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  )
}
