-- Safety: ensure reu_preso exists in case migration 007 was not yet applied
alter table tarefas
  add column if not exists reu_preso boolean not null default false;

-- Add origem to distinguish system-created tasks from imported ones.
-- Existing rows default to 'sistema'; new imports will be explicitly set to 'importacao'.
alter table tarefas
  add column if not exists origem text not null default 'sistema'
  check (origem in ('sistema', 'importacao'));
