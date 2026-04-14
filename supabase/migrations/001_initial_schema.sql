-- SGP-D: Sistema de Gestão de Prazos Defensoria
-- Migration 001: Schema Multi-Tenant

-- =============================================
-- ENUM TYPES
-- =============================================

create type user_role as enum ('defensor', 'executor');
create type tarefa_status as enum ('pendente', 'remetido_ao_defensor', 'protocolado');
create type coluna_tipo as enum ('texto', 'numero', 'data', 'lista');

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================

-- NOTE: role is stored here (drives RLS) AND in user_metadata (drives JWT/middleware)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'executor',
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- MULTI-TENANT: Unidades (Defensorias)
-- =============================================

-- Workspace / independent unit per Defensoria
create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  defensor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Members of each unit (executor assignments)
create table public.unidade_membros (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(unidade_id, profile_id)
);

-- Task types configurable per unit
create table public.tipos_tarefa (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Custom columns per unit (beyond fixed fields)
create table public.colunas_customizadas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  nome text not null,
  tipo coluna_tipo not null default 'texto',
  opcoes jsonb,                              -- for tipo 'lista': ["option1","option2"]
  obrigatorio boolean not null default false,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================
-- TAREFAS (linked to unit — tenant key = unidade_id)
-- =============================================

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  numero_processo text not null,             -- validated CNJ format: 0000000-00.0000.0.00.0000
  assistido text not null,                   -- always stored in Title Case
  data_intimacao date not null,
  tipo_tarefa_id uuid references public.tipos_tarefa(id),
  prazo_final_pje date not null,
  prazo_interno timestamptz not null,        -- TIMESTAMPTZ for 24h precision
  executor_id uuid references public.profiles(id),
  status tarefa_status not null default 'pendente',
  arquivo_url text,                          -- Supabase Storage path
  arquivo_nome text,
  alert_24h_sent boolean not null default false,   -- idempotency flag
  alert_overdue_sent boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  protocolado_at timestamptz,
  protocolado_by uuid references public.profiles(id)
);

-- EAV table for custom column values
create table public.tarefa_valores_customizados (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  coluna_id uuid not null references public.colunas_customizadas(id) on delete cascade,
  valor text,                                -- stored as text; frontend handles type conversion
  unique(tarefa_id, coluna_id)
);

-- Audit log for status changes
create table public.tarefa_logs (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  changed_by uuid references public.profiles(id),
  old_status tarefa_status,
  new_status tarefa_status not null,
  created_at timestamptz not null default now()
);

-- In-app notifications
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid references public.tarefas(id) on delete cascade,
  destinatario_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('aviso_24h', 'vencida', 'remetida')),
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

create index idx_tarefas_unidade on public.tarefas(unidade_id);
create index idx_tarefas_executor on public.tarefas(executor_id);
create index idx_tarefas_status on public.tarefas(status);
create index idx_tarefas_prazo_interno on public.tarefas(prazo_interno);
create index idx_tarefas_numero_processo on public.tarefas(numero_processo);
create index idx_unidade_membros_profile on public.unidade_membros(profile_id);
create index idx_unidade_membros_unidade on public.unidade_membros(unidade_id);
create index idx_notificacoes_destinatario on public.notificacoes(destinatario_id, lida);
create index idx_tipos_tarefa_unidade on public.tipos_tarefa(unidade_id);
create index idx_colunas_unidade on public.colunas_customizadas(unidade_id, ordem);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tarefas_updated_at
  before update on public.tarefas
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger unidades_updated_at
  before update on public.unidades
  for each row execute function public.set_updated_at();

-- Auto-create profile on auth.user creation
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'executor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-log status changes
create or replace function public.log_tarefa_status_change()
returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status then
    insert into public.tarefa_logs (tarefa_id, changed_by, old_status, new_status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger tarefas_status_log
  after update on public.tarefas
  for each row execute function public.log_tarefa_status_change();

-- On status = 'remetido_ao_defensor': create notification for all defensors of the unit
create or replace function public.notify_remetido()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'remetido_ao_defensor' and (old.status is null or old.status != 'remetido_ao_defensor') then
    insert into public.notificacoes (tarefa_id, destinatario_id, tipo, mensagem)
    select
      new.id,
      u.defensor_id,
      'remetida',
      'Tarefa do processo ' || new.numero_processo || ' foi remetida para sua conferência.'
    from public.unidades u
    where u.id = new.unidade_id;
  end if;
  return new;
end;
$$;

create trigger tarefas_notify_remetido
  after update on public.tarefas
  for each row execute function public.notify_remetido();
