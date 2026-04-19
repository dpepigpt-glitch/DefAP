import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ImportClient } from '@/components/tarefas/ImportClient'

interface PageProps {
  params: { unidadeId: string }
}

export default async function ImportarPage({ params }: PageProps) {
  const { unidadeId } = params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Two-step fetch to avoid subquery issues with Supabase types
  const { data: membros } = await supabase
    .from('unidade_membros')
    .select('profile_id')
    .eq('unidade_id', unidadeId)

  const memberIds = (membros ?? []).map((m) => m.profile_id)

  const [profilesResult, tiposResult] = await Promise.all([
    memberIds.length > 0
      ? supabase.from('profiles').select('id, full_name, email').in('id', memberIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('tipos_tarefa')
      .select('id, nome')
      .eq('unidade_id', unidadeId)
      .eq('ativo', true)
      .order('nome', { ascending: true }),
  ])

  const profiles = (profilesResult.data ?? []) as { id: string; full_name: string; email: string }[]
  const tiposTarefa = (tiposResult.data ?? []) as { id: string; nome: string }[]

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/unidades/${unidadeId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar Tarefas</h1>
          <p className="text-gray-500 text-sm">Upload de CSV ou Excel</p>
        </div>
      </div>

      <ImportClient unidadeId={unidadeId} profiles={profiles} tiposTarefa={tiposTarefa} />
    </div>
  )
}
