'use client'

import { useState } from 'react'
import { saveCampoLabel } from '@/actions/unidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tag, Loader2, CheckCircle2 } from 'lucide-react'
import type { CampoLabel } from '@/types'
import { CAMPO_DEFAULTS } from '@/types'

interface CamposManagerProps {
  unidadeId: string
  campoLabels: CampoLabel[]
}

export function CamposManager({ unidadeId, campoLabels: initialLabels }: CamposManagerProps) {
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    initialLabels.forEach((cl) => { map[cl.campo] = cl.label })
    return map
  })
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function handleSave(campo: string) {
    setSaving(campo)
    const label = (labels[campo] ?? '').trim()
    await saveCampoLabel(unidadeId, campo, label || CAMPO_DEFAULTS[campo])
    setSaving(null)
    setSaved(campo)
    setTimeout(() => setSaved(null), 2000)
  }

  const fields = Object.entries(CAMPO_DEFAULTS)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Tag className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Nomes dos Campos</CardTitle>
            <CardDescription>
              Personalize como cada campo aparece na tela. Deixe em branco para usar o nome padrão.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
          {fields.map(([campo, defaultLabel]) => (
            <div key={campo} className="flex items-center gap-3 px-4 py-3">
              <div className="w-40 flex-shrink-0">
                <p className="text-xs font-medium text-gray-500">Padrão</p>
                <p className="text-sm text-gray-700">{defaultLabel}</p>
              </div>
              <div className="flex-1">
                <Input
                  value={labels[campo] ?? ''}
                  onChange={(e) =>
                    setLabels((prev) => ({ ...prev, [campo]: e.target.value }))
                  }
                  placeholder={defaultLabel}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleSave(campo)}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3"
                onClick={() => handleSave(campo)}
                disabled={saving === campo}
              >
                {saving === campo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved === campo ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          As alterações valem apenas para esta unidade e afetam formulários e tabela.
        </p>
      </CardContent>
    </Card>
  )
}
