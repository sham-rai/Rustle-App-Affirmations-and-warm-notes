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
insert into public.jobs (type, user_id) values ('seed_notes', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.safety_events (user_id, level, action_taken) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'elevated', 'card_shown');
insert into public.subscriptions (user_id, status) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'active');

select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- Deny-all (docs/07 §8): even the user the rows are about cannot see them.
select throws_ok($$select * from public.entitlement_grants$$, '42501', null, 'users cannot read entitlement_grants');
select throws_ok($$insert into public.entitlement_grants (code, kind, duration_days) values ('X', 'beta', 1)$$, '42501', null, 'users cannot insert entitlement_grants');
select throws_ok($$select * from public.llm_calls$$, '42501', null, 'users cannot read llm_calls');
select throws_ok($$select * from public.jobs$$, '42501', null, 'users cannot read jobs');
select throws_ok($$insert into public.jobs (type) values ('x')$$, '42501', null, 'users cannot enqueue jobs');
select throws_ok($$select * from public.safety_events$$, '42501', null, 'users cannot read safety_events');

-- subscriptions: read own, never write.
select is((select status from public.subscriptions), 'active', 'the user reads their own subscription');
select throws_ok($$update public.subscriptions set status = 'forged'$$, '42501', null, 'users cannot update subscriptions');
select throws_ok($$insert into public.subscriptions (user_id, status) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'forged')$$, '42501', null, 'users cannot insert subscriptions');
select throws_ok($$delete from public.subscriptions$$, '42501', null, 'users cannot delete subscriptions');

-- users: only locale, timezone, age_confirmed_at and last_opened_at are the user's to set.
select lives_ok($$update public.users set locale = 'fr-CA', timezone = 'America/Toronto', age_confirmed_at = now(), last_opened_at = now() where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, 'the user sets locale, timezone, age confirmation and last open');
select throws_ok($$update public.users set welcome_week_ends_at = now() where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, '42501', null, 'the user cannot set welcome_week_ends_at');
select throws_ok($$update public.users set is_anonymous = false where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, '42501', null, 'the user cannot set is_anonymous');
select throws_ok($$insert into public.users (id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc')$$, '42501', null, 'the user cannot insert users rows');
select throws_ok($$delete from public.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, '42501', null, 'the user cannot delete users rows directly');

-- consents: append-only, withdrawal is the one field a user may change.
select lives_ok($$insert into public.consents (kind, version, locale) values ('ai_processing', '2026-09', 'fr')$$, 'the user writes a consent row');
select lives_ok($$update public.consents set withdrawn_at = now()$$, 'the user may withdraw');
select throws_ok($$update public.consents set version = '9'$$, '42501', null, 'the user cannot rewrite a consent version');
select throws_ok($$delete from public.consents$$, '42501', null, 'the user cannot delete consent rows');

-- notes: the safety level belongs to the server-side gate.
select lives_ok($$insert into public.notes (id, body, mood, life_areas) values ('40000000-0000-4000-8000-000000000001', 'a note', 3, '{work}')$$, 'the user writes a note');
select throws_ok($$insert into public.notes (body, safety_level) values ('x', 'none')$$, '42501', null, 'the user cannot set safety_level on insert');
select throws_ok($$update public.notes set safety_level = 'none' where id = '40000000-0000-4000-8000-000000000001'$$, '42501', null, 'the user cannot change safety_level');
select lives_ok($$update public.notes set body = 'edited', pinned = true where id = '40000000-0000-4000-8000-000000000001'$$, 'the user edits their own note');

-- Server-written outputs: the user may react, open, rate and delete; never create or rewrite.
select throws_ok($$insert into public.deliveries (body, kind, scheduled_for) values ('forged', 'daily', now())$$, '42501', null, 'the user cannot create a delivery');
select throws_ok($$insert into public.replies (note_id, body) values ('40000000-0000-4000-8000-000000000001', 'forged')$$, '42501', null, 'the user cannot create a reply');
select throws_ok($$insert into public.recaps (period_start, period_end, cards) values ('2026-09-01', '2026-09-30', '[]')$$, '42501', null, 'the user cannot create a recap');
select throws_ok($$insert into public.memory_summary (summary) values ('forged')$$, '42501', null, 'the user cannot create a memory summary');
select pg_temp.logout();
insert into public.deliveries (id, user_id, body, kind, scheduled_for) values ('40000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a Rustle', 'daily', now());
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select throws_ok($$update public.deliveries set body = 'rewritten' where id = '40000000-0000-4000-8000-000000000002'$$, '42501', null, 'the user cannot rewrite a Rustle');
select throws_ok($$update public.deliveries set cost_micros = 0, model = 'x' where id = '40000000-0000-4000-8000-000000000002'$$, '42501', null, 'the user cannot touch model or cost');
select lives_ok($$update public.deliveries set reaction = 'not_quite', reaction_reason = 'too_long', opened_at = now() where id = '40000000-0000-4000-8000-000000000002'$$, 'the user reacts and marks opened');
select lives_ok($$delete from public.deliveries where id = '40000000-0000-4000-8000-000000000002'$$, 'the user deletes their own Rustle');

-- Enum check constraints hold the shared values.
select throws_ok($$insert into public.notes (body, life_areas) values ('x', '{bogus}')$$, '23514', null, 'notes.life_areas rejects a value outside LIFE_AREAS');
select lives_ok($$insert into public.notes (body, life_areas) values ('x', '{exams,hard_time}')$$, 'notes.life_areas accepts LIFE_AREAS values');
select throws_ok($$insert into public.deliveries (body, kind, scheduled_for) values ('x', 'presence', now())$$, '23514', null, 'deliveries.kind rejects the merged "presence" intent');
select lives_ok($$insert into public.deliveries (body, kind, scheduled_for) values ('x', 'quiet_presence', now())$$, 'deliveries.kind accepts quiet_presence');
select throws_ok($$insert into public.delivery_prefs (slots) values ('[1,2,3,4,5]')$$, '23514', null, 'delivery_prefs.slots holds at most four slots');
select throws_ok($$insert into public.consents (kind, version, locale) values ('newsletter', '1', 'en')$$, '23514', null, 'consents.kind rejects an unknown kind');
select pg_temp.logout();

select * from finish();
rollback;
