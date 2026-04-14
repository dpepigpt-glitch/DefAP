'use client'

import { countByUrgency } from '@/lib/utils/prazoStatus'
import type { Tarefa, Unidade } from '@/types'
import { AlertTriangle, Clock, CheckCircle2, Send, Building2 } from 'lucide-react'

interface UnidadePageHeaderProps {
  unidade: Unidade
  role?: 'defensor' | 'executor'
  tarefas: Tarefa[]
}

export function UnidadePageHeader({ unidade, role, tarefas }: UnidadePageHeaderProps) {
  const counts = countByUrgency(tarefas)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{unidade.nome}</h1>
          <p className="text-gray-500 text-sm">
            {tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''} no total
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-green-700">{counts.onTime}</p>
            <p className="text-xs text-green-600">No prazo</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-yellow-700">{counts.warning24h}</p>
            <p className="text-xs text-yellow-600">Vence em 24h</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-red-700">{counts.overdue}</p>
            <p className="text-xs text-red-600">Vencidas</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
          <Send className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-blue-700">{counts.remetido}</p>
            <p className="text-xs text-blue-600">Remetidas</p>
          </div>
        </div>
      </div>
    </div>
  )
}
