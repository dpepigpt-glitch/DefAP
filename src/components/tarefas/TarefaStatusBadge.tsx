import { Badge } from '@/components/ui/badge'
import { getUrgencyLevel, URGENCY_LABEL } from '@/lib/utils/prazoStatus'
import type { Tarefa } from '@/types'

interface TarefaStatusBadgeProps {
  tarefa: Tarefa
}

export function TarefaStatusBadge({ tarefa }: TarefaStatusBadgeProps) {
  const level = getUrgencyLevel(tarefa)

  const variantMap = {
    onTime: 'green',
    warning24h: 'yellow',
    overdue: 'red',
    remetido: 'blue',
    protocolado: 'gray',
  } as const

  return (
    <Badge variant={variantMap[level]} className="whitespace-nowrap">
      {URGENCY_LABEL[level]}
    </Badge>
  )
}
