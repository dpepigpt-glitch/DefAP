'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Scale, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/unidades')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Green header band */}
        <div className="px-8 pt-8 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)' }}
        >
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-full ring-4 ring-white/30">
              <Scale className="h-9 w-9 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">SGP-D</h1>
          <p className="text-green-200 text-sm mt-1">
            Sistema de Gestão de Prazos
          </p>
          <p className="text-green-300 text-xs mt-0.5 font-medium uppercase tracking-wider">
            Defensoria Pública
          </p>
        </div>

        {/* Form */}
        <div className="px-8 py-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="border-gray-200 focus-visible:ring-green-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="border-gray-200 focus-visible:ring-green-600"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
