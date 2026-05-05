'use client'

import { countByUrgency } from '@/lib/utils/prazoStatus'
import type { Tarefa, Unidade, TarefaStatus } from '@/types'
import { AlertTriangle, Clock, CheckCircle2, Send, Building2, Archive, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type FilterValue = TarefaStatus | 'warning24h' | 'overdue'

interface UnidadePageHeaderProps {
  unidade: Unidade
  tarefas: Tarefa[]
  activeFilter?: FilterValue | null
  showProtocoladas: boolean
  protocoladasCount: number
  onFilterClick?: (filter: FilterValue) => void
  onShowAll: () => void
  onHideProtocoladas: () => void
}

interface CardProps {
  count: number
  label: string
  filterKey: FilterValue
  colorClasses: { bg: string; border: string; num: string; text: string; activeBorder: string }
  icon: React.ReactNode
  activeFilter?: FilterValue | null
  onFilterClick?: (f: FilterValue) => void
}

function SummaryCard({ count, label, filterKey, colorClasses, icon, activeFilter, onFilterClick }: CardProps) {
  const isActive = activeFilter === filterKey
  return (
    <button
      onClick={() => onFilterClick?.(filterKey)}
      className={cn(
        'rounded-lg p-3 flex items-center gap-3 text-left transition-all w-full',
        colorClasses.bg,
        'border',
        isActive ? cn(colorClasses.activeBorder, 'ring-2', colorClasses.activeBorder.replace('border-', 'ring-'), 'shadow-sm') : colorClasses.border,
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <div>
        <p className={cn('text-xl font-bold', colorClasses.num)}>{count}</p>
        <p className={cn('text-xs', colorClasses.text)}>{label}{isActive ? ' ✓' : ''}</p>
      </div>
    </button>
  )
}

export function UnidadePageHeader({
  unidade,
  tarefas,
  activeFilter,
  showProtocoladas,
  protocoladasCount,
  onFilterClick,
  onShowAll,
  onHideProtocoladas,
}: UnidadePageHeaderProps) {
  const counts = countByUrgency(tarefas)
  const activeTarefas = tarefas.filter((t) => t.status !== 'protocolado')

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-green-100 p-2 rounded-lg">
          <Building2 className="h-5 w-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{unidade.nome}</h1>
          <p className="text-gray-500 text-sm">
            {activeTarefas.length} ativa{activeTarefas.length !== 1 ? 's' : ''} · {protocoladasCount} protocolada{protocoladasCount !== 1 ? 's' : ''} · clique num card para filtrar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard
          count={counts.onTime}
          label="No prazo"
          filterKey="pendente"
          colorClasses={{ bg: 'bg-green-50', border: 'border-green-100', activeBorder: 'border-green-500', num: 'text-green-700', text: 'text-green-600' }}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          activeFilter={activeFilter}
          onFilterClick={onFilterClick}
        />
        <SummaryCard
          count={counts.warning24h}
          label="Vence em 24h"
          filterKey="warning24h"
          colorClasses={{ bg: 'bg-yellow-50', border: 'border-yellow-100', activeBorder: 'border-yellow-500', num: 'text-yellow-700', text: 'text-yellow-600' }}
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          activeFilter={activeFilter}
          onFilterClick={onFilterClick}
        />
        <SummaryCard
          count={counts.overdue}
          label="Vencidas"
          filterKey="overdue"
          colorClasses={{ bg: 'bg-red-50', border: 'border-red-100', activeBorder: 'border-red-500', num: 'text-red-700', text: 'text-red-600' }}
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          activeFilter={activeFilter}
          onFilterClick={onFilterClick}
        />
        <SummaryCard
          count={counts.remetido}
          label="Remetidas"
          filterKey="remetido_ao_defensor"
          colorClasses={{ bg: 'bg-blue-50', border: 'border-blue-100', activeBorder: 'border-blue-500', num: 'text-blue-700', text: 'text-blue-600' }}
          icon={<Send className="h-5 w-5 text-blue-500" />}
          activeFilter={activeFilter}
          onFilterClick={onFilterClick}
        />
        <SummaryCard
          count={counts.protocolado}
          label="Protocoladas"
          filterKey="protocolado"
          colorClasses={{ bg: 'bg-gray-50', border: 'border-gray-200', activeBorder: 'border-gray-500', num: 'text-gray-700', text: 'text-gray-500' }}
          icon={<Archive className="h-5 w-5 text-gray-400" />}
          activeFilter={activeFilter}
          onFilterClick={onFilterClick}
        />
      </div>

      {/* Show all / hide protocoladas toggle */}
      <div className="mt-3 flex items-center gap-2">
        {!showProtocoladas ? (
          <button
            onClick={onShowAll}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Ver todas (inclui {protocoladasCount} protocolada{protocoladasCount !== 1 ? 's' : ''})
          </button>
        ) : (
          <button
            onClick={onHideProtocoladas}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Ocultar protocoladas
          </button>
        )}
        {activeFilter && (
          <span className="text-xs text-gray-400">
            filtro ativo — clique no card novamente para remover
          </span>
        )}
      </div>
    </div>
  )
}
