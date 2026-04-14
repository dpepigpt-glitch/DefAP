'use client'

import type { TipoTarefa, Profile } from '@/types'
import { Filter } from 'lucide-react'

interface FilterSidebarProps {
  tiposTarefa: TipoTarefa[]
  executores: Profile[]
  userRole: 'defensor' | 'executor'
}

const STATUS_OPTIONS = [
  { value: '__todos', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'remetido_ao_defensor', label: 'Remetido ao Defensor' },
  { value: 'protocolado', label: 'Protocolado' },
]

export function FilterSidebar({ tiposTarefa, executores, userRole }: FilterSidebarProps) {
  // These filters are visual-only UI components.
  // The actual filtering is handled by the parent page via URL params (future enhancement)
  // or via TanStack Table column filters passed via props.
  // For now, they display as a reference UI.

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-5 sticky top-[73px]">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Filter className="h-4 w-4" />
        Filtros
      </div>

      {/* Status filter */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status</p>
        <div className="space-y-1">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    opt.value === 'pendente' ? 'bg-green-400' :
                    opt.value === 'remetido_ao_defensor' ? 'bg-blue-400' :
                    opt.value === 'protocolado' ? 'bg-gray-400' : 'bg-gray-200'
                  }`}
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  {opt.label}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Task type filter */}
      {tiposTarefa.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Tipo de Petição
          </p>
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900">
              Todos os tipos
            </label>
            {tiposTarefa.map((tipo) => (
              <label
                key={tipo.id}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900"
              >
                {tipo.nome}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Executor filter (defensor only) */}
      {userRole === 'defensor' && executores.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Executor
          </p>
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900">
              Todos os executores
            </label>
            {executores.map((exec) => (
              <label
                key={exec.id}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900"
              >
                {exec.full_name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
        Use a busca na tabela para filtrar resultados
      </div>
    </div>
  )
}
