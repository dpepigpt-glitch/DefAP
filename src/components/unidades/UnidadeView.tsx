'use client'

import { useState } from 'react'
import { TarefasDataTable } from '@/components/tarefas/TarefasDataTable'
import { UnidadePageHeader } from '@/components/unidades/UnidadePageHeader'
import type { Tarefa, ColunaCustomizada, Unidade, TarefaStatus } from '@/types'

type ActiveFilter = TarefaStatus | 'warning24h' | 'overdue'

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
  // By default hide protocoladas to keep the view clean
  const [showProtocoladas, setShowProtocoladas] = useState(false)
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null)

  function handleCardClick(filter: ActiveFilter) {
    if (filter === 'protocolado') {
      // Clicking protocoladas card: reveal them and filter to that group
      // Clicking again: hide them and clear the filter
      if (activeFilter === 'protocolado') {
        setActiveFilter(null)
        setShowProtocoladas(false)
      } else {
        setActiveFilter('protocolado')
        setShowProtocoladas(true)
      }
    } else {
      // Any other card: show active tasks only, toggle filter on/off
      setShowProtocoladas(false)
      setActiveFilter((prev) => (prev === filter ? null : filter))
    }
  }

  function handleShowAll() {
    setActiveFilter(null)
    setShowProtocoladas(true)
  }

  function handleHideProtocoladas() {
    setActiveFilter(null)
    setShowProtocoladas(false)
  }

  const protocoladasCount = tarefas.filter((t) => t.status === 'protocolado').length

  // Base list: always exclude protocoladas unless showProtocoladas is true
  const baseTarefas = showProtocoladas
    ? tarefas
    : tarefas.filter((t) => t.status !== 'protocolado')

  // Apply the active card filter on top of the base list
  const filteredTarefas = activeFilter
    ? baseTarefas.filter((t) => {
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
    : baseTarefas

  return (
    <>
      <UnidadePageHeader
        unidade={unidade}
        tarefas={tarefas}
        activeFilter={activeFilter}
        showProtocoladas={showProtocoladas}
        protocoladasCount={protocoladasCount}
        onFilterClick={handleCardClick}
        onShowAll={handleShowAll}
        onHideProtocoladas={handleHideProtocoladas}
      />
      <TarefasDataTable
        tarefas={filteredTarefas}
        colunas={colunas}
        colunasLayout={unidade.colunas_layout}
        unidadeId={unidade.id}
        userRole={userRole}
        currentUserId={currentUserId}
      />
    </>
  )
}
