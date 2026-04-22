-- Add réu preso flag to tarefas
alter table tarefas
  add column if not exists reu_preso boolean not null default false;
