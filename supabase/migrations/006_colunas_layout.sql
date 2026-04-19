-- Add column layout config to unidades
-- Stores ordered array of column identifiers:
-- default columns as string keys ('numero_processo', 'assistido', etc.)
-- custom columns as UUID strings
ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS colunas_layout jsonb;
