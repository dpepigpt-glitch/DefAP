-- SGP-D Migration 004: New fields + field labels + audit log

-- =============================================
-- TAREFAS: new campos
-- =============================================

-- inicio: start date for deadline counting
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS inicio date;

-- prazo_dias: number of workdays (used to auto-calculate prazo_final_pje)
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS prazo_dias integer;

-- =============================================
-- CAMPO LABELS: custom display names per unit
-- =============================================

CREATE TABLE IF NOT EXISTS public.unidade_campo_labels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id  uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  campo       text NOT NULL,   -- e.g. 'assistido', 'inicio', 'tipo_tarefa'
  label       text NOT NULL,   -- custom display name
  UNIQUE(unidade_id, campo)
);

ALTER TABLE public.unidade_campo_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campo_labels_select"
  ON public.unidade_campo_labels FOR SELECT
  USING (public.has_unit_access(unidade_id));

CREATE POLICY "campo_labels_write"
  ON public.unidade_campo_labels FOR ALL
  USING (public.is_defensor_of_unit(unidade_id))
  WITH CHECK (public.is_defensor_of_unit(unidade_id));

-- =============================================
-- TAREFA_LOGS: extend for gestor audit trail
-- =============================================

-- tipo_alteracao: 'status' (existing) | 'edicao' (field changes by gestor)
ALTER TABLE public.tarefa_logs
  ADD COLUMN IF NOT EXISTS tipo_alteracao text NOT NULL DEFAULT 'status';

-- campos_alterados: JSON snapshot of {field: {antes: val, depois: val}}
ALTER TABLE public.tarefa_logs
  ADD COLUMN IF NOT EXISTS campos_alterados jsonb;
