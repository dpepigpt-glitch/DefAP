import { differenceInHours, isPast } from 'date-fns'
import type { Tarefa, PrazoStatusColor } from '@/types'

export type UrgencyLevel =
  | 'onTime'       // green: pendente + no prazo
  | 'warning24h'   // yellow: pendente + ≤24h para vencer
  | 'overdue'      // red: pendente + vencido
  | 'remetido'     // blue: remetido_ao_defensor
  | 'protocolado'  // gray + strikethrough: concluído

/**
 * Determines the urgency level of a task based on its status and deadline.
 */
export function getUrgencyLevel(tarefa: Tarefa): UrgencyLevel {
  if (tarefa.status === 'protocolado') return 'protocolado'
  if (tarefa.status === 'remetido_ao_defensor') return 'remetido'

  // pendente — evaluate deadline proximity
  const prazoInterno = new Date(tarefa.prazo_interno)
  if (isPast(prazoInterno)) return 'overdue'
  if (differenceInHours(prazoInterno, new Date()) <= 24) return 'warning24h'
  return 'onTime'
}

/**
 * Maps urgency level to PrazoStatusColor for backwards compatibility.
 */
export function getPrazoStatus(tarefa: Tarefa): PrazoStatusColor {
  const level = getUrgencyLevel(tarefa)
  const map: Record<UrgencyLevel, PrazoStatusColor> = {
    onTime: 'green',
    warning24h: 'yellow',
    overdue: 'red',
    remetido: 'blue',
    protocolado: 'gray',
  }
  return map[level]
}

/**
 * Tailwind CSS classes for each urgency level.
 * Applied as row className in the TanStack DataTable.
 */
export const URGENCY_ROW_CLASS: Record<UrgencyLevel, string> = {
  onTime:      'bg-green-50 hover:bg-green-100 transition-colors',
  warning24h:  'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400 transition-colors',
  overdue:     'bg-red-100 hover:bg-red-200 border-l-4 border-red-600 font-semibold transition-colors',
  remetido:    'bg-blue-50 hover:bg-blue-100 transition-colors',
  protocolado: 'bg-gray-100 hover:bg-gray-150 opacity-70 transition-colors',
}

// Réu preso variants — darker / more prominent for tasks still within deadline
const REU_PRESO_ROW_CLASS: Partial<Record<UrgencyLevel, string>> = {
  onTime:     'bg-green-200 hover:bg-green-300 border-l-4 border-green-700 transition-colors',
  warning24h: 'bg-orange-100 hover:bg-orange-200 border-l-4 border-orange-600 font-semibold transition-colors',
}

/**
 * Returns the row CSS class for a given tarefa, accounting for réu preso flag.
 */
export function getRowClass(tarefa: Tarefa): string {
  const level = getUrgencyLevel(tarefa)
  if (tarefa.reu_preso && REU_PRESO_ROW_CLASS[level]) {
    return REU_PRESO_ROW_CLASS[level]!
  }
  return URGENCY_ROW_CLASS[level]
}

/**
 * Returns a human-readable label for the urgency level.
 */
export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  onTime:      'No prazo',
  warning24h:  'Vence em 24h',
  overdue:     'Vencido',
  remetido:    'Remetido ao Defensor',
  protocolado: 'Protocolado',
}

/**
 * Returns count of tasks by urgency for dashboard summary cards.
 */
export function countByUrgency(tarefas: Tarefa[]) {
  const counts = {
    onTime: 0,
    warning24h: 0,
    overdue: 0,
    remetido: 0,
    protocolado: 0,
  }
  for (const t of tarefas) {
    counts[getUrgencyLevel(t)]++
  }
  return counts
}
