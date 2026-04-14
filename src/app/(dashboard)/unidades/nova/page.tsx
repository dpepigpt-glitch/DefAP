'use client'

import { useState } from 'react'
import { createUnidade } from '@/actions/unidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function NovaUnidadePage() {
  const [nome, setNome] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.set('nome', nome)

    const result = await createUnidade(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, createUnidade redirects automatically
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/unidades">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Unidade</h1>
          <p className="text-gray-500 text-sm">Crie uma nova Defensoria para gerenciar</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Informações da Unidade</CardTitle>
              <CardDescription>
                Você poderá adicionar executores e configurar campos depois
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Unidade / Defensoria</Label>
              <Input
                id="nome"
                placeholder="Ex: 3ª JVD — Criminal, Núcleo de Família..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Identifique claramente a qual Defensoria ou núcleo se refere
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !nome.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Unidade'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
