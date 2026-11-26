-- =====================================================================
-- GUKANDA 900: SECURITY TEST. Safe to run any time, on the real project.
-- Paste the whole file in Supabase SQL Editor and press Run.
-- It creates fake users and fake data INSIDE a temporary block, acts as each
-- of them (client A, client B, two practitioners, an admin, a visitor), tries
-- to break the rules, then throws every fake row away. Nothing is left behind.
-- Read the result table: every row must say passed = true.
-- (Need to run it again? Just run it again.)
-- =====================================================================

-- ---- helpers: they act "as" a user by setting the same values Supabase sets for a real request ----
create function pg_temp.t_count(label text, uid uuid, rl text, q text, expected bigint) returns jsonb
language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', rl)::text, true);
  execute format('set local role %I', rl);
  begin
    execute q into n;
  exception when others then
    reset role; perform set_config('request.jwt.claims', '', true);
    return jsonb_build_object('test', label, 'passed', false, 'detail', 'ERROR: ' || sqlerrm);
  end;
  reset role; perform set_config('request.jwt.claims', '', true);
  return jsonb_build_object('test', label, 'passed', n = expected, 'detail', 'got ' || n || ', expected ' || expected);
end $$;

-- expects the statement to be REFUSED
create function pg_temp.t_refused(label text, uid uuid, rl text, q text) returns jsonb
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', rl)::text, true);
  execute format('set local role %I', rl);
  begin
    execute q;
  exception when others then
    reset role; perform set_config('request.jwt.claims', '', true);
    return jsonb_build_object('test', label, 'passed', true, 'detail', 'refused: ' || sqlerrm);
  end;
  reset role; perform set_config('request.jwt.claims', '', true);
  return jsonb_build_object('test', label, 'passed', false, 'detail', 'WAS ALLOWED (should be refused)');
end $$;

-- expects the statement to WORK
create function pg_temp.t_allowed(label text, uid uuid, rl text, q text) returns jsonb
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', rl)::text, true);
  execute format('set local role %I', rl);
  begin
    execute q;
  exception when others then
    reset role; perform set_config('request.jwt.claims', '', true);
    return jsonb_build_object('test', label, 'passed', false, 'detail', 'ERROR: ' || sqlerrm);
  end;
  reset role; perform set_config('request.jwt.claims', '', true);
  return jsonb_build_object('test', label, 'passed', true, 'detail', 'ok');
end $$;

create function pg_temp.run_security_tests() returns table (test text, passed boolean, detail text)
language plpgsql as $fn$
declare
  r jsonb := '[]'::jsonb;
  ca uuid := gen_random_uuid();   -- client A
  cb uuid := gen_random_uuid();   -- client B
  pa uuid := gen_random_uuid();   -- practitioner assigned to A
  pq uuid := gen_random_uuid();   -- practitioner assigned to B only
  ad uuid := gen_random_uuid();   -- admin
  ex uuid := gen_random_uuid();   -- sneaky sign-up that asks to be admin
  svc uuid; appt_a uuid; appt_b uuid; asm uuid; asm2 uuid;
  t0 timestamptz := date_trunc('hour', now()) + interval '2 days';
  ids text;
begin
  begin  -- everything below is rolled back at the end
    -- ---------- seed (as the database owner) ----------
    insert into auth.users (id, email, raw_user_meta_data) values
      (ca, 'a@test.invalid', '{}'), (cb, 'b@test.invalid', '{}'),
      (pa, 'pa@test.invalid', '{}'), (pq, 'pq@test.invalid', '{}'), (ad, 'ad@test.invalid', '{}'),
      (ex, 'ex@test.invalid', '{"role":"admin","full_name":"Sneaky"}');
    update public.profiles set role = 'practitioner' where id in (pa, pq);
    update public.profiles set role = 'admin' where id = ad;
    insert into public.practitioner_clients (practitioner_id, client_id) values (pa, ca), (pq, cb);
    select id into svc from public.services order by sort_order limit 1;
    insert into public.appointments (client_id, practitioner_id, service_id, starts_at, ends_at)
      values (ca, pa, svc, t0, t0 + interval '1 hour') returning id into appt_a;
    insert into public.appointments (client_id, practitioner_id, service_id, starts_at, ends_at)
      values (cb, pq, svc, t0, t0 + interval '1 hour') returning id into appt_b;
    insert into public.client_intake (client_id, date_of_birth, concerns) values (ca, date '1990-01-01', '{neck}'), (cb, date '1991-01-01', '{lower_back}');
    insert into public.health_screening (client_id, question_set_version, answers) values (ca, 'v1', '{"fever":false}'), (cb, 'v1', '{"fever":true}');
    insert into public.consents (client_id, consent_type, text_version, language) values (ca, 'privacy', 'v1', 'en'), (cb, 'privacy', 'v1', 'en');
    insert into public.assessments (client_id, practitioner_id) values (ca, pa) returning id into asm;
    insert into public.assessments (client_id, practitioner_id) values (cb, pq) returning id into asm2;
    insert into public.assessment_findings (assessment_id, body_view, region) values (asm, 'back', 'trapezius_upper'), (asm2, 'back', 'lumbar');
    insert into public.session_notes (client_id, practitioner_id, body) values (ca, pa, 'note A'), (cb, pq, 'note B');
    insert into public.practitioner_notes (practitioner_id, client_id, body) values (pa, ca, 'private pa'), (pq, cb, 'private pq');
    insert into public.reports (client_id, author_id, title, visible_to_client) values (ca, pa, 'A visible', true), (ca, pa, 'A hidden', false), (cb, pq, 'B visible', true);

    -- ---------- 1. sign-up cannot create an admin ----------
    r := r || pg_temp.t_count('1.1 sign-up asking for role=admin still becomes a client', ex, 'authenticated',
      format('select count(*) from public.profiles where id = %L and role = ''client''', ex), 1);

    -- ---------- 2. CLIENT A ----------
    r := r || pg_temp.t_count('2.1 client A sees own profile', ca, 'authenticated', format('select count(*) from public.profiles where id = %L', ca), 1);
    r := r || pg_temp.t_count('2.2 client A cannot see client B profile', ca, 'authenticated', format('select count(*) from public.profiles where id = %L', cb), 0);
    r := r || pg_temp.t_count('2.3 client A sees only own intake', ca, 'authenticated', format('select count(*) from public.client_intake where client_id in (%L,%L)', ca, cb), 1);
    r := r || pg_temp.t_count('2.4 client A cannot read B intake', ca, 'authenticated', format('select count(*) from public.client_intake where client_id = %L', cb), 0);
    r := r || pg_temp.t_count('2.5 client A cannot read B health screening', ca, 'authenticated', format('select count(*) from public.health_screening where client_id = %L', cb), 0);
    r := r || pg_temp.t_count('2.6 client A cannot read B consents', ca, 'authenticated', format('select count(*) from public.consents where client_id = %L', cb), 0);
    r := r || pg_temp.t_count('2.7 client A cannot read B appointments', ca, 'authenticated', format('select count(*) from public.appointments where client_id = %L', cb), 0);
    r := r || pg_temp.t_count('2.8 client A sees own appointment', ca, 'authenticated', format('select count(*) from public.appointments where client_id = %L', ca), 1);
    r := r || pg_temp.t_count('2.9 client A cannot read session notes', ca, 'authenticated', format('select count(*) from public.session_notes where client_id in (%L,%L)', ca, cb), 0);
    r := r || pg_temp.t_count('2.10 client A cannot read practitioner notes', ca, 'authenticated', format('select count(*) from public.practitioner_notes where practitioner_id in (%L,%L)', pa, pq), 0);
    r := r || pg_temp.t_count('2.11 client A cannot read assessments', ca, 'authenticated', format('select count(*) from public.assessments where client_id in (%L,%L)', ca, cb), 0);
    r := r || pg_temp.t_count('2.12 client A cannot read assessment findings', ca, 'authenticated', format('select count(*) from public.assessment_findings where assessment_id in (%L,%L)', asm, asm2), 0);
    r := r || pg_temp.t_count('2.13 client A sees only own VISIBLE report', ca, 'authenticated', format('select count(*) from public.reports where client_id in (%L,%L)', ca, cb), 1);
    r := r || pg_temp.t_count('2.14 client A cannot read the audit log', ca, 'authenticated', 'select count(*) from public.audit_log', 0);
    r := r || pg_temp.t_refused('2.15 client A cannot change own role', ca, 'authenticated', format('update public.profiles set role = ''admin'' where id = %L', ca));
    r := r || pg_temp.t_allowed('2.16 client A can change own name', ca, 'authenticated', format('update public.profiles set full_name = ''Alice'' where id = %L', ca));
    r := r || pg_temp.t_count('2.17 client A cannot edit B profile (0 rows changed)', ca, 'authenticated',
      format('with u as (update public.profiles set full_name = ''hacked'' where id = %L returning 1) select count(*) from u', cb), 0);
    r := r || pg_temp.t_refused('2.18 client A cannot insert a profile', ca, 'authenticated', format('insert into public.profiles (id, role) values (%L, ''admin'')', gen_random_uuid()));
    r := r || pg_temp.t_refused('2.19 client A cannot assign self to a practitioner', ca, 'authenticated', format('insert into public.practitioner_clients (practitioner_id, client_id) values (%L, %L)', pq, ca));
    r := r || pg_temp.t_refused('2.20 client A cannot write appointments directly', ca, 'authenticated',
      format('insert into public.appointments (client_id, practitioner_id, service_id, starts_at, ends_at) values (%L,%L,%L,%L,%L)', ca, pa, svc, t0 + interval '5 days', t0 + interval '5 days 1 hour'));
    r := r || pg_temp.t_count('2.21 client A cannot reschedule or cancel (0 rows changed)', ca, 'authenticated',
      format('with u as (update public.appointments set status = ''cancelled'', cancelled_at = now() where id = %L returning 1) select count(*) from u', appt_a), 0);
    r := r || pg_temp.t_refused('2.22 client A cannot call admin_set_role', ca, 'authenticated', format('select public.admin_set_role(%L, ''admin'')', ca));
    r := r || pg_temp.t_refused('2.23 client A cannot write the audit log', ca, 'authenticated', 'insert into public.audit_log (action) values (''fake'')');
    r := r || pg_temp.t_allowed('2.24 client A can record own consent', ca, 'authenticated', format('insert into public.consents (client_id, consent_type, text_version, language) values (%L, ''terms'', ''v1'', ''fr'')', ca));
    r := r || pg_temp.t_refused('2.25 client A cannot record a consent for B', ca, 'authenticated', format('insert into public.consents (client_id, consent_type, text_version, language) values (%L, ''terms'', ''v1'', ''fr'')', cb));
    r := r || pg_temp.t_refused('2.26 client A cannot forge the consent time', ca, 'authenticated', format('insert into public.consents (client_id, consent_type, text_version, language, accepted_at) values (%L, ''terms'', ''v1'', ''fr'', now() - interval ''1 year'')', ca));
    r := r || pg_temp.t_refused('2.27 client A cannot call the private helper functions through the API schema', ca, 'authenticated', 'select public.is_admin()');

    -- ---------- 3. PRACTITIONER A (assigned to client A only) ----------
    r := r || pg_temp.t_count('3.1 practitioner sees assigned client profile', pa, 'authenticated', format('select count(*) from public.profiles where id = %L', ca), 1);
    r := r || pg_temp.t_count('3.2 practitioner cannot see UNASSIGNED client profile', pa, 'authenticated', format('select count(*) from public.profiles where id = %L', cb), 0);
    r := r || pg_temp.t_count('3.3 practitioner reads assigned client intake', pa, 'authenticated', format('select count(*) from public.client_intake where client_id = %L', ca), 1);
    r := r || pg_temp.t_count('3.4 practitioner cannot read unassigned intake', pa, 'authenticated', format('select count(*) from public.client_intake where client_id = %L', cb), 0);
    r := r || pg_temp.t_count('3.5 practitioner cannot read unassigned health screening', pa, 'authenticated', format('select count(*) from public.health_screening where client_id = %L', cb), 0);
    r := r || pg_temp.t_count('3.6 practitioner cannot read unassigned appointments', pa, 'authenticated', format('select count(*) from public.appointments where client_id = %L', cb), 0);
    r := r || pg_temp.t_count('3.7 practitioner reads session notes of assigned client', pa, 'authenticated', format('select count(*) from public.session_notes where client_id = %L', ca), 1);
    r := r || pg_temp.t_count('3.8 practitioner cannot read session notes of unassigned client', pa, 'authenticated', format('select count(*) from public.session_notes where client_id = %L', cb), 0);
    r := r || pg_temp.t_count('3.9 practitioner sees only OWN private notes', pa, 'authenticated', format('select count(*) from public.practitioner_notes where practitioner_id in (%L,%L)', pa, pq), 1);
    r := r || pg_temp.t_count('3.10 practitioner cannot read unassigned assessments', pa, 'authenticated', format('select count(*) from public.assessments where client_id = %L', cb), 0);
    r := r || pg_temp.t_count('3.11 practitioner cannot read unassigned findings', pa, 'authenticated', format('select count(*) from public.assessment_findings where assessment_id = %L', asm2), 0);
    r := r || pg_temp.t_count('3.12 practitioner cannot read unassigned reports', pa, 'authenticated', format('select count(*) from public.reports where client_id = %L', cb), 0);
    r := r || pg_temp.t_refused('3.13 practitioner cannot make self admin', pa, 'authenticated', format('update public.profiles set role = ''admin'' where id = %L', pa));
    r := r || pg_temp.t_refused('3.14 practitioner cannot call admin_set_role', pa, 'authenticated', format('select public.admin_set_role(%L, ''admin'')', pa));
    r := r || pg_temp.t_refused('3.15 practitioner cannot assign self to client B', pa, 'authenticated', format('insert into public.practitioner_clients (practitioner_id, client_id) values (%L, %L)', pa, cb));
    r := r || pg_temp.t_refused('3.16 practitioner cannot start an assessment for unassigned client', pa, 'authenticated', format('insert into public.assessments (client_id, practitioner_id) values (%L, %L)', cb, pa));
    r := r || pg_temp.t_refused('3.17 practitioner cannot write a note about unassigned client', pa, 'authenticated', format('insert into public.session_notes (client_id, practitioner_id, body) values (%L, %L, ''x'')', cb, pa));
    r := r || pg_temp.t_allowed('3.18 practitioner can add a finding to own draft assessment', pa, 'authenticated', format('insert into public.assessment_findings (assessment_id, body_view, region, intensity) values (%L, ''front'', ''deltoid'', 6)', asm));
    r := r || pg_temp.t_allowed('3.19 practitioner can reschedule own appointment', pa, 'authenticated',
      format('update public.appointments set starts_at = starts_at + interval ''1 day'', ends_at = ends_at + interval ''1 day'' where id = %L', appt_a));
    r := r || pg_temp.t_count('3.20 the reschedule was recorded in the history', pa, 'authenticated', format('select count(*) from public.appointment_reschedules where appointment_id = %L', appt_a), 1);
    r := r || pg_temp.t_allowed('3.21 practitioner can publish a report to own client', pa, 'authenticated',
      format('update public.reports set visible_to_client = true where client_id = %L and title = ''A hidden''', ca));
    r := r || pg_temp.t_allowed('3.22 practitioner can finalize own draft assessment', pa, 'authenticated', format('update public.assessments set status = ''final'' where id = %L', asm));
    r := r || pg_temp.t_count('3.23 a FINAL assessment can no longer be changed (0 rows changed)', pa, 'authenticated',
      format('with u as (update public.assessments set status = ''draft'' where id = %L returning 1) select count(*) from u', asm), 0);
    r := r || pg_temp.t_refused('3.24 findings of a FINAL assessment are locked', pa, 'authenticated', format('insert into public.assessment_findings (assessment_id, body_view, region) values (%L, ''front'', ''x'')', asm));

    -- ---------- 4. client A again: the newly published report now shows ----------
    r := r || pg_temp.t_count('4.1 client A now sees both published reports', ca, 'authenticated', format('select count(*) from public.reports where client_id = %L', ca), 2);
    r := r || pg_temp.t_count('4.2 client A sees the reschedule history of own appointment', ca, 'authenticated', format('select count(*) from public.appointment_reschedules where appointment_id = %L', appt_a), 1);

    -- ---------- 5. PRACTITIONER Q (assigned to B only) ----------
    r := r || pg_temp.t_count('5.1 other practitioner cannot read client A intake', pq, 'authenticated', format('select count(*) from public.client_intake where client_id = %L', ca), 0);
    r := r || pg_temp.t_count('5.2 other practitioner cannot read client A session notes', pq, 'authenticated', format('select count(*) from public.session_notes where client_id = %L', ca), 0);
    r := r || pg_temp.t_count('5.3 other practitioner cannot read the first practitioner''s private notes', pq, 'authenticated', format('select count(*) from public.practitioner_notes where practitioner_id = %L', pa), 0);
    r := r || pg_temp.t_count('5.4 other practitioner reads own assigned client B', pq, 'authenticated', format('select count(*) from public.client_intake where client_id = %L', cb), 1);

    -- ---------- 6. ADMIN ----------
    r := r || pg_temp.t_count('6.1 admin sees all intakes', ad, 'authenticated', format('select count(*) from public.client_intake where client_id in (%L,%L)', ca, cb), 2);
    r := r || pg_temp.t_count('6.2 admin sees all private practitioner notes', ad, 'authenticated', format('select count(*) from public.practitioner_notes where practitioner_id in (%L,%L)', pa, pq), 2);
    r := r || pg_temp.t_count('6.3 admin sees all assessments', ad, 'authenticated', format('select count(*) from public.assessments where client_id in (%L,%L)', ca, cb), 2);
    r := r || pg_temp.t_refused('6.4 admin cannot change own role', ad, 'authenticated', format('select public.admin_set_role(%L, ''client'')', ad));
    r := r || pg_temp.t_refused('6.5 admin cannot change a role with a plain UPDATE (only through admin_set_role)', ad, 'authenticated', format('update public.profiles set role = ''admin'' where id = %L', ca));
    r := r || pg_temp.t_allowed('6.6 admin can promote through admin_set_role', ad, 'authenticated', format('select public.admin_set_role(%L, ''practitioner'')', ca));
    r := r || pg_temp.t_count('6.7 the promotion is in the audit log', ad, 'authenticated', format('select count(*) from public.audit_log where target_id = %L and action = ''set_role''', ca), 1);
    r := r || pg_temp.t_refused('6.8 admin cannot write the audit log from the app', ad, 'authenticated', 'insert into public.audit_log (action) values (''fake'')');
    r := r || pg_temp.t_refused('6.9 admin cannot delete audit log rows', ad, 'authenticated', 'delete from public.audit_log');
    r := r || pg_temp.t_refused('6.10 admin cannot edit audit log rows', ad, 'authenticated', 'update public.audit_log set action = ''x''');

    -- ---------- 7. VISITOR (not logged in) ----------
    r := r || pg_temp.t_refused('7.1 visitor cannot read profiles', null, 'anon', 'select count(*) from public.profiles');
    r := r || pg_temp.t_refused('7.2 visitor cannot read client intake', null, 'anon', 'select count(*) from public.client_intake');
    r := r || pg_temp.t_refused('7.3 visitor cannot read reports', null, 'anon', 'select count(*) from public.reports');
    r := r || pg_temp.t_refused('7.4 visitor cannot read appointments', null, 'anon', 'select count(*) from public.appointments');
    r := r || pg_temp.t_refused('7.5 visitor cannot call admin_set_role', null, 'anon', format('select public.admin_set_role(%L, ''admin'')', ca));

    -- ---------- 8. database rules (checked as the owner) ----------
    r := r || pg_temp.t_refused('8.1 overlapping appointments for the same practitioner are blocked', null, 'postgres',
      format('insert into public.appointments (client_id, practitioner_id, service_id, starts_at, ends_at) values (%L,%L,%L,%L,%L)', ca, pq, svc, t0 + interval '30 minutes', t0 + interval '90 minutes'));
    r := r || pg_temp.t_allowed('8.2 back-to-back appointments are fine', null, 'postgres',
      format('insert into public.appointments (client_id, practitioner_id, service_id, starts_at, ends_at) values (%L,%L,%L,%L,%L)', ca, pq, svc, t0 + interval '1 hour', t0 + interval '2 hours'));
    r := r || pg_temp.t_allowed('8.3 a CANCELLED appointment does not block the slot', null, 'postgres',
      format('update public.appointments set status = ''cancelled'', cancelled_at = now() where id = %L', appt_b));
    r := r || pg_temp.t_allowed('8.4 ...and the freed slot can be booked again', null, 'postgres',
      format('insert into public.appointments (client_id, practitioner_id, service_id, starts_at, ends_at) values (%L,%L,%L,%L,%L)', cb, pq, svc, t0, t0 + interval '1 hour'));
    r := r || pg_temp.t_refused('8.5 an under-18 intake without a guardian name is refused', null, 'postgres',
      format('insert into public.client_intake (client_id, date_of_birth) values (%L, current_date - interval ''10 years'')', ex));
    r := r || pg_temp.t_allowed('8.6 an under-18 intake WITH a guardian name is accepted', null, 'postgres',
      format('insert into public.client_intake (client_id, date_of_birth, guardian_name) values (%L, current_date - interval ''10 years'', ''Parent'')', ex));

    r := r || pg_temp.t_refused('8.7 even the database owner cannot edit a FINAL assessment (trigger)', null, 'postgres',
      format('update public.assessments set status = ''draft'' where id = %L', asm));
    r := r || pg_temp.t_refused('7.6 visitor cannot use the private helper schema', null, 'anon', 'select private.is_admin()');

    r := r || pg_temp.t_allowed('8.8 the server key (service_role) can write the audit log', null, 'service_role',
      'insert into public.audit_log (action, details) values (''test_export'', ''{}''::jsonb)');
    r := r || pg_temp.t_allowed('8.9 the server key (service_role) can read client data', null, 'service_role',
      'select count(*) from public.client_intake');

    raise exception using errcode = 'P0001', message = 'rollback test data';
  exception when sqlstate 'P0001' then null;
  end;

  return query select x ->> 'test', (x ->> 'passed')::boolean, x ->> 'detail' from jsonb_array_elements(r) x;
end $fn$;

-- Run it. Look at the "passed" column: all true = safe.
select * from pg_temp.run_security_tests();
