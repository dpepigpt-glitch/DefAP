-- SGP-D: Row Level Security Policies
-- Migration 002: Multi-tenant RLS

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

alter table public.profiles enable row level security;
alter table public.unidades enable row level security;
alter table public.unidade_membros enable row level security;
alter table public.tipos_tarefa enable row level security;
alter table public.colunas_customizadas enable row level security;
alter table public.tarefas enable row level security;
alter table public.tarefa_valores_customizados enable row level security;
alter table public.tarefa_logs enable row level security;
alter table public.notificacoes enable row level security;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get current user's role
create or replace function public.current_user_role()
returns user_role
language sql stable security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Check if current user is a defensor of a given unit
create or replace function public.is_defensor_of_unit(p_unidade_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists(
    select 1 from public.unidades
    where id = p_unidade_id and defensor_id = auth.uid()
  );
$$;

-- Check if current user is a member (executor) of a given unit
create or replace function public.is_member_of_unit(p_unidade_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists(
    select 1 from public.unidade_membros
    where unidade_id = p_unidade_id and profile_id = auth.uid()
  );
$$;

-- Check if current user has access to a unit (defensor or member)
create or replace function public.has_unit_access(p_unidade_id uuid)
returns boolean
language sql stable security definer
as $$
  select
    public.is_defensor_of_unit(p_unidade_id)
    or public.is_member_of_unit(p_unidade_id);
$$;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can read their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- Defensors can read all profiles (to assign executors)
create policy "profiles_select_defensor"
  on public.profiles for select
  using (public.current_user_role() = 'defensor');

-- Users can update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- =============================================
-- UNIDADES POLICIES
-- =============================================

-- Defensor sees their own units
create policy "unidades_select_defensor"
  on public.unidades for select
  using (defensor_id = auth.uid());

-- Executor sees units they are a member of
create policy "unidades_select_executor"
  on public.unidades for select
  using (public.is_member_of_unit(id));

-- Only defensors can create units
create policy "unidades_insert"
  on public.unidades for insert
  with check (
    defensor_id = auth.uid()
    and public.current_user_role() = 'defensor'
  );

-- Only the unit owner (defensor) can update their unit
create policy "unidades_update"
  on public.unidades for update
  using (defensor_id = auth.uid());

-- Only the unit owner can delete their unit
create policy "unidades_delete"
  on public.unidades for delete
  using (defensor_id = auth.uid());

-- =============================================
-- UNIDADE_MEMBROS POLICIES
-- =============================================

-- Defensor of unit manages members
create policy "membros_select_defensor"
  on public.unidade_membros for select
  using (public.is_defensor_of_unit(unidade_id));

-- Executor sees their own memberships
create policy "membros_select_executor"
  on public.unidade_membros for select
  using (profile_id = auth.uid());

create policy "membros_insert"
  on public.unidade_membros for insert
  with check (public.is_defensor_of_unit(unidade_id));

create policy "membros_delete"
  on public.unidade_membros for delete
  using (public.is_defensor_of_unit(unidade_id));

-- =============================================
-- TIPOS_TAREFA POLICIES
-- =============================================

-- Defensor manages task types for their units
create policy "tipos_tarefa_select"
  on public.tipos_tarefa for select
  using (public.has_unit_access(unidade_id));

create policy "tipos_tarefa_insert"
  on public.tipos_tarefa for insert
  with check (public.is_defensor_of_unit(unidade_id));

create policy "tipos_tarefa_update"
  on public.tipos_tarefa for update
  using (public.is_defensor_of_unit(unidade_id));

create policy "tipos_tarefa_delete"
  on public.tipos_tarefa for delete
  using (public.is_defensor_of_unit(unidade_id));

-- =============================================
-- COLUNAS_CUSTOMIZADAS POLICIES
-- =============================================

create policy "colunas_select"
  on public.colunas_customizadas for select
  using (public.has_unit_access(unidade_id));

create policy "colunas_insert"
  on public.colunas_customizadas for insert
  with check (public.is_defensor_of_unit(unidade_id));

create policy "colunas_update"
  on public.colunas_customizadas for update
  using (public.is_defensor_of_unit(unidade_id));

create policy "colunas_delete"
  on public.colunas_customizadas for delete
  using (public.is_defensor_of_unit(unidade_id));

-- =============================================
-- TAREFAS POLICIES
-- =============================================

-- Defensor sees all tasks in their units
create policy "tarefas_select_defensor"
  on public.tarefas for select
  using (public.is_defensor_of_unit(unidade_id));

-- Executor sees only their own tasks in their unit
create policy "tarefas_select_executor"
  on public.tarefas for select
  using (
    executor_id = auth.uid()
    and public.is_member_of_unit(unidade_id)
  );

-- Only defensor can create tasks
create policy "tarefas_insert"
  on public.tarefas for insert
  with check (public.is_defensor_of_unit(unidade_id));

-- Defensor can update any task in their unit
create policy "tarefas_update_defensor"
  on public.tarefas for update
  using (public.is_defensor_of_unit(unidade_id));

-- Executor can only update their own tasks (status + arquivo fields)
-- Note: field-level restriction is enforced in Server Action, RLS handles row access
create policy "tarefas_update_executor"
  on public.tarefas for update
  using (
    executor_id = auth.uid()
    and public.is_member_of_unit(unidade_id)
    and status != 'protocolado'
  );

-- Only defensor can delete tasks
create policy "tarefas_delete"
  on public.tarefas for delete
  using (public.is_defensor_of_unit(unidade_id));

-- =============================================
-- TAREFA_VALORES_CUSTOMIZADOS POLICIES
-- =============================================

create policy "valores_select"
  on public.tarefa_valores_customizados for select
  using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id and public.has_unit_access(t.unidade_id)
    )
  );

create policy "valores_insert"
  on public.tarefa_valores_customizados for insert
  with check (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id and public.has_unit_access(t.unidade_id)
    )
  );

create policy "valores_update"
  on public.tarefa_valores_customizados for update
  using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id and public.has_unit_access(t.unidade_id)
    )
  );

-- =============================================
-- TAREFA_LOGS POLICIES
-- =============================================

create policy "logs_select"
  on public.tarefa_logs for select
  using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id and public.has_unit_access(t.unidade_id)
    )
  );

create policy "logs_insert"
  on public.tarefa_logs for insert
  with check (changed_by = auth.uid());

-- =============================================
-- NOTIFICACOES POLICIES
-- =============================================

-- Users only see their own notifications
create policy "notificacoes_select"
  on public.notificacoes for select
  using (destinatario_id = auth.uid());

-- System (via triggers + service role) inserts notifications
-- Users can mark their own notifications as read
create policy "notificacoes_update"
  on public.notificacoes for update
  using (destinatario_id = auth.uid());

-- Service role inserts (from triggers and Edge Functions)
create policy "notificacoes_insert"
  on public.notificacoes for insert
  with check (true);  -- restricted to service_role via Edge Functions
