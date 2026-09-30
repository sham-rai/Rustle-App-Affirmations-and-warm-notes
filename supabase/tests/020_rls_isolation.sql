-- docs/21 §0.3: user A cannot read, update or delete user B's rows in any table.
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

-- A fills every user-owned table, through the views where the table is encrypted.
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.consents (id, kind, version, locale) values ('10000000-0000-4000-8000-000000000001', 'terms', '2026-09', 'en');
insert into public.profiles (display_name) values ('Maya');
insert into public.delivery_prefs (slots) values ('[{"slot":"morning","time":"08:00"}]');
insert into public.notes (id, body) values ('10000000-0000-4000-8000-000000000002', 'A private note');
insert into public.checkins (id, mood) values ('10000000-0000-4000-8000-000000000003', 3);
insert into public.key_dates (id, label, date) values ('10000000-0000-4000-8000-000000000004', 'exam', '2026-10-15');
insert into public.memory_items (id, kind, content) values ('10000000-0000-4000-8000-000000000005', 'fact', 'A private memory');
insert into public.push_tokens (id, token, platform) values ('10000000-0000-4000-8000-000000000009', 'tok-a', 'ios');
select pg_temp.logout();
-- The server (service role; postgres stands in) writes the outputs and the subscription.
insert into public.memory_summary (user_id, summary) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A private summary');
insert into public.deliveries (id, user_id, body, kind, scheduled_for) values ('10000000-0000-4000-8000-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A private Rustle', 'daily', now());
insert into public.replies (id, user_id, note_id, body) values ('10000000-0000-4000-8000-000000000007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '10000000-0000-4000-8000-000000000002', 'A private note back');
insert into public.recaps (id, user_id, period_start, period_end, cards) values ('10000000-0000-4000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-09-01', '2026-09-30', '[{"t":"card"}]');
insert into public.subscriptions (user_id, status) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'active');
insert into public.warm_notes (id, sender_user_id, situation, body) values ('warmnote-slug-a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'exams', 'A warm note');

-- A reads everything back through the same paths.
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is((select count(*)::int from public.users), 1, 'A sees own users row');
select is((select count(*)::int from public.consents), 1, 'A sees own consents');
select is((select count(*)::int from public.profiles), 1, 'A sees own profile');
select is((select count(*)::int from public.delivery_prefs), 1, 'A sees own delivery_prefs');
select is((select body from public.notes), 'A private note', 'A reads own note through the view');
select is((select count(*)::int from public.checkins), 1, 'A sees own checkins');
select is((select count(*)::int from public.key_dates), 1, 'A sees own key_dates');
select is((select content from public.memory_items), 'A private memory', 'A reads own memory item through the view');
select is((select summary from public.memory_summary), 'A private summary', 'A reads own summary through the view');
select is((select body from public.deliveries), 'A private Rustle', 'A reads own delivery through the view');
select is((select body from public.replies), 'A private note back', 'A reads own reply through the view');
select is((select cards from public.recaps), '[{"t":"card"}]'::jsonb, 'A reads own recap cards through the view');
select is((select count(*)::int from public.warm_notes), 1, 'A sees own warm notes');
select is((select count(*)::int from public.push_tokens), 1, 'A sees own push tokens');
select is((select count(*)::int from public.subscriptions), 1, 'A sees own subscription');
select pg_temp.logout();

-- B sees nothing of A's, and cannot change or remove it.
select pg_temp.login('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is((select count(*)::int from public.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'B cannot read A users row');
select is((select count(*)::int from public.consents), 0, 'B cannot read A consents');
select is((select count(*)::int from public.profiles), 0, 'B cannot read A profile');
select is((select count(*)::int from public.delivery_prefs), 0, 'B cannot read A delivery_prefs');
select is((select count(*)::int from public.notes), 0, 'B cannot read A notes (view)');
select is((select count(*)::int from enc.notes), 0, 'B cannot read A notes (base table)');
select is((select count(*)::int from public.checkins), 0, 'B cannot read A checkins');
select is((select count(*)::int from public.key_dates), 0, 'B cannot read A key_dates');
select is((select count(*)::int from public.memory_items), 0, 'B cannot read A memory_items (view)');
select is((select count(*)::int from enc.memory_items), 0, 'B cannot read A memory_items (base table)');
select is((select count(*)::int from public.memory_summary), 0, 'B cannot read A memory_summary (view)');
select is((select count(*)::int from enc.memory_summary), 0, 'B cannot read A memory_summary (base table)');
select is((select count(*)::int from public.deliveries), 0, 'B cannot read A deliveries (view)');
select is((select count(*)::int from enc.deliveries), 0, 'B cannot read A deliveries (base table)');
select is((select count(*)::int from public.replies), 0, 'B cannot read A replies (view)');
select is((select count(*)::int from enc.replies), 0, 'B cannot read A replies (base table)');
select is((select count(*)::int from public.recaps), 0, 'B cannot read A recaps (view)');
select is((select count(*)::int from enc.recaps), 0, 'B cannot read A recaps (base table)');
select is((select count(*)::int from public.warm_notes), 0, 'B cannot read A warm_notes');
select is((select count(*)::int from public.push_tokens), 0, 'B cannot read A push_tokens');
select is((select count(*)::int from public.subscriptions), 0, 'B cannot read A subscription');

with u as (update public.users set locale = 'x' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A users row');
with u as (update public.consents set withdrawn_at = now() where id = '10000000-0000-4000-8000-000000000001' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A consents');
with u as (update public.profiles set display_name = 'x' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A profile');
with u as (update public.delivery_prefs set adaptive = false where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A delivery_prefs');
with u as (update public.notes set pinned = true where id = '10000000-0000-4000-8000-000000000002' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A notes');
with u as (update public.checkins set mood = 1 where id = '10000000-0000-4000-8000-000000000003' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A checkins');
with u as (update public.key_dates set label = 'x' where id = '10000000-0000-4000-8000-000000000004' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A key_dates');
with u as (update public.memory_items set content = 'x' where id = '10000000-0000-4000-8000-000000000005' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A memory_items');
with u as (delete from public.memory_summary where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot delete A memory_summary (no update exists for users)');
with u as (update public.deliveries set reaction = 'heart' where id = '10000000-0000-4000-8000-000000000006' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A deliveries');
with u as (update public.replies set reaction = 'heart' where id = '10000000-0000-4000-8000-000000000007' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A replies');
with u as (update public.recaps set shared = true where id = '10000000-0000-4000-8000-000000000008' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A recaps');
with u as (update public.warm_notes set revoked = true where id = 'warmnote-slug-a' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A warm_notes');
with u as (update public.push_tokens set token = 'x' where id = '10000000-0000-4000-8000-000000000009' returning 1)
  select is((select count(*)::int from u), 0, 'B cannot update A push_tokens');

with d as (delete from public.consents where id = '10000000-0000-4000-8000-000000000001' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A consents');
with d as (delete from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A profile');
with d as (delete from public.delivery_prefs where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A delivery_prefs');
with d as (delete from public.notes where id = '10000000-0000-4000-8000-000000000002' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A notes');
with d as (delete from public.checkins where id = '10000000-0000-4000-8000-000000000003' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A checkins');
with d as (delete from public.key_dates where id = '10000000-0000-4000-8000-000000000004' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A key_dates');
with d as (delete from public.memory_items where id = '10000000-0000-4000-8000-000000000005' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A memory_items');
with d as (delete from public.deliveries where id = '10000000-0000-4000-8000-000000000006' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A deliveries');
with d as (delete from public.replies where id = '10000000-0000-4000-8000-000000000007' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A replies');
with d as (delete from public.recaps where id = '10000000-0000-4000-8000-000000000008' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A recaps');
with d as (delete from public.warm_notes where id = 'warmnote-slug-a' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A warm_notes');
with d as (delete from public.push_tokens where id = '10000000-0000-4000-8000-000000000009' returning 1)
  select is((select count(*)::int from d), 0, 'B cannot delete A push_tokens');

-- B cannot write rows in A's name.
select throws_ok($$insert into public.notes (user_id, body) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'forged')$$, '42501', null, 'B cannot insert a note as A');
select throws_ok($$insert into public.consents (user_id, kind, version, locale) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'terms', '1', 'en')$$, '42501', null, 'B cannot insert a consent as A');
select throws_ok($$insert into public.replies (user_id, note_id, body) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '10000000-0000-4000-8000-000000000002', 'forged')$$, '42501', null, 'B cannot insert a reply as A');
select pg_temp.logout();

-- A's rows are all still there and unchanged.
select is((select body from public.notes where id = '10000000-0000-4000-8000-000000000002'), 'A private note', 'A note unchanged after B tried');
select is((select count(*)::int from public.consents where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'A consents unchanged after B tried');
select is((select count(*)::int from enc.replies where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'A replies unchanged after B tried');

select * from finish();
rollback;
