// SGP-D: Scheduled deadline checker
// This Edge Function runs every 15 minutes via Supabase cron schedule
// It creates in-app notifications for:
// - Tasks with prazo_interno within the next 24 hours (aviso_24h)
// - Tasks with prazo_interno already past (vencida)
// Uses idempotency flags to prevent duplicate notifications.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // ---- 24h warning ----
    const { data: alertas24h } = await supabase
      .from('tarefas')
      .select('id, unidade_id, numero_processo, executor_id, prazo_interno')
      .eq('status', 'pendente')
      .eq('alert_24h_sent', false)
      .gt('prazo_interno', now.toISOString())
      .lte('prazo_interno', in24h.toISOString())

    for (const tarefa of alertas24h ?? []) {
      // Notify executor
      if (tarefa.executor_id) {
        await supabase.from('notificacoes').insert({
          tarefa_id: tarefa.id,
          destinatario_id: tarefa.executor_id,
          tipo: 'aviso_24h',
          mensagem: `Atenção! O prazo interno do processo ${tarefa.numero_processo} vence em menos de 24 horas.`,
        })
      }

      // Notify defensor(es) of the unit
      const { data: unidade } = await supabase
        .from('unidades')
        .select('defensor_id')
        .eq('id', tarefa.unidade_id)
        .single()

      if (unidade?.defensor_id && unidade.defensor_id !== tarefa.executor_id) {
        await supabase.from('notificacoes').insert({
          tarefa_id: tarefa.id,
          destinatario_id: unidade.defensor_id,
          tipo: 'aviso_24h',
          mensagem: `Prazo interno do processo ${tarefa.numero_processo} vence em menos de 24 horas.`,
        })
      }

      // Mark as sent (idempotency)
      await supabase
        .from('tarefas')
        .update({ alert_24h_sent: true })
        .eq('id', tarefa.id)
    }

    // ---- Overdue ----
    const { data: vencidas } = await supabase
      .from('tarefas')
      .select('id, unidade_id, numero_processo, executor_id, prazo_interno')
      .eq('status', 'pendente')
      .eq('alert_overdue_sent', false)
      .lt('prazo_interno', now.toISOString())

    for (const tarefa of vencidas ?? []) {
      if (tarefa.executor_id) {
        await supabase.from('notificacoes').insert({
          tarefa_id: tarefa.id,
          destinatario_id: tarefa.executor_id,
          tipo: 'vencida',
          mensagem: `PRAZO VENCIDO! O processo ${tarefa.numero_processo} estava com prazo interno vencido.`,
        })
      }

      const { data: unidade } = await supabase
        .from('unidades')
        .select('defensor_id')
        .eq('id', tarefa.unidade_id)
        .single()

      if (unidade?.defensor_id && unidade.defensor_id !== tarefa.executor_id) {
        await supabase.from('notificacoes').insert({
          tarefa_id: tarefa.id,
          destinatario_id: unidade.defensor_id,
          tipo: 'vencida',
          mensagem: `PRAZO VENCIDO! O processo ${tarefa.numero_processo} está com prazo interno vencido.`,
        })
      }

      await supabase
        .from('tarefas')
        .update({ alert_overdue_sent: true })
        .eq('id', tarefa.id)
    }

    return new Response(
      JSON.stringify({
        alertas_24h: alertas24h?.length ?? 0,
        vencidas: vencidas?.length ?? 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
