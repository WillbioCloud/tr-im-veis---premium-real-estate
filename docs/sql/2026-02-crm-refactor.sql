-- ==============================================
-- TR Imóveis • Refatoração CRM/Imóveis
-- Área 1: Estrutura de dados + segurança + gamificação
-- Execute em ordem no SQL Editor do Supabase
-- ==============================================

begin;

-- 1) Properties: suporte a venda/aluguel e campos auxiliares
alter table public.properties
  add column if not exists listing_type text not null default 'sale',
  add column if not exists rent_package_price numeric,
  add column if not exists down_payment numeric,
  add column if not exists financing_available boolean,
  add column if not exists zip_code text,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

alter table public.properties
  drop constraint if exists properties_listing_type_check;

alter table public.properties
  add constraint properties_listing_type_check
  check (listing_type in ('sale', 'rent'));

-- 2) Leads: lead scoring de interesse (cliente)
alter table public.leads
  add column if not exists lead_score integer not null default 0,
  add column if not exists score_visit integer not null default 0,
  add column if not exists score_favorite integer not null default 0,
  add column if not exists score_whatsapp integer not null default 0;

-- Recalcular score total
update public.leads
set lead_score = coalesce(score_visit, 0) + coalesce(score_favorite, 0) + coalesce(score_whatsapp, 0);

-- 3) Tasks / Templates segregados por usuário
alter table public.tasks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.templates
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Backfill: tarefas herdando dono do lead (assigned_to)
update public.tasks t
set user_id = l.assigned_to
from public.leads l
where t.lead_id = l.id
  and t.user_id is null;

-- Backfill: templates herdando usuário autenticado criador (quando possível)
-- Se sua tabela já tiver created_by, adapte este update.
update public.templates
set user_id = auth.uid()
where user_id is null
  and auth.uid() is not null;

-- 4) Profiles: gamificação de corretor (XP e nível)
alter table public.profiles
  add column if not exists xp_points integer not null default 0,
  add column if not exists level integer not null default 1,
  add column if not exists level_title text not null default 'Corretor Júnior';

-- 5) Trigger para manter lead_score em sincronia
create or replace function public.compute_lead_score()
returns trigger
language plpgsql
as $$
begin
  new.lead_score := coalesce(new.score_visit, 0)
                  + coalesce(new.score_favorite, 0)
                  + coalesce(new.score_whatsapp, 0);
  return new;
end;
$$;

drop trigger if exists trg_compute_lead_score on public.leads;
create trigger trg_compute_lead_score
before insert or update on public.leads
for each row
execute function public.compute_lead_score();

-- 6) Trigger para calcular nível/título com base no XP
create or replace function public.compute_profile_level()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.xp_points, 0) >= 4000 then
    new.level := 4;
    new.level_title := 'Corretor Elite';
  elsif coalesce(new.xp_points, 0) >= 2500 then
    new.level := 3;
    new.level_title := 'Corretor Sênior';
  elsif coalesce(new.xp_points, 0) >= 1200 then
    new.level := 2;
    new.level_title := 'Corretor Pleno';
  else
    new.level := 1;
    new.level_title := 'Corretor Júnior';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_compute_profile_level on public.profiles;
create trigger trg_compute_profile_level
before insert or update on public.profiles
for each row
execute function public.compute_profile_level();

-- 7) Função utilitária para adicionar XP
create or replace function public.add_broker_xp(p_user_id uuid, p_xp integer)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
     set xp_points = coalesce(xp_points, 0) + greatest(p_xp, 0)
   where id = p_user_id;
end;
$$;

-- 8) RLS: Admin vê tudo; corretor vê apenas seus dados
-- IMPORTANTE: pressupõe RLS habilitado nessas tabelas.

-- Tasks
alter table public.tasks enable row level security;

drop policy if exists "tasks_admin_all" on public.tasks;
create policy "tasks_admin_all"
on public.tasks
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "tasks_owner_select" on public.tasks;
create policy "tasks_owner_select"
on public.tasks
for select
using (user_id = auth.uid());

drop policy if exists "tasks_owner_insert" on public.tasks;
create policy "tasks_owner_insert"
on public.tasks
for insert
with check (user_id = auth.uid());

drop policy if exists "tasks_owner_update" on public.tasks;
create policy "tasks_owner_update"
on public.tasks
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tasks_owner_delete" on public.tasks;
create policy "tasks_owner_delete"
on public.tasks
for delete
using (user_id = auth.uid());

-- Templates
alter table public.templates enable row level security;

drop policy if exists "templates_admin_all" on public.templates;
create policy "templates_admin_all"
on public.templates
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "templates_owner_select" on public.templates;
create policy "templates_owner_select"
on public.templates
for select
using (user_id = auth.uid());

drop policy if exists "templates_owner_insert" on public.templates;
create policy "templates_owner_insert"
on public.templates
for insert
with check (user_id = auth.uid());

drop policy if exists "templates_owner_update" on public.templates;
create policy "templates_owner_update"
on public.templates
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "templates_owner_delete" on public.templates;
create policy "templates_owner_delete"
on public.templates
for delete
using (user_id = auth.uid());

-- Leads: admin vê tudo, corretor vê apenas os que estão atribuídos a ele
alter table public.leads enable row level security;

drop policy if exists "leads_admin_all" on public.leads;
create policy "leads_admin_all"
on public.leads
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "leads_broker_select" on public.leads;
create policy "leads_broker_select"
on public.leads
for select
using (assigned_to = auth.uid());

drop policy if exists "leads_broker_update" on public.leads;
create policy "leads_broker_update"
on public.leads
for update
using (assigned_to = auth.uid())
with check (assigned_to = auth.uid());

commit;
