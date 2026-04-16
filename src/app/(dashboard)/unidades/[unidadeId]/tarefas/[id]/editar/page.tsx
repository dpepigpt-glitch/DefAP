import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TarefaForm } from '@/components/tarefas/TarefaForm'
import type { Tarefa, TipoTarefa, Profile, ColunaCustomizada, CampoLabel } from '@/types'

interface PageProps {
  params: { unidadeId: string; id: string }
}

export default async function EditarTarefaPage({ params }: PageProps) {
  const { unidadeId, id } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = (user.user_metadata?.role ?? 'executor') as string

  const [tarefaResult, tiposResult, membrosResult, colunasResult, labelsResult] = await Promise.all([
    supabase
      .from('tarefas')
      .select('*, valores_customizados:tarefa_valores_customizados(*)')
      .eq('id', id)
      .eq('unidade_id', unidadeId)
      .single(),
    supabase.from('tipos_tarefa').select('*').eq('unidade_id', unidadeId).eq('ativo', true).order('nome'),
    supabase.from('unidade_membros').select('profile:profiles(id, full_name, email)').eq('unidade_id', unidadeId),
    supabase.from('colunas_customizadas').select('*').eq('unidade_id', unidadeId).eq('ativo', true).order('ordem'),
    supabase.from('unidade_campo_labels').select('*').eq('unidade_id', unidadeId),
  ])

  if (!tarefaResult.data) redirect(`/unidades/${unidadeId}`)

  const tarefa = tarefaResult.data as unknown as Tarefa

  // Gestor cannot edit overdue tasks — redirect with message
  if (role === 'gestor') {
    const now = new Date()
    const prazo = new Date(tarefa.prazo_interno)
    if (prazo < now && tarefa.status === 'pendente') {
      redirect(`/unidades/${unidadeId}?erro=tarefa_vencida`)
    }
  }

  const executores = membrosResult.data?.map((m: any) => m.profile).filter(Boolean) ?? []

  return (
    <TarefaForm
      unidadeId={unidadeId}
      tiposTarefa={(tiposResult.data ?? []) as TipoTarefa[]}
      executores={executores as Profile[]}
      colunas={(colunasResult.data ?? []) as ColunaCustomizada[]}
      tarefa={tarefa}
      campoLabels={(labelsResult.data ?? []) as CampoLabel[]}
    />
  )
}
