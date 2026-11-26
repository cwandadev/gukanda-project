-- =====================================================================
-- GUKANDA 002: scheduling (services, availability, time off, appointments)
-- Run AFTER 001. One transaction: all or nothing.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- services: what can be booked. Admin manages; everyone logged in reads active ones.
-- ---------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name_en text not null check (char_length(name_en) between 1 and 120),
  name_fr text not null check (char_length(name_fr) between 1 and 120),
  duration_minutes int not null check (duration_minutes between 15 and 480),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger services_touch before update on public.services
  for each row execute function private.touch_updated_at();
alter table public.services enable row level security;
create policy services_select on public.services for select to authenticated
  using (active or (select private.is_admin()));
create policy services_admin_write on public.services for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on public.services from anon, authenticated;
grant select, insert, update, delete on public.services to authenticated;   -- policies: only admins write
grant all on public.services to service_role;

insert into public.services (name_en, name_fr, duration_minutes, sort_order) values
  ('Initial assessment', 'Évaluation initiale', 60, 10),
  ('Follow-up session', 'Séance de suivi', 60, 20);

-- ---------------------------------------------------------------------
-- availability: weekly opening hours per practitioner.
-- weekday: 0 = Sunday ... 6 = Saturday. Times are WALL-CLOCK in the business
-- time zone (a weekly rule like "Mon 09:00-17:00" has no UTC value).
-- ---------------------------------------------------------------------
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index availability_practitioner_idx on public.availability (practitioner_id);
alter table public.availability enable row level security;
-- Opening hours are not secret: everyone logged in can read (the booking screen needs them).
create policy availability_select on public.availability for select to authenticated using (true);
create policy availability_write on public.availability for all to authenticated
  using (practitioner_id = (select auth.uid()) or (select private.is_admin()))
  with check (
    (select private.is_admin())
    or (practitioner_id = (select auth.uid()) and (select private.my_role()) = 'practitioner')
  );
revoke all on public.availability from anon, authenticated;
grant select, insert, update, delete on public.availability to authenticated;
grant all on public.availability to service_role;

-- ---------------------------------------------------------------------
-- time_off: blocked periods (UTC). Staff only; clients never see the reason.
-- ---------------------------------------------------------------------
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (char_length(reason) <= 200),
  check (ends_at > starts_at)
);
create index time_off_practitioner_idx on public.time_off (practitioner_id, starts_at);
alter table public.time_off enable row level security;
create policy time_off_all on public.time_off for all to authenticated
  using (practitioner_id = (select auth.uid()) or (select private.is_admin()))
  with check (
    (select private.is_admin())
    or (practitioner_id = (select auth.uid()) and (select private.my_role()) = 'practitioner')
  );
revoke all on public.time_off from anon, authenticated;
grant select, insert, update, delete on public.time_off to authenticated;
grant all on public.time_off to service_role;

-- ---------------------------------------------------------------------
-- appointments. Times are UTC (timestamptz). The database itself refuses two
-- non-cancelled appointments that overlap for the same practitioner.
-- Clients do NOT write here directly: booking / cancelling / rescheduling will go
-- through database functions (next chunk) so the rules cannot be skipped.
-- ---------------------------------------------------------------------
create type public.appointment_status as enum ('booked', 'cancelled', 'completed');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  practitioner_id uuid not null references public.profiles (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'booked',
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancel_reason text check (char_length(cancel_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  -- THE overlap rule: same practitioner + overlapping time range + not cancelled = rejected.
  -- '[)' means the end moment is free: 10:00-11:00 and 11:00-12:00 do not clash.
  constraint appointments_no_overlap exclude using gist (
    practitioner_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create index appointments_client_idx on public.appointments (client_id, starts_at);
create index appointments_practitioner_idx on public.appointments (practitioner_id, starts_at);
create index appointments_service_idx on public.appointments (service_id);
create trigger appointments_touch before update on public.appointments
  for each row execute function private.touch_updated_at();
alter table public.appointments enable row level security;

-- reschedule history: one row each time an appointment's time changes.
-- Filled by a trigger, so nobody can forge or hide it. client/practitioner are
-- copied in so the read policy needs no join.
create table public.appointment_reschedules (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  client_id uuid not null,
  practitioner_id uuid not null,
  old_starts_at timestamptz not null,
  old_ends_at timestamptz not null,
  new_starts_at timestamptz not null,
  new_ends_at timestamptz not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index appointment_reschedules_appt_idx on public.appointment_reschedules (appointment_id);
create index appointment_reschedules_client_idx on public.appointment_reschedules (client_id);
create index appointment_reschedules_practitioner_idx on public.appointment_reschedules (practitioner_id);
alter table public.appointment_reschedules enable row level security;

create function private.log_reschedule()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at then
    insert into public.appointment_reschedules
      (appointment_id, client_id, practitioner_id, old_starts_at, old_ends_at, new_starts_at, new_ends_at, changed_by)
    values (new.id, new.client_id, new.practitioner_id, old.starts_at, old.ends_at, new.starts_at, new.ends_at, (select auth.uid()));
  end if;
  return new;
end $$;
revoke execute on function private.log_reschedule() from public;
create trigger appointments_log_reschedule after update on public.appointments
  for each row execute function private.log_reschedule();

-- Read: the client, the practitioner, assigned staff, admin.
create policy appointments_select on public.appointments for select to authenticated using (
  client_id = (select auth.uid())
  or practitioner_id = (select auth.uid())
  or (select private.can_staff_access_client(client_id))
);
-- Write: admin, or a practitioner for their own appointments with an ASSIGNED client.
create policy appointments_insert on public.appointments for insert to authenticated with check (
  (select private.is_admin())
  or (practitioner_id = (select auth.uid()) and (select private.is_assigned(client_id)))
);
create policy appointments_update on public.appointments for update to authenticated
  using ((select private.is_admin()) or (practitioner_id = (select auth.uid()) and (select private.is_assigned(client_id))))
  with check ((select private.is_admin()) or (practitioner_id = (select auth.uid()) and (select private.is_assigned(client_id))));
create policy appointments_delete on public.appointments for delete to authenticated
  using ((select private.is_admin()));

create policy appointment_reschedules_select on public.appointment_reschedules for select to authenticated using (
  client_id = (select auth.uid())
  or practitioner_id = (select auth.uid())
  or (select private.can_staff_access_client(client_id))
);
-- appointments: the policies above decide who may write (admin / practitioner of an assigned client).
revoke all on public.appointments from anon, authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
-- reschedule history: read-only for everyone; only the trigger writes it.
revoke all on public.appointment_reschedules from anon, authenticated;
grant select on public.appointment_reschedules to authenticated;
grant all on public.appointment_reschedules to service_role;

commit;
