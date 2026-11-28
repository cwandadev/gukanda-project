-- =====================================================================
-- GUKANDA 005: booking rules, France time zone, working-hours and time-off functions
-- Run AFTER 004. One transaction: all or nothing.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- Business rules the admin can change in the app (the next chunk uses them to book).
--   cancel_notice_hours  : a client may cancel or reschedule only this long before the appointment
--   slot_step_minutes    : bookable start times fall on this grid (e.g. 09:00, 09:30, ...)
--   booking_horizon_days : how far ahead a client may book
-- ---------------------------------------------------------------------
alter table public.business_settings
  add column cancel_notice_hours int not null default 24 check (cancel_notice_hours between 0 and 720),
  add column slot_step_minutes int not null default 30 check (slot_step_minutes in (10, 15, 20, 30, 60)),
  add column booking_horizon_days int not null default 60 check (booking_horizon_days between 1 and 365);

alter table public.business_settings alter column timezone set default 'Europe/Paris';
update public.business_settings set timezone = 'Europe/Paris';   -- the business is in France

-- A typo in the time zone would silently shift every appointment, so unknown names are refused.
create function private.validate_timezone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'unknown time zone: %', new.timezone using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function private.validate_timezone() from public;
create trigger business_settings_validate_tz before insert or update on public.business_settings
  for each row execute function private.validate_timezone();

-- Who may change them: admins only (policy from 001). Now with the new columns:
grant update (timezone, cancel_notice_hours, slot_step_minutes, booking_horizon_days)
  on public.business_settings to authenticated;

-- ---------------------------------------------------------------------
-- set_weekly_hours: replace ALL of a practitioner's weekly opening hours in one step.
-- Runs with the CALLER's rights (no "security definer"), so the availability policies
-- still decide who may do it: a practitioner for themselves, an admin for anyone.
-- p_hours looks like: [{"weekday":1,"start_time":"09:00","end_time":"12:00"}, ...]
-- weekday: 0 = Sunday ... 6 = Saturday. Times are wall-clock in the business time zone.
-- ---------------------------------------------------------------------
create function public.set_weekly_hours(p_practitioner uuid, p_hours jsonb)
returns void language plpgsql set search_path = '' as $$
begin
  if jsonb_typeof(p_hours) is distinct from 'array' then
    raise exception 'hours_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_practitioner and role = 'practitioner') then
    raise exception 'not_a_practitioner' using errcode = '42501';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_hours) x
    where (x ->> 'weekday')::smallint not between 0 and 6
       or (x ->> 'end_time')::time <= (x ->> 'start_time')::time
  ) then
    raise exception 'hours_invalid' using errcode = '23514';
  end if;
  -- two ranges on the same day must not overlap
  if exists (
    with h as (
      select ord, (x ->> 'weekday')::smallint as wd, (x ->> 'start_time')::time as s, (x ->> 'end_time')::time as e
      from jsonb_array_elements(p_hours) with ordinality as t(x, ord)
    )
    select 1 from h a join h b on a.wd = b.wd and a.ord < b.ord and a.s < b.e and b.s < a.e
  ) then
    raise exception 'hours_overlap' using errcode = '23514';
  end if;

  delete from public.availability where practitioner_id = p_practitioner;
  insert into public.availability (practitioner_id, weekday, start_time, end_time)
  select p_practitioner, (x ->> 'weekday')::smallint, (x ->> 'start_time')::time, (x ->> 'end_time')::time
  from jsonb_array_elements(p_hours) x;
end $$;
revoke execute on function public.set_weekly_hours(uuid, jsonb) from public, anon;
grant execute on function public.set_weekly_hours(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- add_time_off: the app sends LOCAL (France) date-times; the database turns them into UTC
-- using the business time zone, so summer/winter time is always right.
-- Also runs with the caller's rights (time_off policies apply).
-- ---------------------------------------------------------------------
create function public.add_time_off(p_practitioner uuid, p_start_local timestamp, p_end_local timestamp, p_reason text default null)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_tz text;
  v_id uuid;
begin
  select timezone into v_tz from public.business_settings;
  if p_end_local <= p_start_local then
    raise exception 'time_off_invalid' using errcode = '23514';
  end if;
  insert into public.time_off (practitioner_id, starts_at, ends_at, reason)
  values (p_practitioner, p_start_local at time zone v_tz, p_end_local at time zone v_tz, nullif(btrim(p_reason), ''))
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.add_time_off(uuid, timestamp, timestamp, text) from public, anon;
grant execute on function public.add_time_off(uuid, timestamp, timestamp, text) to authenticated;

commit;
