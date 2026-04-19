export const DEFAULT_COLUMN_KEYS = [
  'numero_processo',
  'assistido',
  'tipo_tarefa',
  'prazo_final_pje',
  'prazo_interno',
  'executor',
  'status',
] as const

export type DefaultColumnKey = (typeof DEFAULT_COLUMN_KEYS)[number]

export const DEFAULT_COLUMN_LABELS: Record<DefaultColumnKey, string> = {
  numero_processo: 'Nº Processo',
  assistido: 'Assistido',
  tipo_tarefa: 'Tipo',
  prazo_final_pje: 'Prazo PJE',
  prazo_interno: 'Prazo Interno',
  executor: 'Executor',
  status: 'Status',
}

export function isDefaultColumnKey(key: string): key is DefaultColumnKey {
  return DEFAULT_COLUMN_KEYS.includes(key as DefaultColumnKey)
}

/** Build the effective column layout, merging defaults + custom column IDs */
export function buildEffectiveLayout(
  colunasLayout: string[] | null,
  customIds: string[],
): string[] {
  if (colunasLayout && colunasLayout.length > 0) return colunasLayout
  return [...DEFAULT_COLUMN_KEYS, ...customIds]
}
