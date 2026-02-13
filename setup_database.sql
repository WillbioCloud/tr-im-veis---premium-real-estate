-- setup_database.sql
-- Alinhamento de tolerância a falhas (Supabase)

-- 1) Tabela profiles blindada
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  role text not null default 'corretor',
  active boolean not null default true,
  avatar_url text,
  xp integer not null default 0,
  level integer not null default 1
);

-- Garantir colunas e defaults mesmo em ambientes parcialmente migrados
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists active boolean;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists xp integer;
alter table public.profiles add column if not exists level integer;

alter table public.profiles alter column role set default 'corretor';
alter table public.profiles alter column active set default true;
alter table public.profiles alter column xp set default 0;
alter table public.profiles alter column level set default 1;

update public.profiles set role = 'corretor' where role is null;
update public.profiles set active = true where active is null;
update public.profiles set xp = 0 where xp is null;
update public.profiles set level = 1 where level is null;

alter table public.profiles alter column role set not null;
alter table public.profiles alter column active set not null;
alter table public.profiles alter column xp set not null;
alter table public.profiles alter column level set not null;

-- 2) Trigger de auto-criação de profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, active, xp, level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Usuário'),
    coalesce(new.raw_user_meta_data ->> 'role', 'corretor'),
    true,
    0,
    1
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 3) Reset de RLS / Policies
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles
for select
using (
  exists (
    select 1
    from public.profiles as me
    where me.id = auth.uid()
      and me.role = 'admin'
      and me.active = true
  )
);

-- Policy solicitada para properties (apenas se a tabela existir)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'properties'
  ) then
    execute 'alter table public.properties enable row level security';
    execute 'drop policy if exists "Public can view properties" on public.properties';
    execute '
      create policy "Public can view properties"
      on public.properties
      for select
      using (true)
    ';
  end if;
end
$$;
