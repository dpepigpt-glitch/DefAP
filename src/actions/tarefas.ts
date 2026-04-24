'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toTitleCase } from '@/lib/utils/titleCase'
import { isValidProcesso } from '@/lib/utils/processoMask'

export interface TarefaPayload {
  unidade_id: string
  numero_processo: string
  assistido: string
  data_intimacao: string        // ISO date YYYY-MM-DD
  inicio?: string               // ISO date YYYY-MM-DD
  prazo_dias?: number           // workdays
  tipo_tarefa_id?: string
  prazo_final_pje: string       // ISO date YYYY-MM-DD
  prazo_interno: string         // ISO datetime
  executor_id?: string
  status?: 'pendente' | 'remetido_ao_defensor' | 'protocolado'
  reu_preso?: boolean
  valores_customizados?: Record<string, string>
}

export async function createTarefa(payload: TarefaPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!isValidProcesso(payload.numero_processo)) {
    return { error: 'Número do processo inválido. Use o formato CNJ: 0000000-00.0000.0.00.0000' }
  }

  const { valores_customizados, ...tarefaData } = payload

  const { data: tarefa, error } = await supabase
    .from('tarefas')
    .insert({
      ...tarefaData,
      assistido: toTitleCase(payload.assistido),
      created_by: user.id,
      origem: 'sistema',
    })
    .select()
    .single()

  if (error) {
    console.error('[createTarefa]', error.message, error.details)
    return { error: 'Erro ao criar tarefa.' }
  }

  if (valores_customizados && Object.keys(valores_customizados).length > 0) {
    const valores = Object.entries(valores_customizados)
      .filter(([, valor]) => valor !== undefined && valor !== '')
      .map(([coluna_id, valor]) => ({
        tarefa_id: tarefa.id,
        coluna_id,
        valor,
      }))
    if (valores.length > 0) {
      await supabase.from('tarefa_valores_customizados').insert(valores)
    }
  }

  revalidatePath(`/unidades/${payload.unidade_id}`)
  return { success: true, tarefaId: tarefa.id }
}

export async function updateTarefa(tarefaId: string, payload: Partial<TarefaPayload>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role ?? 'executor'

  // Fetch current tarefa to check overdue status and build audit log
  const { data: current } = await supabase
    .from('tarefas')
    .select('*')
    .eq('id', tarefaId)
    .single()

  if (!current) return { error: 'Tarefa não encontrada.' }

  // Gestor cannot edit overdue tasks
  if (role === 'gestor') {
    const now = new Date()
    const prazo = new Date(current.prazo_interno)
    if (prazo < now && current.status === 'pendente') {
      return { error: 'Tarefas vencidas só podem ser editadas pelo Defensor.' }
    }
  }

  const { valores_customizados, ...tarefaData } = payload

  const updateData: Record<string, unknown> = { ...tarefaData }
  if (tarefaData.assistido) {
    updateData.assistido = toTitleCase(tarefaData.assistido)
  }
  if (tarefaData.numero_processo && !isValidProcesso(tarefaData.numero_processo)) {
    return { error: 'Número do processo inválido.' }
  }

  const { error } = await supabase
    .from('tarefas')
    .update(updateData)
    .eq('id', tarefaId)

  if (error) return { error: 'Erro ao atualizar tarefa.' }

  // Audit log for gestor edits
  if (role === 'gestor') {
    const campos: Record<string, { antes: unknown; depois: unknown }> = {}
    const tracked = [
      'numero_processo', 'assistido', 'data_intimacao', 'inicio', 'prazo_dias',
      'prazo_final_pje', 'prazo_interno', 'executor_id', 'tipo_tarefa_id',
    ]
    for (const campo of tracked) {
      const novo = (updateData as Record<string, unknown>)[campo]
      if (novo !== undefined && String(novo) !== String(current[campo])) {
        campos[campo] = { antes: current[campo], depois: novo }
      }
    }
    if (Object.keys(campos).length > 0) {
      await supabase.from('tarefa_logs').insert({
        tarefa_id: tarefaId,
        changed_by: user.id,
        new_status: current.status,
        tipo_alteracao: 'edicao',
        campos_alterados: campos,
      })
    }
  }

  if (valores_customizados) {
    for (const [coluna_id, valor] of Object.entries(valores_customizados)) {
      await supabase
        .from('tarefa_valores_customizados')
        .upsert({ tarefa_id: tarefaId, coluna_id, valor })
    }
  }

  if (payload.unidade_id) revalidatePath(`/unidades/${payload.unidade_id}`)
  return { success: true }
}

export async function updateTarefaStatus(
  tarefaId: string,
  status: 'remetido_ao_defensor' | 'protocolado',
  unidadeId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()
  const updateData: Record<string, unknown> = { status }
  if (status === 'remetido_ao_defensor') {
    updateData.remetido_at = now
  }
  if (status === 'protocolado') {
    updateData.protocolado_at = now
    updateData.protocolado_by = user.id
  }

  const { error } = await supabase
    .from('tarefas')
    .update(updateData)
    .eq('id', tarefaId)

  if (error) return { error: 'Erro ao atualizar status.' }

  revalidatePath(`/unidades/${unidadeId}`)
  return { success: true }
}

export async function revertTarefaStatus(tarefaId: string, unidadeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role ?? 'executor'
  if (role === 'executor') return { error: 'Sem permissão.' }

  const { error } = await supabase
    .from('tarefas')
    .update({ status: 'pendente', remetido_at: null })
    .eq('id', tarefaId)
    .eq('status', 'remetido_ao_defensor')

  if (error) return { error: 'Erro ao reverter status.' }

  revalidatePath(`/unidades/${unidadeId}`)
  return { success: true }
}

export async function deleteTarefa(tarefaId: string, unidadeId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tarefas')
    .delete()
    .eq('id', tarefaId)

  if (error) return { error: 'Erro ao excluir tarefa.' }

  revalidatePath(`/unidades/${unidadeId}`)
  return { success: true }
}

export async function deleteTarefasEmLote(tarefaIds: string[], unidadeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role ?? 'executor'
  if (role !== 'defensor') return { error: 'Sem permissão.' }
  if (tarefaIds.length === 0) return { success: true, deleted: 0 }

  const { error } = await supabase
    .from('tarefas')
    .delete()
    .in('id', tarefaIds)
    .eq('unidade_id', unidadeId)

  if (error) return { error: error.message }

  revalidatePath(`/unidades/${unidadeId}`)
  return { success: true, deleted: tarefaIds.length }
}

export async function executorSubmitTarefa(
  tarefaId: string,
  unidadeId: string,
  arquivoUrl?: string,
  arquivoNome?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const updateData: Record<string, unknown> = {
    status: 'remetido_ao_defensor',
    remetido_at: new Date().toISOString(),
  }
  if (arquivoUrl) {
    updateData.arquivo_url = arquivoUrl
    updateData.arquivo_nome = arquivoNome
  }

  const { error } = await supabase
    .from('tarefas')
    .update(updateData)
    .eq('id', tarefaId)
    .eq('executor_id', user.id)

  if (error) return { error: 'Erro ao remeter tarefa.' }

  revalidatePath(`/unidades/${unidadeId}`)
  return { success: true }
}

export async function confirmProtocolado(
  tarefaId: string,
  unidadeId: string,
  email: string,
  password: string
) {
  const supabase = await createClient()
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) return { error: 'Senha incorreta.' }
  return updateTarefaStatus(tarefaId, 'protocolado', unidadeId)
}

export async function importarTarefas(
  unidadeId: string,
  rows: Omit<TarefaPayload, 'unidade_id'>[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const errors: { row: number; message: string }[] = []
  const inserted: string[] = []

  for (let i = 0; i < rows.length; i++) {
    let row = rows[i]

    if (!isValidProcesso(row.numero_processo)) {
      errors.push({ row: i + 1, message: `Linha ${i + 1}: Número de processo inválido` })
      continue
    }

    // data_intimacao fallback: use prazo_final_pje or date part of prazo_interno
    if (!row.data_intimacao) {
      const fallback = row.prazo_final_pje || (row.prazo_interno ? row.prazo_interno.split('T')[0] : '')
      if (!fallback) {
        errors.push({ row: i + 1, message: `Linha ${i + 1}: Sem data de expedição nem prazo — linha ignorada` })
        continue
      }
      row = { ...row, data_intimacao: fallback }
    }

    // prazo_interno must contain a valid date portion
    if (!row.prazo_interno || row.prazo_interno.startsWith('T')) {
      if (row.prazo_final_pje) {
        row = { ...row, prazo_interno: row.prazo_final_pje + 'T17:00:00' }
      } else {
        errors.push({ row: i + 1, message: `Linha ${i + 1}: Prazo final ausente — linha ignorada` })
        continue
      }
    }

    if (!row.prazo_final_pje) {
      row = { ...row, prazo_final_pje: row.prazo_interno.split('T')[0] }
    }

    const now = new Date().toISOString()
    const { data: tarefa, error } = await supabase
      .from('tarefas')
      .insert({
        ...row,
        unidade_id: unidadeId,
        assistido: toTitleCase(row.assistido),
        created_by: user.id,
        origem: 'importacao',
        ...(row.status === 'protocolado'
          ? { protocolado_at: row.prazo_interno, protocolado_by: user.id }
          : {}),
        ...(row.status === 'remetido_ao_defensor' ? { remetido_at: now } : {}),
      })
      .select('id')
      .single()

    if (error) {
      errors.push({ row: i + 1, message: `Linha ${i + 1}: ${error.message}` })
    } else {
      inserted.push(tarefa.id)
    }
  }

  revalidatePath(`/unidades/${unidadeId}`)
  return { inserted: inserted.length, errors }
}
