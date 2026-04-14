'use client'

import { useState } from 'react'
import { addMembro, removeMembro } from '@/actions/unidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus, Trash2, Loader2, Mail } from 'lucide-react'
import type { Profile } from '@/types'

interface ExecutoresManagerProps {
  unidadeId: string
  executores: Profile[]
}

export function ExecutoresManager({ unidadeId, executores: initialExecutores }: ExecutoresManagerProps) {
  const [executores, setExecutores] = useState<Profile[]>(initialExecutores)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleAdd() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    const result = await addMembro(unidadeId, email.trim())

    if (result.error) {
      setError(result.error)
    } else if (result.member) {
      setExecutores((prev) => [...prev, result.member as Profile])
      setSuccess(`${result.member.full_name} adicionado com sucesso!`)
      setEmail('')
    }

    setLoading(false)
  }

  async function handleRemove(profileId: string) {
    if (!confirm('Remover este executor da unidade?')) return
    setRemovingId(profileId)

    const result = await removeMembro(unidadeId, profileId)
    if (!result.error) {
      setExecutores((prev) => prev.filter((e) => e.id !== profileId))
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
            <CardTitle>Executores da Unidade</CardTitle>
            <CardDescription>
              Assessores e estagiários com acesso a esta planilha
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add executor form */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="executor-email" className="sr-only">E-mail do executor</Label>
            <Input
              id="executor-email"
              type="email"
              placeholder="email@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
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
          O usuário deve estar cadastrado no sistema para ser adicionado.
        </p>

        {/* Executores list */}
        {executores.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm border rounded-lg">
            Nenhum executor adicionado
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
            {executores.map((exec) => (
              <div key={exec.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {exec.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{exec.full_name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {exec.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleRemove(exec.id)}
                  disabled={removingId === exec.id}
                >
                  {removingId === exec.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
