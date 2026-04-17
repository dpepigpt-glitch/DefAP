'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteUnidade } from '@/actions/unidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'

interface DeleteUnidadeDialogProps {
  unidadeId: string
  unidadeNome: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteUnidadeDialog({
  unidadeId,
  unidadeNome,
  open,
  onOpenChange,
}: DeleteUnidadeDialogProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!password) return
    setLoading(true)
    setError('')

    const result = await deleteUnidade(unidadeId, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/unidades')
    router.refresh()
  }

  function handleOpenChange(open: boolean) {
    if (!loading) {
      setPassword('')
      setError('')
      onOpenChange(open)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Excluir Unidade
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <span className="block">
              Você está prestes a excluir permanentemente a unidade{' '}
              <strong>"{unidadeNome}"</strong> e{' '}
              <strong>todos os seus dados</strong> (tarefas, configurações, histórico).
            </span>
            <span className="block text-red-600 font-medium">
              Esta ação não pode ser desfeita.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="delete-password">
              Confirme sua senha de administrador
            </Label>
            <Input
              id="delete-password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !password}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Excluir Unidade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
