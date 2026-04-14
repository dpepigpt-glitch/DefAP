import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExecutoresManager } from '@/components/configuracoes/ExecutoresManager'
import { TiposTarefaManager } from '@/components/configuracoes/TiposTarefaManager'
import { ColunasManager } from '@/components/configuracoes/ColunasManager'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings } from 'lucide-react'
import type { TipoTarefa, ColunaCustomizada, Profile } from '@/types'

interface PageProps {
  params: { unidadeId: string }
}

export default async function ConfiguracoesPage({ params }: PageProps) {
  const { unidadeId } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [unidadeResult, tiposResult, colunasResult, membrosResult] = await Promise.all([
    supabase.from('unidades').select('*').eq('id', unidadeId).single(),
    supabase.from('tipos_tarefa').select('*').eq('unidade_id', unidadeId).order('nome'),
    supabase.from('colunas_customizadas').select('*').eq('unidade_id', unidadeId).order('ordem'),
    supabase.from('unidade_membros').select('profile:profiles(id, full_name, email)').eq('unidade_id', unidadeId),
  ])

  if (!unidadeResult.data) redirect('/unidades')

  const executores = membrosResult.data?.map((m: any) => m.profile).filter(Boolean) ?? []

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Link href={`/unidades/${unidadeId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-500 text-sm">{unidadeResult.data.nome}</p>
          </div>
        </div>
      </div>

      <ExecutoresManager
        unidadeId={unidadeId}
        executores={executores as Profile[]}
      />

      <TiposTarefaManager
        unidadeId={unidadeId}
        tipos={(tiposResult.data ?? []) as TipoTarefa[]}
      />

      <ColunasManager
        unidadeId={unidadeId}
        colunas={(colunasResult.data ?? []) as ColunaCustomizada[]}
      />
    </div>
  )
}
