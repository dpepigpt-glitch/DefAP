'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createUnidade(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const nome = formData.get('nome') as string
  if (!nome?.trim()) return { error: 'Nome da unidade é obrigatório.' }

  const { data, error } = await supabase
    .from('unidades')
    .insert({ nome: nome.trim(), defensor_id: user.id })
    .select()
    .single()

  if (error) return { error: 'Erro ao criar unidade.' }

  revalidatePath('/unidades')
  redirect(`/unidades/${data.id}`)
}

export async function updateUnidade(unidadeId: string, formData: FormData) {
  const supabase = await createClient()
  const nome = formData.get('nome') as string
  if (!nome?.trim()) return { error: 'Nome é obrigatório.' }

  const { error } = await supabase
    .from('unidades')
    .update({ nome: nome.trim() })
    .eq('id', unidadeId)

  if (error) return { error: 'Erro ao atualizar unidade.' }

  revalidatePath('/unidades')
  return { success: true }
}

export async function addMembro(
  unidadeId: string,
  email: string,
  papel: 'executor' | 'gestor' = 'executor'
) {
  const supabase = await createClient()

  // Find profile by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (profileError || !profile) {
    return { error: 'Nenhum usuário encontrado com este e-mail.' }
  }

  const { error } = await supabase
    .from('unidade_membros')
    .insert({ unidade_id: unidadeId, profile_id: profile.id, papel })

  if (error) {
    if (error.code === '23505') return { error: 'Este usuário já é membro desta unidade.' }
    return { error: `Erro ao adicionar membro: ${error.message}` }
  }

  // If adding as gestor, promote the user's global role
  if (papel === 'gestor' && profile.role !== 'gestor' && profile.role !== 'defensor') {
    const admin = createAdminClient()
    await Promise.all([
      supabase.from('profiles').update({ role: 'gestor' }).eq('id', profile.id),
      admin.auth.admin.updateUserById(profile.id, {
        user_metadata: { role: 'gestor' },
      }),
    ])
  }

  revalidatePath(`/unidades/${unidadeId}/configuracoes`)
  return { success: true, member: { ...profile, papel } }
}

export async function removeMembro(unidadeId: string, profileId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('unidade_membros')
    .delete()
    .eq('unidade_id', unidadeId)
    .eq('profile_id', profileId)

  if (error) return { error: 'Erro ao remover membro.' }

  revalidatePath(`/unidades/${unidadeId}/configuracoes`)
  return { success: true }
}

export async function createTipoTarefa(unidadeId: string, nome: string) {
  const supabase = await createClient()
  if (!nome?.trim()) return { error: 'Nome é obrigatório.' }

  const { error } = await supabase
    .from('tipos_tarefa')
    .insert({ unidade_id: unidadeId, nome: nome.trim() })

  if (error) return { error: 'Erro ao criar tipo de tarefa.' }

  revalidatePath(`/unidades/${unidadeId}/configuracoes`)
  return { success: true }
}

export async function updateTipoTarefa(tipoId: string, unidadeId: string, nome: string, ativo: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tipos_tarefa')
    .update({ nome: nome.trim(), ativo })
    .eq('id', tipoId)

  if (error) return { error: 'Erro ao atualizar tipo de tarefa.' }

  revalidatePath(`/unidades/${unidadeId}/configuracoes`)
  return { success: true }
}

export async function saveCampoLabel(unidadeId: string, campo: string, label: string) {
  const supabase = await createClient()
  if (!label?.trim()) {
    // Delete override (revert to default)
    await supabase
      .from('unidade_campo_labels')
      .delete()
      .eq('unidade_id', unidadeId)
      .eq('campo', campo)
  } else {
    await supabase
      .from('unidade_campo_labels')
      .upsert({ unidade_id: unidadeId, campo, label: label.trim() })
  }
  revalidatePath(`/unidades/${unidadeId}/configuracoes`)
  return { success: true }
}

export async function createColunaCustomizada(
  unidadeId: string,
  data: { nome: string; tipo: string; opcoes?: string; obrigatorio: boolean; ordem: number }
) {
  const supabase = await createClient()
  if (!data.nome?.trim()) return { error: 'Nome da coluna é obrigatório.' }

  const opcoesParsed = data.tipo === 'lista' && data.opcoes
    ? data.opcoes.split('\n').map((o) => o.trim()).filter(Boolean)
    : null

  const { data: created, error } = await supabase
    .from('colunas_customizadas')
    .insert({
      unidade_id: unidadeId,
      nome: data.nome.trim(),
      tipo: data.tipo,
      opcoes: opcoesParsed,
      obrigatorio: data.obrigatorio,
      ordem: data.ordem,
    })
    .select('id')
    .single()

  if (error) return { error: 'Erro ao criar coluna.' }

  revalidatePath(`/unidades/${unidadeId}/configuracoes`)
  return { success: true, id: created.id as string }
}

export async function updateColunaCustomizada(
  colunaId: string,
  unidadeId: string,
  data: { nome: string; ativo: boolean; obrigatorio: boolean; opcoes?: string; ordem: number }
) {
  const supabase = await createClient()

  const opcoesParsed = data.opcoes
    ? data.opcoes.split('\n').map((o) => o.trim()).filter(Boolean)
    : null

  const { error } = await supabase
    .from('colunas_customizadas')
    .update({
      nome: data.nome.trim(),
      ativo: data.ativo,
      obrigatorio: data.obrigatorio,
      opcoes: opcoesParsed,
      ordem: data.ordem,
    })
    .eq('id', colunaId)

  if (error) return { error: 'Erro ao atualizar coluna.' }

  revalidatePath(`/unidades/${unidadeId}/configuracoes`)
  return { success: true }
}

export async function deleteUnidade(unidadeId: string, password: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify defensor password before destructive action
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  })
  if (authError) return { error: 'Senha incorreta.' }

  const { error } = await supabase
    .from('unidades')
    .delete()
    .eq('id', unidadeId)

  if (error) return { error: 'Erro ao excluir unidade.' }

  revalidatePath('/unidades')
  return { success: true }
}

export async function saveColunasLayout(unidadeId: string, layout: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role ?? 'executor'
  if (role !== 'defensor') return { error: 'Sem permissão.' }

  const { error } = await supabase
    .from('unidades')
    .update({ colunas_layout: layout })
    .eq('id', unidadeId)
    .eq('defensor_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/unidades/${unidadeId}`)
  revalidatePath(`/unidades/${unidadeId}/configuracoes`)
  return { success: true }
}

export async function deleteColunaCustomizada(colunaId: string, unidadeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role ?? 'executor'
  if (role !== 'defensor') return { error: 'Sem permissão.' }

  const { error } = await supabase
    .from('colunas_customizadas')
    .update({ ativo: false })
    .eq('id', colunaId)
    .eq('unidade_id', unidadeId)

  if (error) return { error: error.message }

  revalidatePath(`/unidades/${unidadeId}`)
  revalidatePath(`/unidades/${unidadeId}/configuracoes`)
  return { success: true }
}
