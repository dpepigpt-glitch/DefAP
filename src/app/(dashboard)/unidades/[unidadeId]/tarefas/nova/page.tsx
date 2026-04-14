import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TarefaForm } from '@/components/tarefas/TarefaForm'
import type { TipoTarefa, Profile, ColunaCustomizada } from '@/types'

interface PageProps {
  params: { unidadeId: string }
}

export default async function NovaTarefaPage({ params }: PageProps) {
  const { unidadeId } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tiposResult, membrosResult, colunasResult] = await Promise.all([
    supabase.from('tipos_tarefa').select('*').eq('unidade_id', unidadeId).eq('ativo', true).order('nome'),
    supabase.from('unidade_membros').select('profile:profiles(id, full_name, email)').eq('unidade_id', unidadeId),
    supabase.from('colunas_customizadas').select('*').eq('unidade_id', unidadeId).eq('ativo', true).order('ordem'),
  ])

  const executores = membrosResult.data?.map((m: any) => m.profile).filter(Boolean) ?? []

  return (
    <TarefaForm
      unidadeId={unidadeId}
      tiposTarefa={(tiposResult.data ?? []) as TipoTarefa[]}
      executores={executores as Profile[]}
      colunas={(colunasResult.data ?? []) as ColunaCustomizada[]}
    />
  )
}
