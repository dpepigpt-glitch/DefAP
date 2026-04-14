import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TarefaForm } from '@/components/tarefas/TarefaForm'
import type { Tarefa, TipoTarefa, Profile, ColunaCustomizada } from '@/types'

interface PageProps {
  params: { unidadeId: string; id: string }
}

export default async function EditarTarefaPage({ params }: PageProps) {
  const { unidadeId, id } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tarefaResult, tiposResult, membrosResult, colunasResult] = await Promise.all([
    supabase
      .from('tarefas')
      .select('*, valores_customizados:tarefa_valores_customizados(*)')
      .eq('id', id)
      .eq('unidade_id', unidadeId)
      .single(),
    supabase.from('tipos_tarefa').select('*').eq('unidade_id', unidadeId).eq('ativo', true).order('nome'),
    supabase.from('unidade_membros').select('profile:profiles(id, full_name, email)').eq('unidade_id', unidadeId),
    supabase.from('colunas_customizadas').select('*').eq('unidade_id', unidadeId).eq('ativo', true).order('ordem'),
  ])

  if (!tarefaResult.data) redirect(`/unidades/${unidadeId}`)

  const executores = membrosResult.data?.map((m: any) => m.profile).filter(Boolean) ?? []

  return (
    <TarefaForm
      unidadeId={unidadeId}
      tiposTarefa={(tiposResult.data ?? []) as TipoTarefa[]}
      executores={executores as Profile[]}
      colunas={(colunasResult.data ?? []) as ColunaCustomizada[]}
      tarefa={tarefaResult.data as unknown as Tarefa}
    />
  )
}
