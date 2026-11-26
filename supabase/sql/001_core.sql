-- =====================================================================
-- GUKANDA 001: core (profiles, roles, assignments, helper functions, audit log)
-- Run in: Supabase Dashboard > SQL Editor. Runs as ONE transaction:
-- if anything fails, nothing is applied and you can fix and re-run.
-- =====================================================================
begin;

-- Needed later for the "no overlapping appointments" rule (file 002).
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- The "private" schema holds our helper functions. Supabase only exposes
-- the "public" schema through its API, so nobody can call these directly
-- from the app. Policies can still use them.
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ABOUT TABLE PRIVILEGES. Row Level Security (policies) decides WHICH ROWS you may touch.
-- GRANT decides WHETHER you may touch the table at all. Since 30 May 2026 new Supabase
-- projects grant NOTHING automatically, so every table below says exactly what the logged-in
-- role ("authenticated") may do, and what the server key ("service_role") may do.
-- "anon" (logged-out visitors) gets nothing on any table. This is written explicitly so it
-- behaves the same on old and new projects.
alter default privileges in schema public revoke all on tables from anon;

create type public.user_role as enum ('client', 'practitioner', 'admin');

-- Keeps updated_at honest on every table that has it.
create function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- profiles: one row per login. This is where the ROLE lives.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null default '' check (char_length(full_name) <= 120),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'fr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
alter table public.profiles enable row level security;

-- practitioner_clients: which practitioner may see which client.
-- Only an admin (or a database function) writes here.
create table public.practitioner_clients (
  practitioner_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (practitioner_id, client_id),
  check (practitioner_id <> client_id)
);
create index practitioner_clients_client_idx on public.practitioner_clients (client_id);
alter table public.practitioner_clients enable row level security;

-- audit_log: who exported or deleted what, and when. Written ONLY by the
-- server (admin functions or Edge Functions with the service key). No one
-- can insert, change or delete rows from the app, not even an admin.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,                       -- no foreign key: the log must outlive deleted users
  action text not null,                -- e.g. set_role, export_client_data, delete_client_data
  target_table text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id);
alter table public.audit_log enable row level security;

-- business_settings: ONE row. The business time zone used to show times.
-- (Weekly opening hours are wall-clock times in this zone. Everything else is stored in UTC.)
create table public.business_settings (
  id boolean primary key default true check (id),   -- 'true' only: the table can never hold two rows
  timezone text not null default 'Africa/Kigali',   -- PLACEHOLDER: confirm with the owner
  updated_at timestamptz not null default now()
);
insert into public.business_settings default values;
create trigger business_settings_touch before update on public.business_settings
  for each row execute function private.touch_updated_at();
alter table public.business_settings enable row level security;

-- ---------------------------------------------------------------------
-- Helper functions ("security definer" = they run with the owner's rights,
-- so they can look at profiles without triggering the profiles policies
-- again. That is how we avoid policies that read their own table.)
-- All use search_path = '' so nothing can be swapped in by a malicious schema.
-- ---------------------------------------------------------------------
create function private.my_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;

create function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_role() = 'admin', false)
$$;

-- Is the logged-in practitioner assigned to this client?
create function private.is_assigned(p_client uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.practitioner_clients pc
    where pc.practitioner_id = (select auth.uid()) and pc.client_id = p_client
  ) and coalesce(private.my_role() = 'practitioner', false)
$$;

-- "Staff access" to a client's data: an admin, or an assigned practitioner.
create function private.can_staff_access_client(p_client uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or private.is_assigned(p_client)
$$;

revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------
-- New user -> new profile. The role is ALWAYS 'client'. We deliberately do
-- NOT read a role from the sign-up data: the app (and so a hacker) controls that.
-- ---------------------------------------------------------------------
create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_lang text := coalesce(new.raw_user_meta_data ->> 'preferred_language', 'en');
begin
  if v_lang not in ('en', 'fr') then v_lang := 'en'; end if;
  insert into public.profiles (id, full_name, preferred_language)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), v_lang);
  return new;
end $$;
revoke execute on function private.handle_new_user() from public;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Second lock on the role: even if a grant is added by mistake later, a role
-- can only change from the dashboard/server (no logged-in user) or by an admin.
create function private.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not private.is_admin() then
    raise exception 'only an admin can change a role' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function private.guard_profile_role() from public;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function private.guard_profile_role();

-- Assignments must be practitioner -> client.
create function private.validate_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select role from public.profiles where id = new.practitioner_id) <> 'practitioner' then
    raise exception 'practitioner_id must belong to a practitioner' using errcode = '23514';
  end if;
  if (select role from public.profiles where id = new.client_id) <> 'client' then
    raise exception 'client_id must belong to a client' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function private.validate_assignment() from public;
create trigger practitioner_clients_validate before insert or update on public.practitioner_clients
  for each row execute function private.validate_assignment();

-- ---------------------------------------------------------------------
-- The ONLY way to change someone's role from the app: an admin calls this.
-- It checks the caller is an admin, refuses self-change, and writes the audit log.
-- ---------------------------------------------------------------------
create function public.admin_set_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old public.user_role;
begin
  if not private.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'admins cannot change their own role' using errcode = '42501';
  end if;
  select role into v_old from public.profiles where id = p_user;
  if v_old is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  update public.profiles set role = p_role where id = p_user;
  insert into public.audit_log (actor_id, action, target_table, target_id, details)
  values ((select auth.uid()), 'set_role', 'profiles', p_user,
          jsonb_build_object('from', v_old, 'to', p_role));
end $$;
revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;

-- ---------------------------------------------------------------------
-- Policies. "to authenticated" = logged-in only. (select auth.uid()) is
-- evaluated once per query instead of once per row (much faster).
-- ---------------------------------------------------------------------
-- profiles: you see yourself; everyone logged in sees practitioners (for booking);
-- a practitioner sees assigned clients; an admin sees all.
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or role = 'practitioner'
  or (select private.is_admin())
  or (select private.is_assigned(id))
);
-- You may update your own row (admins any row). Which COLUMNS is limited by the grants below.
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));
-- No insert or delete policy on profiles: rows are created by the trigger above.

-- Column-level lock: the app may change ONLY name and language. Not role. Never.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, preferred_language) on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- practitioner_clients: read your own assignments; only admins write.
create policy practitioner_clients_select on public.practitioner_clients for select to authenticated using (
  practitioner_id = (select auth.uid()) or client_id = (select auth.uid()) or (select private.is_admin())
);
create policy practitioner_clients_admin_write on public.practitioner_clients for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on public.practitioner_clients from anon, authenticated;
grant select, insert, update, delete on public.practitioner_clients to authenticated;  -- policies: only admins write
grant all on public.practitioner_clients to service_role;

-- audit_log: admins read. Nobody writes from the app.
create policy audit_log_select on public.audit_log for select to authenticated using ((select private.is_admin()));
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;   -- admins only (policy); nobody can write from the app
grant all on public.audit_log to service_role;       -- the server (Edge Functions) writes the log
grant usage, select on all sequences in schema public to service_role;

-- business_settings: everyone logged in reads; admin changes.
create policy business_settings_select on public.business_settings for select to authenticated using (true);
create policy business_settings_update on public.business_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on public.business_settings from anon, authenticated;
grant select on public.business_settings to authenticated;
grant update (timezone) on public.business_settings to authenticated;   -- admins only (policy)
grant all on public.business_settings to service_role;

commit;
