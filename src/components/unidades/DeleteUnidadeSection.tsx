'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'
import { DeleteUnidadeDialog } from './DeleteUnidadeDialog'

interface DeleteUnidadeSectionProps {
  unidadeId: string
  unidadeNome: string
}

export function DeleteUnidadeSection({ unidadeId, unidadeNome }: DeleteUnidadeSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-700">Zona de Perigo</CardTitle>
              <CardDescription className="text-red-600">
                Ações irreversíveis para esta unidade
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Excluir esta unidade</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Remove permanentemente a unidade e todos os seus dados (tarefas, histórico, configurações).
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Unidade
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteUnidadeDialog
        unidadeId={unidadeId}
        unidadeNome={unidadeNome}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
