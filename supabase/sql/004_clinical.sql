-- =====================================================================
-- GUKANDA 004: clinical (assessments, findings, notes, reports)
-- Run AFTER 003. One transaction: all or nothing.
-- Wording is non-diagnostic: "observations" and "areas of tension" only.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- assessments: a draft the practitioner works on, then FINAL (locked).
-- Clients never read assessments or findings directly; they read REPORTS.
-- ---------------------------------------------------------------------
create type public.assessment_status as enum ('draft', 'final');

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  practitioner_id uuid not null references public.profiles (id) on delete restrict,
  appointment_id uuid references public.appointments (id) on delete set null,
  status public.assessment_status not null default 'draft',
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'final') = (finalized_at is not null))
);
create index assessments_client_idx on public.assessments (client_id);
create index assessments_practitioner_idx on public.assessments (practitioner_id);
create index assessments_appointment_idx on public.assessments (appointment_id);
create trigger assessments_touch before update on public.assessments
  for each row execute function private.touch_updated_at();

-- Draft -> final stamps the time. Once final, the row can never change again.
create function private.lock_final_assessment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'final' then
    raise exception 'a final assessment cannot be changed' using errcode = '23514';
  end if;
  if new.status = 'final' then new.finalized_at := now(); end if;
  return new;
end $$;
create trigger assessments_lock before update on public.assessments
  for each row execute function private.lock_final_assessment();

alter table public.assessments enable row level security;

-- Helper: may the logged-in user read / edit the findings of this assessment?
create function private.can_read_assessment(p_assessment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assessments a
    where a.id = p_assessment and private.can_staff_access_client(a.client_id)
  )
$$;
create function private.can_edit_assessment(p_assessment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assessments a
    where a.id = p_assessment and a.status = 'draft'
      and (private.is_admin() or a.practitioner_id = (select auth.uid()))
  )
$$;
revoke execute on function private.can_read_assessment(uuid), private.can_edit_assessment(uuid) from public;
grant execute on function private.can_read_assessment(uuid), private.can_edit_assessment(uuid) to authenticated;

create policy assessments_select on public.assessments for select to authenticated
  using ((select private.can_staff_access_client(client_id)));
create policy assessments_insert on public.assessments for insert to authenticated with check (
  status = 'draft' and (
    (select private.is_admin())
    or (practitioner_id = (select auth.uid()) and (select private.is_assigned(client_id)))
  )
);
create policy assessments_update on public.assessments for update to authenticated
  using (status = 'draft' and ((select private.is_admin()) or practitioner_id = (select auth.uid())))
  with check ((select private.is_admin()) or practitioner_id = (select auth.uid()));
create policy assessments_delete on public.assessments for delete to authenticated
  using (status = 'draft' and ((select private.is_admin()) or practitioner_id = (select auth.uid())));
revoke all on public.assessments from anon, authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
grant all on public.assessments to service_role;

-- ---------------------------------------------------------------------
-- assessment_findings: what the practitioner observed on the body map.
-- ---------------------------------------------------------------------
create table public.assessment_findings (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  body_view text not null check (body_view in ('front', 'back')),
  region text not null check (char_length(region) between 1 and 60),   -- e.g. trapezius_upper
  side text not null default 'both' check (side in ('left', 'right', 'both')),
  observations text[] not null default '{}'
    check (observations <@ array['muscular_tension','stiffness','tenderness_to_pressure','restricted_movement','fascial_restriction','other']),
  intensity smallint check (intensity between 0 and 10),
  note text check (char_length(note) <= 2000),
  addressed_in_session boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assessment_findings_assessment_idx on public.assessment_findings (assessment_id);
create trigger assessment_findings_touch before update on public.assessment_findings
  for each row execute function private.touch_updated_at();
alter table public.assessment_findings enable row level security;
create policy assessment_findings_select on public.assessment_findings for select to authenticated
  using ((select private.can_read_assessment(assessment_id)));
create policy assessment_findings_write on public.assessment_findings for all to authenticated
  using ((select private.can_edit_assessment(assessment_id)))
  with check ((select private.can_edit_assessment(assessment_id)));
revoke all on public.assessment_findings from anon, authenticated;
grant select, insert, update, delete on public.assessment_findings to authenticated;
grant all on public.assessment_findings to service_role;

-- ---------------------------------------------------------------------
-- session_notes: notes about a session, shared with staff who have access to the client.
-- practitioner_notes: PRIVATE notes, only their author (and the admin) can read.
-- Neither table has any policy for clients, so clients get nothing.
-- ---------------------------------------------------------------------
create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  practitioner_id uuid not null references public.profiles (id) on delete restrict,
  appointment_id uuid references public.appointments (id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_notes_client_idx on public.session_notes (client_id);
create index session_notes_practitioner_idx on public.session_notes (practitioner_id);
create index session_notes_appointment_idx on public.session_notes (appointment_id);
create trigger session_notes_touch before update on public.session_notes
  for each row execute function private.touch_updated_at();
alter table public.session_notes enable row level security;
create policy session_notes_select on public.session_notes for select to authenticated
  using ((select private.can_staff_access_client(client_id)));
create policy session_notes_insert on public.session_notes for insert to authenticated with check (
  practitioner_id = (select auth.uid()) and (select private.is_assigned(client_id))
);
create policy session_notes_update on public.session_notes for update to authenticated
  using (practitioner_id = (select auth.uid())) with check (practitioner_id = (select auth.uid()));
create policy session_notes_delete on public.session_notes for delete to authenticated
  using (practitioner_id = (select auth.uid()) or (select private.is_admin()));
revoke all on public.session_notes from anon, authenticated;
grant select, insert, update, delete on public.session_notes to authenticated;
grant all on public.session_notes to service_role;

create table public.practitioner_notes (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index practitioner_notes_practitioner_idx on public.practitioner_notes (practitioner_id);
create index practitioner_notes_client_idx on public.practitioner_notes (client_id);
create trigger practitioner_notes_touch before update on public.practitioner_notes
  for each row execute function private.touch_updated_at();
alter table public.practitioner_notes enable row level security;
create policy practitioner_notes_select on public.practitioner_notes for select to authenticated
  using (practitioner_id = (select auth.uid()) or (select private.is_admin()));
create policy practitioner_notes_insert on public.practitioner_notes for insert to authenticated with check (
  practitioner_id = (select auth.uid())
  and (select private.my_role()) = 'practitioner'
  and (client_id is null or (select private.is_assigned(client_id)))
);
create policy practitioner_notes_update on public.practitioner_notes for update to authenticated
  using (practitioner_id = (select auth.uid())) with check (practitioner_id = (select auth.uid()));
create policy practitioner_notes_delete on public.practitioner_notes for delete to authenticated
  using (practitioner_id = (select auth.uid()) or (select private.is_admin()));
revoke all on public.practitioner_notes from anon, authenticated;
grant select, insert, update, delete on public.practitioner_notes to authenticated;
grant all on public.practitioner_notes to service_role;

-- ---------------------------------------------------------------------
-- reports: what the client can read in "My Reports". Hidden until the
-- practitioner turns visible_to_client on.
-- ---------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  assessment_id uuid references public.assessments (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  summary text check (char_length(summary) <= 10000),
  recommendations text check (char_length(recommendations) <= 10000),
  language text not null default 'en' check (language in ('en', 'fr')),
  visible_to_client boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_client_idx on public.reports (client_id);
create index reports_assessment_idx on public.reports (assessment_id);
create index reports_author_idx on public.reports (author_id);
create trigger reports_touch before update on public.reports
  for each row execute function private.touch_updated_at();

create function private.stamp_report_publish()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.visible_to_client and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
create trigger reports_stamp before insert or update on public.reports
  for each row execute function private.stamp_report_publish();

alter table public.reports enable row level security;
create policy reports_select on public.reports for select to authenticated using (
  (client_id = (select auth.uid()) and visible_to_client)
  or (select private.can_staff_access_client(client_id))
);
create policy reports_insert on public.reports for insert to authenticated with check (
  (select private.is_admin())
  or (author_id = (select auth.uid()) and (select private.is_assigned(client_id)))
);
create policy reports_update on public.reports for update to authenticated
  using ((select private.is_admin()) or author_id = (select auth.uid()))
  with check ((select private.is_admin()) or author_id = (select auth.uid()));
create policy reports_delete on public.reports for delete to authenticated
  using ((select private.is_admin()) or author_id = (select auth.uid()));

revoke all on public.reports from anon, authenticated;
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;

-- Safety net: logged-out visitors get nothing, on any table.
revoke all on all tables in schema public from anon;
commit;
