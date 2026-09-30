-- warm_notes: sender-only RLS, and the two SECURITY DEFINER RPCs the public page uses (docs/07 §8).
begin;
select no_plan();
create extension if not exists pgtap with schema extensions;

-- Act as a signed-in user (the way PostgREST does: role + JWT claims), or as the anon role.
create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
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

select pg_temp.login('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.profiles (display_name) values ('Maya Tremblay');
insert into public.warm_notes (id, situation, body, recipient_label) values ('live-slug-0001', 'exams', 'You have got this', 'Sam');
insert into public.warm_notes (id, situation, body, revoked) values ('revoked-slug-01', 'exams', 'gone', true);
insert into public.warm_notes (id, situation, body, expires_at) values ('expired-slug-01', 'exams', 'gone', now() - interval '1 day');
insert into public.warm_notes (id, situation, body, moderation_status) values ('held-slug-00001', 'exams', 'gone', 'held');
select pg_temp.logout();

select pg_temp.login_anon();
select throws_ok($$select * from public.warm_notes$$, '42501', null, 'anon cannot read warm_notes directly');
select results_eq(
  $$select body, card_style, recipient_label, sender_first_name, situation from public.warm_note_read('live-slug-0001')$$,
  $$values ('You have got this', 'paper', 'Sam', 'Maya', 'exams')$$,
  'warm_note_read returns the page fields, with the sender first name only');
select is((select count(*)::int from public.warm_note_read('revoked-slug-01')), 0, 'a revoked note is not served');
select is((select count(*)::int from public.warm_note_read('expired-slug-01')), 0, 'an expired note is not served');
select is((select count(*)::int from public.warm_note_read('held-slug-00001')), 0, 'a held note is not served');
select is((select count(*)::int from public.warm_note_read('no-such-slug-00')), 0, 'an unknown slug returns nothing');

select is(public.warm_note_thank('live-slug-0001'), true, 'the first thank you lands');
select is(public.warm_note_thank('live-slug-0001'), false, 'the second thank you is a no-op');
select is(public.warm_note_thank('revoked-slug-01'), false, 'a revoked note cannot be thanked');
select pg_temp.logout();

select is((select opened_count from public.warm_notes where id = 'live-slug-0001'), 1, 'the page view was counted once');
select ok((select thanked_at is not null from public.warm_notes where id = 'live-slug-0001'), 'thanked_at is set');
select is((select count(*)::int from public.jobs where type = 'warm_note_thanked' and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'one push job is queued for the sender');

select pg_temp.login('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is((select count(*)::int from public.warm_notes), 0, 'another user sees no warm notes of the sender');
select pg_temp.logout();

select * from finish();
rollback;
