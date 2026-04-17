import { differenceInDays } from 'date-fns'
import type { Tarefa, SeloTipo } from '@/types'

function daysBetween(from: string, to: string): number {
  return Math.max(0, differenceInDays(new Date(to), new Date(from)))
}

/**
 * Calculates performance badge based on remetido_at vs prazo_interno.
 *
 * Diamond/Flamengo use sum ratio: sum(dias usados) / sum(dias concedidos)
 * — not individual averages — as specified by the business rule.
 */
export function calcularSelo(tarefas: Tarefa[]): SeloTipo {
  const concluidas = tarefas.filter((t) => t.remetido_at)
  if (concluidas.length === 0) return null

  let onTimeCount = 0
  let totalPrazoSum = 0
  let usedPrazoSum = 0

  for (const t of concluidas) {
    const isOnTime = new Date(t.remetido_at!) <= new Date(t.prazo_interno)
    if (isOnTime) onTimeCount++

    const totalDays = daysBetween(t.data_intimacao, t.prazo_interno)
    const usedDays = daysBetween(t.data_intimacao, t.remetido_at!)
    totalPrazoSum += totalDays
    usedPrazoSum += Math.min(usedDays, totalDays)
  }

  const onTimePct = (onTimeCount / concluidas.length) * 100
  const ratioUsado = totalPrazoSum > 0 ? usedPrazoSum / totalPrazoSum : 1

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
