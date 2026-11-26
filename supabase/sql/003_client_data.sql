-- =====================================================================
-- GUKANDA 003: client data (intake, health screening, consents)
-- Run AFTER 002. One transaction: all or nothing.
-- This is sensitive health-related data: every table here is readable only by
-- (a) the client themself and (b) staff with access to that client (admin or assigned practitioner).
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- client_intake: one row per client (they can edit it as things change).
-- ---------------------------------------------------------------------
create table public.client_intake (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date not null,
  guardian_name text check (char_length(guardian_name) <= 120),
  concerns text[] not null default '{}'
    check (concerns <@ array['neck','shoulder','upper_back','lower_back','hip_pelvis','leg','other']),
  concerns_other text check (char_length(concerns_other) <= 500),
  issue_duration text check (issue_duration in ('under_1_month','1_3_months','3_6_months','6_12_months','over_12_months')),
  aggravating_factor text check (char_length(aggravating_factor) <= 300),
  activity_level text check (activity_level in ('low','moderate','high')),
  injuries text check (char_length(injuries) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger client_intake_touch before update on public.client_intake
  for each row execute function private.touch_updated_at();

-- Rules that depend on "today" cannot be plain CHECKs, so a trigger enforces them:
-- a realistic birth date, and a guardian name for anyone under 18.
create function private.validate_intake()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.date_of_birth > current_date or new.date_of_birth < date '1900-01-01' then
    raise exception 'invalid date of birth' using errcode = '23514';
  end if;
  if age(current_date, new.date_of_birth) < interval '18 years'
     and coalesce(btrim(new.guardian_name), '') = '' then
    raise exception 'guardian name is required for clients under 18' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger client_intake_validate before insert or update on public.client_intake
  for each row execute function private.validate_intake();

alter table public.client_intake enable row level security;
create policy client_intake_select on public.client_intake for select to authenticated using (
  client_id = (select auth.uid()) or (select private.can_staff_access_client(client_id))
);
create policy client_intake_insert on public.client_intake for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy client_intake_update on public.client_intake for update to authenticated
  using (client_id = (select auth.uid()) or (select private.is_admin()))
  with check (client_id = (select auth.uid()) or (select private.is_admin()));
revoke all on public.client_intake from anon, authenticated;
grant select, insert, update on public.client_intake to authenticated;
grant all on public.client_intake to service_role;

-- ---------------------------------------------------------------------
-- health_screening: red-flag questions. Append-only for the client (a new
-- screening = a new row). Staff may only mark it reviewed.
-- answers is JSON like {"recent_trauma": false, "fever": true, ...}; question_set_version
-- says which question list was shown, so old answers stay understandable.
-- ---------------------------------------------------------------------
create table public.health_screening (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  question_set_version text not null check (char_length(question_set_version) <= 40),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index health_screening_client_idx on public.health_screening (client_id);
create index health_screening_appointment_idx on public.health_screening (appointment_id);
create index health_screening_reviewed_by_idx on public.health_screening (reviewed_by);
alter table public.health_screening enable row level security;
create policy health_screening_select on public.health_screening for select to authenticated using (
  client_id = (select auth.uid()) or (select private.can_staff_access_client(client_id))
);
create policy health_screening_insert on public.health_screening for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy health_screening_review on public.health_screening for update to authenticated
  using ((select private.can_staff_access_client(client_id)))
  with check ((select private.can_staff_access_client(client_id)));
-- Column grants: clients can only set these on insert; staff can only touch the review fields.
revoke all on public.health_screening from anon, authenticated;
grant select on public.health_screening to authenticated;
grant insert (client_id, appointment_id, question_set_version, answers) on public.health_screening to authenticated;
grant update (reviewed_by, reviewed_at) on public.health_screening to authenticated;
grant all on public.health_screening to service_role;

-- ---------------------------------------------------------------------
-- consents: a permanent record of what was accepted, which text version,
-- in which language, and WHEN. The time is set by the database, not the app.
-- ---------------------------------------------------------------------
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  consent_type text not null check (consent_type in ('terms','privacy','health_data','assessment','guardian')),
  text_version text not null check (char_length(text_version) <= 40),
  language text not null check (language in ('en','fr')),
  accepted_at timestamptz not null default now()
);
create index consents_client_idx on public.consents (client_id);
alter table public.consents enable row level security;
create policy consents_select on public.consents for select to authenticated using (
  client_id = (select auth.uid()) or (select private.can_staff_access_client(client_id))
);
create policy consents_insert on public.consents for insert to authenticated
  with check (client_id = (select auth.uid()));
revoke all on public.consents from anon, authenticated;
grant select on public.consents to authenticated;
grant insert (client_id, consent_type, text_version, language) on public.consents to authenticated;
grant all on public.consents to service_role;

commit;
