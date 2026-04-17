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

  const { data: membros } = await supabase
    .from('unidade_membros')
    .select('profile_id, profiles!profile_id(id, full_name, email)')
    .eq('unidade_id', unidadeId)

  const profiles = (membros ?? [])
    .map((m) => m.profiles as { id: string; full_name: string; email: string } | null)
    .filter((p): p is { id: string; full_name: string; email: string } => p !== null)

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

      <ImportClient unidadeId={unidadeId} profiles={profiles} />
    </div>
  )
}
