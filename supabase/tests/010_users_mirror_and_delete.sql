-- auth.users → public.users mirror, and delete_own_account() cascading through everything.
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

select is((select count(*)::int from public.users where id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')), 2,
  'the mirror trigger creates a public.users row per auth user');
select is((select is_anonymous from public.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), true,
  'the mirror copies is_anonymous');

update auth.users set is_anonymous = false where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is((select is_anonymous from public.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), false,
  'linking an identity flips is_anonymous on the mirror');

-- A writes a note and a memory item, then deletes the account.
select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.notes (body) values ('a note that must not survive the delete');
insert into public.memory_items (kind, content) values ('fact', 'a memory that must not survive the delete');
insert into public.consents (kind, version, locale) values ('terms', '2026-09', 'en');
select is((select count(*)::int from public.notes), 1, 'A sees the note before deleting');
select lives_ok($$select public.delete_own_account()$$, 'A can delete their own account');
select pg_temp.logout();

select is((select count(*)::int from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'the auth row is gone');
select is((select count(*)::int from public.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'the users row is gone');
select is((select count(*)::int from enc.notes where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'the notes are gone (cascade)');
select is((select count(*)::int from enc.memory_items where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'the memory items are gone (cascade)');
select is((select count(*)::int from public.consents where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'the consents are gone (cascade)');
select is((select count(*)::int from public.users where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 1, 'B is untouched');

select pg_temp.login_anon();
select throws_ok($$select public.delete_own_account()$$, '42501', null, 'anon cannot call delete_own_account');
select pg_temp.logout();

select pg_temp.login_nobody();
select throws_ok($$select public.delete_own_account()$$, '28000', 'not signed in', 'an authenticated call with no subject is refused');
select pg_temp.logout();

select * from finish();
rollback;
