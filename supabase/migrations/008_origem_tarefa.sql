-- Safety: ensure reu_preso exists in case migration 007 was not yet applied
alter table tarefas
  add column if not exists reu_preso boolean not null default false;

-- Add origem to distinguish system-created tasks from imported ones.
alter table tarefas
  add column if not exists origem text not null default 'sistema'
  check (origem in ('sistema', 'importacao'));

-- All rows already in the table are historical/imported data — mark them accordingly
-- so reports start fresh and only count tasks entered directly in the system going forward.
update tarefas set origem = 'importacao' where origem = 'sistema';
