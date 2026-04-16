'use client'

import { useState } from 'react'
import { addMembro, removeMembro } from '@/actions/unidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus, Trash2, Loader2, Mail, Shield } from 'lucide-react'
import type { UnidadeMembro } from '@/types'

interface ExecutoresManagerProps {
  unidadeId: string
  membros: UnidadeMembro[]
}

export function ExecutoresManager({ unidadeId, membros: initialMembros }: ExecutoresManagerProps) {
  const [membros, setMembros] = useState<UnidadeMembro[]>(initialMembros)
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<'executor' | 'gestor'>('executor')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleAdd() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    const result = await addMembro(unidadeId, email.trim(), papel)

    if (result.error) {
      setError(result.error)
    } else if (result.member) {
      setMembros((prev) => [...prev, result.member as unknown as UnidadeMembro])
      setSuccess(`${result.member.full_name} adicionado como ${papel === 'gestor' ? 'Gestor' : 'Executor'}!`)
      setEmail('')
      setPapel('executor')
    }

    setLoading(false)
  }

  async function handleRemove(profileId: string) {
    if (!confirm('Remover este membro da unidade?')) return
    setRemovingId(profileId)

    const result = await removeMembro(unidadeId, profileId)
    if (!result.error) {
      setMembros((prev) => prev.filter((m) => m.profile?.id !== profileId))
    }

    setRemovingId(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Membros da Unidade</CardTitle>
            <CardDescription>
              Assessores e estagiários com acesso a esta planilha
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add member form */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="executor-email" className="sr-only">E-mail</Label>
            <Input
              id="executor-email"
              type="email"
              placeholder="email@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value as 'executor' | 'gestor')}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="executor">Executor</option>
            <option value="gestor">Gestor</option>
          </select>
          <Button onClick={handleAdd} disabled={loading || !email.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ml-1">Adicionar</span>
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
            {success}
          </div>
        )}

        <p className="text-xs text-gray-500">
          O usuário deve estar cadastrado no sistema. Gestores podem criar e editar tarefas nesta unidade.
        </p>

        {/* Members list */}
        {membros.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm border rounded-lg">
            Nenhum membro adicionado
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
            {membros.map((membro) => {
              const profile = membro.profile
              if (!profile) return null
              return (
                <div key={membro.profile_id ?? profile.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                        {membro.papel === 'gestor' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                            <Shield className="h-3 w-3" />
                            Gestor
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {profile.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleRemove(profile.id)}
                    disabled={removingId === profile.id}
                  >
                    {removingId === profile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
