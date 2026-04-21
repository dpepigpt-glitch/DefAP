import { differenceInDays } from 'date-fns'
import type { Tarefa, SeloTipo } from '@/types'

function daysBetween(from: string, to: string): number {
  return Math.max(0, differenceInDays(new Date(to), new Date(from)))
}

/** Returns the best available completion date for a task */
function completionDate(t: Tarefa): string | null {
  return t.remetido_at ?? t.protocolado_at ?? null
}

/**
 * Calculates performance badge based on completion date vs prazo_interno.
 * Uses remetido_at when available, falls back to protocolado_at
 * (covers tasks imported directly as 'protocolado').
 *
 * Diamond/Flamengo use sum ratio: sum(dias usados) / sum(dias concedidos).
 */
export function calcularSelo(tarefas: Tarefa[]): SeloTipo {
  const concluidas = tarefas.filter(
    (t) => t.status === 'protocolado' || t.status === 'remetido_ao_defensor'
  )
  if (concluidas.length === 0) return null

  let onTimeCount = 0
  let totalPrazoSum = 0
  let usedPrazoSum = 0
  let withDateCount = 0

  for (const t of concluidas) {
    const done = completionDate(t)
    if (!done) {
      // No date available — count as on-time but skip timing ratio
      onTimeCount++
      continue
    }

    withDateCount++
    const isOnTime = new Date(done) <= new Date(t.prazo_interno)
    if (isOnTime) onTimeCount++

    const totalDays = daysBetween(t.data_intimacao, t.prazo_interno)
    const usedDays = daysBetween(t.data_intimacao, done)
    totalPrazoSum += totalDays
    usedPrazoSum += Math.min(usedDays, totalDays)
  }

  const onTimePct = (onTimeCount / concluidas.length) * 100
  const ratioUsado = withDateCount > 0 && totalPrazoSum > 0
    ? usedPrazoSum / totalPrazoSum
    : 1

  if (onTimePct === 100 && ratioUsado <= 0.50) return 'flamengo'
  if (onTimePct === 100 && ratioUsado <= 0.70) return 'diamante'
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
  flamengo: '100% no prazo usando apenas 50% do tempo concedido — Elite',
  diamante: '100% no prazo usando até 70% do tempo concedido',
  ouro: '100% das tarefas remetidas no prazo',
  prata: '95% ou mais das tarefas remetidas no prazo',
  bronze: '90% ou mais das tarefas remetidas no prazo',
}

export const SELO_COLOR: Record<NonNullable<SeloTipo>, string> = {
  flamengo: 'text-red-600',
  diamante: 'text-cyan-500',
  ouro: 'text-yellow-500',
  prata: 'text-gray-400',
  bronze: 'text-amber-700',
}
