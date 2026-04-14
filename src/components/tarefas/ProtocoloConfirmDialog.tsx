'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmProtocolado } from '@/actions/tarefas'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProtocoloConfirmDialogProps {
  tarefaId: string
  unidadeId: string
  numeroProcesso: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ProtocoloConfirmDialog({
  tarefaId,
  unidadeId,
  numeroProcesso,
  open,
  onOpenChange,
  onSuccess,
}: ProtocoloConfirmDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    setError('')

    // Get current user email
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setError('Sessão expirada. Faça login novamente.')
      setLoading(false)
      return
    }

    const result = await confirmProtocolado(tarefaId, unidadeId, user.email, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setPassword('')
    setError('')
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gray-100 p-2 rounded-full">
              <ShieldCheck className="h-5 w-5 text-gray-600" />
            </div>
            <DialogTitle>Confirmar Protocolo</DialogTitle>
          </div>
          <DialogDescription>
            Para marcar o processo <strong>{numeroProcesso}</strong> como{' '}
            <strong>Protocolado</strong>, confirme sua senha de acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              <Lock className="h-3.5 w-3.5 inline mr-1.5" />
              Senha de confirmação
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleConfirm()}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !password}
            className="bg-gray-800 hover:bg-gray-900"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Confirmar Protocolo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
