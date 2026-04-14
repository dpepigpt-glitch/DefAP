import { differenceInDays } from 'date-fns'
import type { Tarefa, SeloTipo } from '@/types'

function daysBetween(from: string, to: string): number {
  return Math.max(0, differenceInDays(new Date(to), new Date(from)))
}

/**
 * Calculates the performance badge for a list of tasks.
 *
 * Badge tiers (in descending prestige):
 * - Flamengo: 100% no prazo + avg ≤50% of time used
 * - Diamante:  100% no prazo + avg ≤70% of time used
 * - Ouro:      100% no prazo
 * - Prata:     ≥95% no prazo
 * - Bronze:    ≥90% no prazo
 * - null:      <90% no prazo
 */
export function calcularSelo(tarefas: Tarefa[]): SeloTipo {
  const concluidas = tarefas.filter(
    (t) => t.status === 'protocolado' && t.protocolado_at
  )
  if (concluidas.length === 0) return null

  let onTimeCount = 0
  let totalPctUsado = 0

  for (const t of concluidas) {
    const isOnTime =
      new Date(t.protocolado_at!) <= new Date(t.prazo_interno)

    if (isOnTime) onTimeCount++

    // Time window: from task creation to internal deadline
    const totalDays = daysBetween(t.created_at, t.prazo_interno)
    const usedDays = daysBetween(t.created_at, t.protocolado_at!)
    const pctUsado = totalDays > 0 ? Math.min(usedDays / totalDays, 1) : 1

    totalPctUsado += pctUsado
  }

  const onTimePct = (onTimeCount / concluidas.length) * 100
  const avgPctUsado = (totalPctUsado / concluidas.length) * 100

  // Evaluate tiers — most prestigious first
  if (onTimePct === 100 && avgPctUsado <= 50) return 'flamengo'
  if (onTimePct === 100 && avgPctUsado <= 70) return 'diamante'
  if (onTimePct === 100) return 'ouro'
  if (onTimePct >= 95) return 'prata'
  if (onTimePct >= 90) return 'bronze'
  return null
}

export const SELO_LABEL: Record<NonNullable<SeloTipo>, string> = {
  flamengo: 'Flamengo',
  diamante: 'Diamante',
  ouro: 'Ouro',
  prata: 'Prata',
  bronze: 'Bronze',
}

export const SELO_DESCRIPTION: Record<NonNullable<SeloTipo>, string> = {
  flamengo: 'Média de apenas 50% do tempo utilizado — Performance Elite',
  diamante: '100% no prazo com média de 70% do tempo utilizado',
  ouro: '100% das tarefas entregues no prazo',
  prata: '95% ou mais das tarefas entregues no prazo',
  bronze: '90% ou mais das tarefas entregues no prazo',
}

export const SELO_COLOR: Record<NonNullable<SeloTipo>, string> = {
  flamengo: 'text-red-600',
  diamante: 'text-cyan-500',
  ouro: 'text-yellow-500',
  prata: 'text-gray-400',
  bronze: 'text-amber-700',
}
