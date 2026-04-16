-- SGP-D Migration 003: Add gestor role
-- Gestor: can create/edit tasks in their unit; cannot delete, protocolar, create units, or view reports

-- Add gestor to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'gestor';

-- Add papel column to unidade_membros to track per-unit role
ALTER TABLE public.unidade_membros
  ADD COLUMN IF NOT EXISTS papel text NOT NULL DEFAULT 'executor'
  CHECK (papel IN ('executor', 'gestor'));

-- =============================================
-- UPDATED HELPER FUNCTIONS
-- =============================================

-- Gestor: check if user is a gestor member of a given unit
CREATE OR REPLACE FUNCTION public.is_gestor_of_unit(p_unidade_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.unidade_membros
    WHERE unidade_id = p_unidade_id
      AND profile_id = auth.uid()
      AND papel = 'gestor'
  );
$$;

-- =============================================
-- TAREFAS: new policies for gestor
-- =============================================

-- Gestor sees all tasks in their member units
CREATE POLICY "tarefas_select_gestor"
  ON public.tarefas FOR SELECT
  USING (
    public.is_member_of_unit(unidade_id)
    AND public.current_user_role() = 'gestor'
  );

-- Gestor can insert tasks in their member units
CREATE POLICY "tarefas_insert_gestor"
  ON public.tarefas FOR INSERT
  WITH CHECK (
    public.is_member_of_unit(unidade_id)
    AND public.current_user_role() = 'gestor'
  );

-- Gestor can update tasks (not already protocolado) in their member units
CREATE POLICY "tarefas_update_gestor"
  ON public.tarefas FOR UPDATE
  USING (
    public.is_member_of_unit(unidade_id)
    AND public.current_user_role() = 'gestor'
    AND status != 'protocolado'
  );

-- =============================================
-- PROFILES: allow gestor to read all profiles
-- (needed to display executor names in DataTable)
-- =============================================

CREATE POLICY "profiles_select_gestor"
  ON public.profiles FOR SELECT
  USING (public.current_user_role() = 'gestor');
