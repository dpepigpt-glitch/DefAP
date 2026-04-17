'use client'

import { useState } from 'react'
import { TarefasDataTable } from '@/components/tarefas/TarefasDataTable'
import { UnidadePageHeader } from '@/components/unidades/UnidadePageHeader'
import type { Tarefa, ColunaCustomizada, Unidade, TarefaStatus } from '@/types'

interface UnidadeViewProps {
  unidade: Unidade
  tarefas: Tarefa[]
  colunas: ColunaCustomizada[]
  userRole: 'defensor' | 'gestor' | 'executor'
  currentUserId: string
}

export function UnidadeView({
  unidade,
  tarefas,
  colunas,
  userRole,
  currentUserId,
}: UnidadeViewProps) {
  const [activeFilter, setActiveFilter] = useState<TarefaStatus | 'warning24h' | 'overdue' | null>(null)

  function handleCardClick(filter: TarefaStatus | 'warning24h' | 'overdue') {
    setActiveFilter((prev) => (prev === filter ? null : filter))
  }

  // Derive filtered tarefas based on active card
  const filteredTarefas = activeFilter
    ? tarefas.filter((t) => {
        if (activeFilter === 'pendente') return t.status === 'pendente'
        if (activeFilter === 'remetido_ao_defensor') return t.status === 'remetido_ao_defensor'
        if (activeFilter === 'protocolado') return t.status === 'protocolado'
        if (activeFilter === 'overdue') {
          return t.status === 'pendente' && new Date(t.prazo_interno) < new Date()
        }
        if (activeFilter === 'warning24h') {
          const diff = (new Date(t.prazo_interno).getTime() - Date.now()) / 3600000
          return t.status === 'pendente' && diff >= 0 && diff <= 24
        }
        return true
      })
    : tarefas

  return (
    <>
      <UnidadePageHeader
        unidade={unidade}
        tarefas={tarefas}
        activeFilter={activeFilter}
        onFilterClick={handleCardClick}
      />
      <TarefasDataTable
        tarefas={filteredTarefas}
        colunas={colunas}
        unidadeId={unidade.id}
        userRole={userRole}
        currentUserId={currentUserId}
      />
    </>
  )
}
