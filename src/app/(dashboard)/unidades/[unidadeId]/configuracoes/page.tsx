import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExecutoresManager } from '@/components/configuracoes/ExecutoresManager'
import { TiposTarefaManager } from '@/components/configuracoes/TiposTarefaManager'
import { ColunasManager } from '@/components/configuracoes/ColunasManager'
import { CamposManager } from '@/components/configuracoes/CamposManager'
import { DeleteUnidadeSection } from '@/components/unidades/DeleteUnidadeSection'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, History } from 'lucide-react'
import type { TipoTarefa, ColunaCustomizada, UnidadeMembro, CampoLabel } from '@/types'

interface PageProps {
  params: { unidadeId: string }
}

export default async function ConfiguracoesPage({ params }: PageProps) {
  const { unidadeId } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [unidadeResult, tiposResult, colunasResult, membrosResult, labelsResult] = await Promise.all([
    supabase.from('unidades').select('*').eq('id', unidadeId).single(),
    supabase.from('tipos_tarefa').select('*').eq('unidade_id', unidadeId).order('nome'),
    supabase.from('colunas_customizadas').select('*').eq('unidade_id', unidadeId).order('ordem'),
    supabase
      .from('unidade_membros')
      .select('id, profile_id, unidade_id, papel, created_at, profile:profiles(id, full_name, email, role)')
      .eq('unidade_id', unidadeId),
    supabase.from('unidade_campo_labels').select('*').eq('unidade_id', unidadeId),
  ])

  if (!unidadeResult.data) redirect('/unidades')

  const membros = (membrosResult.data ?? []) as unknown as UnidadeMembro[]

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
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
        <Link href={`/unidades/${unidadeId}/historico`}>
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Histórico de Alterações
          </Button>
        </Link>
      </div>

      <ExecutoresManager unidadeId={unidadeId} membros={membros} />

      <CamposManager
        unidadeId={unidadeId}
        campoLabels={(labelsResult.data ?? []) as CampoLabel[]}
      />

      <TiposTarefaManager
        unidadeId={unidadeId}
        tipos={(tiposResult.data ?? []) as TipoTarefa[]}
      />

      <ColunasManager
        unidadeId={unidadeId}
        colunas={(colunasResult.data ?? []) as ColunaCustomizada[]}
      />

      <DeleteUnidadeSection
        unidadeId={unidadeId}
        unidadeNome={unidadeResult.data.nome}
      />
    </div>
  )
}
