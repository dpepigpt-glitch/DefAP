-- SGP-D Migration 005: remetido_at field + ensure papel column

-- Ensure papel column exists (migration 003 may not have run)
ALTER TABLE public.unidade_membros
  ADD COLUMN IF NOT EXISTS papel text NOT NULL DEFAULT 'executor'
  CHECK (papel IN ('executor', 'gestor'));

-- remetido_at: timestamp when executor submitted (drives badge calculation)
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS remetido_at timestamptz;
