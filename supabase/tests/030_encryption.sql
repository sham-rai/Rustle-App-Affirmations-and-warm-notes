-- docs/21 §0.4: encrypted columns are unreadable raw, readable and writable through the views,
-- and the key in Vault is out of reach for authenticated.
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
insert into public.notes (id, body) values ('20000000-0000-4000-8000-000000000001', 'the plaintext sentinel 4f2a');

-- Raw read: ciphertext only.
select ok((select octet_length(body_enc) > 40 from enc.notes where id = '20000000-0000-4000-8000-000000000001'), 'the base column holds ciphertext');
select is((select position('sentinel' in encode(body_enc, 'escape')) from enc.notes where id = '20000000-0000-4000-8000-000000000001'), 0, 'the plaintext is not in the base column');
select is((select count(*)::int from information_schema.columns where table_schema = 'enc' and table_name = 'notes' and column_name = 'body'), 0, 'the base table has no plaintext body column');

-- View read and write.
select is((select body from public.notes where id = '20000000-0000-4000-8000-000000000001'), 'the plaintext sentinel 4f2a', 'the view decrypts');
update public.notes set body = 'edited sentinel 9c1d', edited_at = now() where id = '20000000-0000-4000-8000-000000000001';
select is((select body from public.notes where id = '20000000-0000-4000-8000-000000000001'), 'edited sentinel 9c1d', 'an update through the view re-encrypts');
select is((select position('9c1d' in encode(body_enc, 'escape')) from enc.notes where id = '20000000-0000-4000-8000-000000000001'), 0, 'the edited plaintext is not in the base column');
update public.notes set pinned = true where id = '20000000-0000-4000-8000-000000000001';
select is((select body from public.notes where id = '20000000-0000-4000-8000-000000000001'), 'edited sentinel 9c1d', 'an update that leaves body alone keeps it readable');
delete from public.notes where id = '20000000-0000-4000-8000-000000000001';
select is((select count(*)::int from enc.notes where id = '20000000-0000-4000-8000-000000000001'), 0, 'a delete through the view removes the base row');

-- The other five encrypted columns round-trip.
insert into public.memory_items (kind, content) values ('person', 'Sister Maya, surgery on Oct 3');
select is((select content from public.memory_items), 'Sister Maya, surgery on Oct 3', 'memory_items.content round-trips');
insert into public.memory_summary (summary) values ('who they are and what is happening now');
select is((select summary from public.memory_summary), 'who they are and what is happening now', 'memory_summary.summary round-trips');
insert into public.deliveries (body, kind, scheduled_for) values ('A Rustle for tonight', 'daily', now());
select is((select body from public.deliveries), 'A Rustle for tonight', 'deliveries.body round-trips');
insert into public.notes (id, body) values ('20000000-0000-4000-8000-000000000002', 'note for a reply');
insert into public.replies (note_id, body) values ('20000000-0000-4000-8000-000000000002', 'a note back');
select is((select body from public.replies), 'a note back', 'replies.body round-trips');
insert into public.recaps (period_start, period_end, cards) values ('2026-09-01', '2026-09-30', '[{"title":"Look how far"}]');
select is((select cards -> 0 ->> 'title' from public.recaps), 'Look how far', 'recaps.cards round-trips as jsonb');
select is((select position('Look how far' in encode(cards_enc, 'escape')) from enc.recaps), 0, 'recap cards are ciphertext at rest');

-- The key stays out of reach.
select throws_ok($$select * from vault.decrypted_secrets$$, '42501', null, 'authenticated cannot read vault.decrypted_secrets');
select throws_ok($$select * from vault.secrets$$, '42501', null, 'authenticated cannot read vault.secrets');
select throws_ok($$select enc.column_key()$$, '42501', null, 'authenticated cannot call enc.column_key()');
select pg_temp.logout();

-- anon has no way in at all.
select pg_temp.login_anon();
select throws_ok($$select * from public.notes$$, '42501', null, 'anon cannot read the notes view');
select throws_ok($$select * from enc.notes$$, '42501', null, 'anon cannot read the notes base table');
select throws_ok($$select enc.decrypt_text(null)$$, '42501', null, 'anon cannot call enc.decrypt_text()');
select throws_ok($$select * from vault.decrypted_secrets$$, '42501', null, 'anon cannot read vault.decrypted_secrets');
select pg_temp.logout();

select * from finish();
rollback;
