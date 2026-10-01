-- Tables without a user-facing policy are unreachable for users; column grants limit the rest.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Act as a signed-in user (the way PostgREST does: role + JWT claims), or as the anon role.
create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.login_nobody() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.login_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end $$;

create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Two test users straight into auth.users; the mirror trigger creates public.users rows.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}', '{}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}', '{}');

insert into public.entitlement_grants (code, kind, duration_days) values ('BETA-TEST-0001', 'beta', 30);
insert into public.llm_calls (user_id, step, model, prompt_version) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'safety', 'test-model', 'v1');

-- ---------------------------------------------------------------------------
-- D48 review fixes: dedupe keys, the job lease, one account per device token, slug randomness,
-- the profile language and register, and anon never inheriting a new table.
-- ---------------------------------------------------------------------------

-- deliveries: one Rustle per (user, kind, slot), however often a batch result is ingested.
insert into public.deliveries (user_id, body, kind, scheduled_for) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'first copy', 'daily', '2026-10-01 08:00+00');
select throws_ok($$insert into public.deliveries (user_id, body, kind, scheduled_for) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'second copy', 'daily', '2026-10-01 08:00+00')$$, '23505', null, 'the same slot cannot hold two Rustles of one kind');
select lives_ok($$insert into public.deliveries (user_id, body, kind, scheduled_for) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a date note', 'date_day', '2026-10-01 08:00+00')$$, 'another kind at the same time is allowed');
select lives_ok($$insert into public.deliveries (user_id, body, kind, scheduled_for) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B''s copy', 'daily', '2026-10-01 08:00+00')$$, 'another user at the same time is allowed');

-- recaps: one per period, and the period runs forwards.
insert into public.recaps (user_id, period_start, period_end, cards) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-09-01', '2026-09-30', '[]');
select throws_ok($$insert into public.recaps (user_id, period_start, period_end, cards) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-09-01', '2026-09-30', '[]')$$, '23505', null, 'a period cannot get two recaps');
select throws_ok($$insert into public.recaps (user_id, period_start, period_end, cards) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-10-31', '2026-10-01', '[]')$$, '23514', null, 'a recap period cannot end before it starts');

-- jobs: idempotency key and the lease invariant.
insert into public.jobs (type, user_id, idempotency_key) values ('seed_notes', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'seed_notes:aaaaaaaa:2026-10-01');
select throws_ok($$insert into public.jobs (type, user_id, idempotency_key) values ('seed_notes', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'seed_notes:aaaaaaaa:2026-10-01')$$, '23505', null, 'the same idempotency key cannot be enqueued twice');
select lives_ok($$insert into public.jobs (type, user_id, idempotency_key) values ('seed_notes', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'seed_notes:aaaaaaaa:2026-10-01') on conflict (idempotency_key) do nothing$$, 'on conflict do nothing is the idempotent enqueue');
select lives_ok($$insert into public.jobs (type, user_id) values ('warm_note_thanked', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$, 'jobs without a key are still allowed');
select lives_ok($$update public.jobs set status = 'running', lease_until = now() + interval '5 minutes', locked_by = 'dispatcher-1' where idempotency_key = 'seed_notes:aaaaaaaa:2026-10-01'$$, 'claiming sets running and a lease');
select throws_ok($$update public.jobs set status = 'done' where idempotency_key = 'seed_notes:aaaaaaaa:2026-10-01'$$, '23514', null, 'finishing a job must clear its lease');
select lives_ok($$update public.jobs set status = 'done', lease_until = null where idempotency_key = 'seed_notes:aaaaaaaa:2026-10-01'$$, 'done with the lease cleared');

-- push_tokens: a device token belongs to exactly one account.
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.push_tokens (token, platform) values ('device-token-shared-phone', 'ios');
select pg_temp.logout();
select pg_temp.login('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select throws_ok($$insert into public.push_tokens (token, platform) values ('device-token-shared-phone', 'ios')$$, '23505', null, 'a second account cannot register the same device token');
select pg_temp.logout();

-- warm_notes: the slug must be long enough that it cannot be enumerated.
select throws_ok($$insert into public.warm_notes (id, sender_user_id, situation, body) values ('short-slug', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'exams', 'x')$$, '23514', null, 'a short slug is rejected');
select throws_ok($$insert into public.warm_notes (id, sender_user_id, situation, body) values ('has spaces and is long enough', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'exams', 'x')$$, '23514', null, 'a slug outside base64url is rejected');
select lives_ok($$insert into public.warm_notes (id, sender_user_id, situation, body) values ('Ab3_-9xYz01234567890Qq', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'exams', 'x')$$, 'a 22-character base64url slug is accepted');

-- profiles: the note language and the French register are closed lists (D48).
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select lives_ok($$insert into public.profiles (display_name, note_language, address) values ('Maya', 'fr', 'vous')$$, 'a French vous profile');
select throws_ok($$update public.profiles set note_language = 'de'$$, '23514', null, 'note_language is en or fr');
select throws_ok($$update public.profiles set address = 'Sie'$$, '23514', null, 'address is tu or vous');
select lives_ok($$update public.profiles set note_language = null, address = null$$, 'both may be unset (follow the UI language; English)');
select pg_temp.logout();

-- A table created later must not be readable by anon through Supabase's default privileges.
create table public.d48_probe (id int);
select is(has_table_privilege('anon', 'public.d48_probe', 'SELECT'), false, 'anon does not inherit SELECT on a new table');
select is(has_table_privilege('anon', 'public.d48_probe', 'INSERT'), false, 'anon does not inherit INSERT on a new table');
select is(has_schema_privilege('anon', 'enc', 'USAGE'), false, 'anon has no usage on the enc schema');
select is(has_schema_privilege('authenticated', 'enc', 'USAGE'), true, 'authenticated reaches enc only through the views');

select * from finish();
rollback;
