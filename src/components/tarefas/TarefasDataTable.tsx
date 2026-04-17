'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type ColumnDef,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Pencil, Trash2, CheckSquare, RotateCcw } from 'lucide-react'
import type { Tarefa, ColunaCustomizada } from '@/types'
import { getRowClass, getUrgencyLevel } from '@/lib/utils/prazoStatus'
import { isoToDisplay } from '@/lib/utils/dateMask'
import { TarefaStatusBadge } from './TarefaStatusBadge'
import { ProtocoloConfirmDialog } from './ProtocoloConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { updateTarefaStatus, executorSubmitTarefa, deleteTarefa, revertTarefaStatus } from '@/actions/tarefas'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

interface TarefasDataTableProps {
  tarefas: Tarefa[]
  colunas: ColunaCustomizada[]
  unidadeId: string
  userRole: 'defensor' | 'gestor' | 'executor'
  currentUserId: string
  globalFilter?: string
  columnFilters?: ColumnFiltersState
}

function SortableHeader({
  column,
  label,
}: {
  column: any
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      className="flex items-center gap-1 hover:text-gray-900 transition-colors font-medium"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  )
}

export function TarefasDataTable({
  tarefas,
  colunas,
  unidadeId,
  userRole,
  currentUserId,
  globalFilter = '',
  columnFilters = [],
}: TarefasDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'prazo_interno', desc: false }, // Default: earliest deadline first
  ])
  const [internalColumnFilters, setInternalColumnFilters] =
    useState<ColumnFiltersState>(columnFilters)
  const [internalGlobalFilter, setInternalGlobalFilter] = useState(globalFilter)
  const [protocoloDialog, setProtocoloDialog] = useState<{
    open: boolean
    tarefaId: string
    numeroProcesso: string
  }>({ open: false, tarefaId: '', numeroProcesso: '' })
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  async function handleStatusChange(
    tarefa: Tarefa,
    newStatus: 'remetido_ao_defensor' | 'protocolado'
  ) {
    if (newStatus === 'protocolado') {
      setProtocoloDialog({
        open: true,
        tarefaId: tarefa.id,
        numeroProcesso: tarefa.numero_processo,
      })
      return
    }

    setLoadingIds((prev) => new Set(prev).add(tarefa.id))
    if (userRole === 'executor') {
      await executorSubmitTarefa(tarefa.id, unidadeId)
    } else {
      // defensor and gestor use the same status update
      await updateTarefaStatus(tarefa.id, newStatus, unidadeId)
    }
    setLoadingIds((prev) => {
      const next = new Set(prev)
      next.delete(tarefa.id)
      return next
    })
  }

  async function handleDelete(tarefaId: string) {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return
    setLoadingIds((prev) => new Set(prev).add(tarefaId))
    await deleteTarefa(tarefaId, unidadeId)
  }

  // Build column definitions
  const columns = useMemo<ColumnDef<Tarefa>[]>(() => {
    const fixedColumns: ColumnDef<Tarefa>[] = [
      {
        accessorKey: 'numero_processo',
        header: ({ column }) => (
          <SortableHeader column={column} label="Nº Processo" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium text-gray-700">
            {row.original.numero_processo}
          </span>
        ),
      },
      {
        accessorKey: 'assistido',
        header: ({ column }) => <SortableHeader column={column} label="Assistido" />,
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">{row.original.assistido}</span>
        ),
      },
      {
        accessorKey: 'tipo_tarefa',
        header: 'Tipo',
        cell: ({ row }) => (
          <span className="text-gray-600 text-sm">
            {row.original.tipo_tarefa?.nome ?? '—'}
          </span>
        ),
        filterFn: (row, _id, filterValue) => {
          if (!filterValue || filterValue === '__todos') return true
          return row.original.tipo_tarefa?.id === filterValue
        },
      },
      {
        accessorKey: 'prazo_final_pje',
        header: ({ column }) => <SortableHeader column={column} label="Prazo PJE" />,
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 tabular-nums">
            {isoToDisplay(row.original.prazo_final_pje)}
          </span>
        ),
      },
      {
        accessorKey: 'prazo_interno',
        header: ({ column }) => <SortableHeader column={column} label="Prazo Interno" />,
        cell: ({ row }) => {
          const level = getUrgencyLevel(row.original)
          return (
            <span
              className={cn(
                'text-sm tabular-nums font-medium',
                level === 'overdue' && 'text-red-700',
                level === 'warning24h' && 'text-yellow-700',
                level === 'onTime' && 'text-green-700',
                level === 'remetido' && 'text-blue-700',
                level === 'protocolado' && 'text-gray-400 line-through'
              )}
            >
              {isoToDisplay(row.original.prazo_interno.split('T')[0])}
            </span>
          )
        },
        sortingFn: (a, b) =>
          new Date(a.original.prazo_interno).getTime() -
          new Date(b.original.prazo_interno).getTime(),
      },
      {
        accessorKey: 'executor',
        header: 'Executor',
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.executor?.full_name ?? '—'}
          </span>
        ),
        filterFn: (row, _id, filterValue) => {
          if (!filterValue || filterValue === '__todos') return true
          return row.original.executor_id === filterValue
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <TarefaStatusBadge tarefa={row.original} />,
        filterFn: (row, _id, filterValue) => {
          if (!filterValue || filterValue === '__todos') return true
          return row.original.status === filterValue
        },
      },
    ]

    // Dynamic custom columns
    const dynamicColumns: ColumnDef<Tarefa>[] = colunas
      .filter((c) => c.ativo)
      .sort((a, b) => a.ordem - b.ordem)
      .map((coluna) => ({
        id: `custom_${coluna.id}`,
        header: coluna.nome,
        cell: ({ row }) => {
          const valor = row.original.valores_customizados?.find(
            (v) => v.coluna_id === coluna.id
          )?.valor
          return (
            <span className="text-sm text-gray-600">{valor ?? '—'}</span>
          )
        },
      }))

    // Actions column
    const actionsColumn: ColumnDef<Tarefa> = {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const tarefa = row.original
        const isLoading = loadingIds.has(tarefa.id)
        const isOwnTask = tarefa.executor_id === currentUserId
        const isOverdue =
          tarefa.status === 'pendente' &&
          new Date(tarefa.prazo_interno) < new Date()
        // Gestor cannot edit overdue tasks
        const canEdit =
          userRole === 'defensor' ||
          (userRole === 'gestor' && !isOverdue)
        const canDelete = userRole === 'defensor'
        const canProtocolar = userRole === 'defensor'
        const canRemeter =
          userRole === 'defensor' ||
          userRole === 'gestor' ||
          (userRole === 'executor' && isOwnTask)
        const canRevert =
          (userRole === 'defensor' || userRole === 'gestor') &&
          tarefa.status === 'remetido_ao_defensor'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isLoading}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {canEdit && (
                <>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/unidades/${unidadeId}/tarefas/${tarefa.id}/editar`}
                      className="flex items-center gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {canRemeter && tarefa.status === 'pendente' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(tarefa, 'remetido_ao_defensor')}
                  className="text-blue-700 focus:text-blue-700"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Remeter ao Defensor
                </DropdownMenuItem>
              )}

              {canRevert && (
                <DropdownMenuItem
                  onClick={async () => {
                    setLoadingIds((prev) => new Set(prev).add(tarefa.id))
                    await revertTarefaStatus(tarefa.id, unidadeId)
                    setLoadingIds((prev) => { const n = new Set(prev); n.delete(tarefa.id); return n })
                  }}
                  className="text-orange-600 focus:text-orange-600"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Desfazer Remetida
                </DropdownMenuItem>
              )}

              {canProtocolar && tarefa.status === 'remetido_ao_defensor' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(tarefa, 'protocolado')}
                  className="text-gray-700 focus:text-gray-700"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Protocolar (requer senha)
                </DropdownMenuItem>
              )}

              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(tarefa.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }

    return [...fixedColumns, ...dynamicColumns, actionsColumn]
  }, [colunas, unidadeId, userRole, currentUserId, loadingIds])

  const table = useReactTable({
    data: tarefas,
    columns,
    state: {
      sorting,
      columnFilters: internalColumnFilters,
      globalFilter: internalGlobalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setInternalColumnFilters,
    onGlobalFilterChange: setInternalGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, _id, filterValue) => {
      const search = filterValue.toLowerCase()
      const tarefa = row.original
      return (
        tarefa.numero_processo.toLowerCase().includes(search) ||
        tarefa.assistido.toLowerCase().includes(search) ||
        (tarefa.executor?.full_name?.toLowerCase().includes(search) ?? false)
      )
    },
  })

  return (
    <>
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Nenhuma tarefa encontrada
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'text-sm',
                      getRowClass(row.original)
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-4 py-3 whitespace-nowrap',
                          getUrgencyLevel(row.original) === 'protocolado' &&
                            'opacity-60'
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <span>
            {table.getFilteredRowModel().rows.length} de {tarefas.length} tarefas
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-300 inline-block" /> No prazo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-300 inline-block" /> 24h
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Vencido
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-300 inline-block" /> Remetido
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Protocolado
            </span>
          </div>
        </div>
      </div>

      <ProtocoloConfirmDialog
        tarefaId={protocoloDialog.tarefaId}
        unidadeId={unidadeId}
        numeroProcesso={protocoloDialog.numeroProcesso}
        open={protocoloDialog.open}
        onOpenChange={(open) => setProtocoloDialog((prev) => ({ ...prev, open }))}
        onSuccess={() => {}}
      />
    </>
  )
}
