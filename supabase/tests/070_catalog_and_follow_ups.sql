-- M1-11: catalog invariants, the service role's view of the schema, and the D48 follow-ups
-- (timezone validity, the notes.body cap, purged array references, the decrypt cost at 500 notes).
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Act as a signed-in user (the way PostgREST does: role + JWT claims), as the anon role, or as
-- the service role the Edge Functions use.
create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.login_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'service_role', true);
end $$;

-- Times the board query (the newest 500 notes, decrypted) for the diagnostic at the end.
create function pg_temp.board_query_ms() returns numeric language plpgsql as $$
declare
  t0 timestamptz;
  total_chars bigint;
begin
  t0 := clock_timestamp();
  select sum(char_length(body)) into total_chars
  from (select body from public.notes order by created_at desc limit 500) b;
  return round(extract(epoch from clock_timestamp() - t0) * 1000, 1);
end $$;

create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}', '{}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}', '{}');

-- ---------------------------------------------------------------------------
-- Catalog invariants (docs/21 §0.3, CLAUDE.md rules). These hold for every future migration too.
-- ---------------------------------------------------------------------------
select is(
  (select coalesce(string_agg(schemaname || '.' || tablename, ', ' order by schemaname, tablename), '') from pg_tables where schemaname in ('public', 'enc') and not rowsecurity),
  '', 'every table in public and enc has RLS enabled');

select is(
  (select coalesce(string_agg(n.nspname || '.' || p.proname, ', ' order by n.nspname, p.proname), '')
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'enc') and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  '', 'every SECURITY DEFINER function in public and enc pins search_path');

select is(
  (select coalesce(string_agg(n.nspname || '.' || c.relname, ', ' order by n.nspname, c.relname), '')
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public', 'enc') and c.relkind in ('r', 'v', 'p')
     and has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE')),
  '', 'anon holds no privilege on any table or view in public and enc');

-- Tables with RLS and no policy at all are the deny-all set, and nothing else (docs/07 §8).
select is(
  (select string_agg(t.tablename, ', ' order by t.tablename)
   from pg_tables t
   where t.schemaname in ('public', 'enc')
     and not exists (select 1 from pg_policies p where p.schemaname = t.schemaname and p.tablename = t.tablename)),
  'entitlement_grants, jobs, llm_calls, safety_events',
  'the deny-all tables are exactly entitlement_grants, jobs, llm_calls and safety_events');

-- Every encrypted base table is paired with a decrypting view of the glossary name.
select is(
  (select string_agg(tablename, ', ' order by tablename) from pg_tables where schemaname = 'enc'),
  'deliveries, memory_items, memory_summary, notes, recaps, replies, warm_notes',
  'the seven encrypted base tables live in enc');
select is(
  (select string_agg(viewname, ', ' order by viewname) from pg_views where schemaname = 'public'),
  'deliveries, memory_items, memory_summary, notes, recaps, replies, warm_notes',
  'each has a view in public');
select is(
  (select count(*)::int from information_schema.columns where table_schema = 'enc' and column_name in ('body', 'content', 'summary', 'cards')),
  0, 'no enc table carries a plaintext text column');

-- ---------------------------------------------------------------------------
-- The service role, as the Edge Functions run: bypasses RLS, writes outputs through the views.
-- ---------------------------------------------------------------------------
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.notes (id, body) values ('70000000-0000-4000-8000-000000000001', 'A''s note');
select pg_temp.logout();
select pg_temp.login('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.notes (id, body) values ('70000000-0000-4000-8000-000000000002', 'B''s note');
select pg_temp.logout();

select pg_temp.login_service();
select is((select count(*)::int from public.notes), 2, 'the service role reads every user''s notes through the view');
select is((select body from public.notes where id = '70000000-0000-4000-8000-000000000001'), 'A''s note', 'and sees plaintext');
select lives_ok($$insert into public.deliveries (user_id, body, kind, scheduled_for, model, prompt_version, cost_micros) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a Rustle', 'daily', now(), 'm', 'v1', 12)$$, 'the service role writes a delivery with model, prompt_version and cost');
select lives_ok($$insert into public.replies (user_id, note_id, body) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '70000000-0000-4000-8000-000000000001', 'a note back')$$, 'the service role writes a reply');
select lives_ok($$insert into public.memory_summary (user_id, summary) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'summary')$$, 'the service role writes the memory summary');
select lives_ok($$update public.notes set safety_level = 'elevated' where id = '70000000-0000-4000-8000-000000000001'$$, 'the service role sets the safety level');
select lives_ok($$insert into public.safety_events (user_id, note_id, level, action_taken) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '70000000-0000-4000-8000-000000000001', 'elevated', 'card_shown')$$, 'the service role logs a safety event');
select lives_ok($$insert into public.llm_calls (user_id, step, model, prompt_version) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'safety', 'm', 'v1')$$, 'the service role logs an LLM call');
select lives_ok($$insert into public.jobs (type, user_id, idempotency_key) values ('seed_notes', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'seed_notes:a:2026-10-01')$$, 'the service role enqueues a job');
select lives_ok($$insert into public.entitlement_grants (code, kind, duration_days) values ('BETA-SERVICE-01', 'beta', 30)$$, 'the service role writes an entitlement grant');
select lives_ok($$insert into public.warm_notes (id, sender_user_id, situation, body, recipient_label) values ('service-slug-00-0123456789ab', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'exams', 'You have got this', 'Sam')$$, 'the service role publishes a warm note through the view');
select is((select body from public.warm_notes where id = 'service-slug-00-0123456789ab'), 'You have got this', 'the warm-note view decrypts for the service role');
select pg_temp.logout();

select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is((select body from public.replies), 'a note back', 'the user reads the reply the service role wrote');
select is((select count(*)::int from public.warm_notes), 1, 'the sender sees the published warm note');
select throws_ok($$update public.warm_notes set body = 'edited' where id = 'service-slug-00-0123456789ab'$$, '42501', null, 'the sender cannot edit the body through the view');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- users.timezone must be an IANA name
-- ---------------------------------------------------------------------------
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select lives_ok($$update public.users set timezone = 'America/Toronto' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, 'an IANA timezone is accepted');
select lives_ok($$update public.users set timezone = null where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, 'timezone may be unset');
select throws_ok($$update public.users set timezone = 'Mars/Olympus' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, '23514', null, 'an unknown timezone is rejected');
select throws_ok($$update public.users set timezone = 'FOO5' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, '23514', null, 'a POSIX offset string is rejected even though Postgres would parse it');
select throws_ok($$update public.users set timezone = '' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, '23514', null, 'an empty timezone is rejected');

-- ---------------------------------------------------------------------------
-- notes.body cap: 2 000 characters through the view, 9 216 bytes of ciphertext underneath
-- ---------------------------------------------------------------------------
select lives_ok($$insert into public.notes (id, body) values ('70000000-0000-4000-8000-000000000003', repeat('é', 2000))$$, 'a 2 000-character note is accepted');
select throws_ok($$insert into public.notes (body) values (repeat('x', 2001))$$, '23514', null, 'a 2 001-character note is rejected on insert');
select throws_ok($$update public.notes set body = repeat('x', 2001) where id = '70000000-0000-4000-8000-000000000003'$$, '23514', null, 'and on update');
select pg_temp.logout();
select throws_ok($$insert into enc.notes (user_id, body_enc) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', decode(repeat('00', 9217), 'hex'))$$, '23514', null, 'oversized ciphertext is rejected on the base table');

-- ---------------------------------------------------------------------------
-- Deleted ids leave the arrays that pointed at them
-- ---------------------------------------------------------------------------
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.memory_items (id, kind, content, source_note_ids)
values ('70000000-0000-4000-8000-00000000000a', 'fact', 'from two notes', '{70000000-0000-4000-8000-000000000001,70000000-0000-4000-8000-000000000003}');
delete from public.notes where id = '70000000-0000-4000-8000-000000000003';
select is((select source_note_ids from public.memory_items where id = '70000000-0000-4000-8000-00000000000a'),
  '{70000000-0000-4000-8000-000000000001}'::uuid[], 'a hard-deleted note leaves memory_items.source_note_ids');
select pg_temp.logout();

update public.entitlement_grants set redeemed_by = '{aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb}' where code = 'BETA-SERVICE-01';
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select lives_ok($$select public.delete_own_account()$$, 'A deletes the account');
select pg_temp.logout();
select is((select redeemed_by from public.entitlement_grants where code = 'BETA-SERVICE-01'),
  '{bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb}'::uuid[], 'a deleted account leaves entitlement_grants.redeemed_by');

-- ---------------------------------------------------------------------------
-- The decrypt cost of the board query at 500 notes (the M1-02 report's "known cost").
-- The figure is printed as a diagnostic for the report; the assertion only guards a regression.
-- ---------------------------------------------------------------------------
select pg_temp.login('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.notes (body, created_at)
select 'note number ' || g || ' with about a sentence of text so the ciphertext has a realistic size for the board',
       now() - (g || ' minutes')::interval
from generate_series(1, 499) g;
select is((select count(*)::int from public.notes), 500, 'B has 500 notes');

select pg_temp.board_query_ms();   -- warm the key lookup once
select diag('board query, 500 notes decrypted: ' || pg_temp.board_query_ms() || ' ms');
select cmp_ok(pg_temp.board_query_ms(), '<', 1500::numeric, 'decrypting 500 notes for the board stays under 1.5 s');
select pg_temp.logout();

select * from finish();
rollback;
