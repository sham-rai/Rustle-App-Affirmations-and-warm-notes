-- Migration 2: the follow-ups from the D48 review of migration 1 (M1-11).
-- Source of truth: docs/07 §3, §8; docs/21 §0.3–0.4, §11; the M1-02 report, third review round.
--
-- 1. warm_notes.body moves under the column key like the other six text columns: the base table
--    becomes enc.warm_notes (body_enc bytea) and public.warm_notes is a decrypting view with
--    INSTEAD OF triggers. The table is empty until M5 writes the first warm note, so no data moves.
-- 2. warm_note_read() no longer counts: it is STABLE, so PostgREST serves it on GET and link
--    previews or bots cannot inflate opened_count. The page calls warm_note_opened() once.
-- 3. users.timezone must be an IANA name (pg_timezone_names), so one bad value cannot break the
--    planner for a whole timezone shard.
-- 4. notes.body is capped at 2 000 characters in the view trigger (the client's input limit) and
--    the ciphertext at 9 216 bytes on the base table (4 bytes per character plus the OpenPGP
--    packet overhead), so a service-role writer cannot bypass the plaintext cap.
-- 5. Deleted ids never linger in arrays: a hard-deleted note is removed from
--    memory_items.source_note_ids, a deleted account from entitlement_grants.redeemed_by.

-- ---------------------------------------------------------------------------
-- 1. warm_notes under the column key
-- ---------------------------------------------------------------------------
alter table public.warm_notes set schema enc;
-- The table is empty (the first warm note is written in M5); the plaintext column and its length
-- check go, the ciphertext column comes. The plaintext cap (220 characters) moves into the trigger.
alter table enc.warm_notes drop column body;
alter table enc.warm_notes add column body_enc bytea not null;
-- 220 characters of UTF-8 (4 bytes each at most) plus the OpenPGP packet overhead.
alter table enc.warm_notes add constraint warm_notes_body_enc_len check (octet_length(body_enc) <= 2048);

-- The base table is reached only through the view and the RPCs below: full rights for the two
-- roles that run the INSTEAD OF triggers, as for the other six enc tables (migration 1 §10).
grant select, insert, update, delete on enc.warm_notes to authenticated, service_role;

create view public.warm_notes with (security_invoker = true) as
  select id, sender_user_id, recipient_label, situation, enc.decrypt_text(body_enc) as body, card_style,
         created_at, expires_at, opened_count, thanked_at, revoked, reported_at, moderation_status
  from enc.warm_notes;

alter view public.warm_notes alter column sender_user_id set default auth.uid();
alter view public.warm_notes alter column card_style set default 'paper';
alter view public.warm_notes alter column created_at set default now();
alter view public.warm_notes alter column expires_at set default now() + interval '30 days';
alter view public.warm_notes alter column opened_count set default 0;
alter view public.warm_notes alter column revoked set default false;
alter view public.warm_notes alter column moderation_status set default 'approved';

create function public.warm_notes_insert() returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_catalog.char_length(new.body) > 220 then
    raise exception 'warm_notes.body is longer than 220 characters' using errcode = '23514';
  end if;
  insert into enc.warm_notes (id, sender_user_id, recipient_label, situation, body_enc, card_style, created_at,
                              expires_at, opened_count, thanked_at, revoked, reported_at, moderation_status)
  values (new.id, new.sender_user_id, new.recipient_label, new.situation, enc.encrypt_text(new.body), new.card_style,
          new.created_at, new.expires_at, new.opened_count, new.thanked_at, new.revoked, new.reported_at,
          new.moderation_status);
  return new;
end $$;

create function public.warm_notes_update() returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_catalog.char_length(new.body) > 220 then
    raise exception 'warm_notes.body is longer than 220 characters' using errcode = '23514';
  end if;
  update enc.warm_notes set
    recipient_label = new.recipient_label, situation = new.situation,
    body_enc = case when new.body is distinct from old.body then enc.encrypt_text(new.body) else body_enc end,
    card_style = new.card_style, expires_at = new.expires_at, opened_count = new.opened_count,
    thanked_at = new.thanked_at, revoked = new.revoked, reported_at = new.reported_at,
    moderation_status = new.moderation_status
  where id = old.id and sender_user_id = old.sender_user_id;
  return new;
end $$;

create function public.warm_notes_delete() returns trigger language plpgsql set search_path = '' as $$
begin
  delete from enc.warm_notes where id = old.id and sender_user_id = old.sender_user_id;
  return old;
end $$;

create trigger warm_notes_instead_insert instead of insert on public.warm_notes for each row execute function public.warm_notes_insert();
create trigger warm_notes_instead_update instead of update on public.warm_notes for each row execute function public.warm_notes_update();
create trigger warm_notes_instead_delete instead of delete on public.warm_notes for each row execute function public.warm_notes_delete();

-- The same grants the table had (migration 1 §10): the server publishes, the sender can only revoke.
grant select, insert, update, delete on public.warm_notes to authenticated, service_role;
revoke all on public.warm_notes from anon;
revoke insert, update on public.warm_notes from authenticated;
grant update (revoked) on public.warm_notes to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The public page: a read with no side effect, and a separate opened counter
-- ---------------------------------------------------------------------------
drop function public.warm_note_read(text);

-- STABLE, so PostgREST serves it on GET; it never writes. Decrypts server-side (owner: postgres).
create function public.warm_note_read(slug text)
returns table (body text, card_style text, recipient_label text, sender_first_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select enc.decrypt_text(w.body_enc) as body, w.card_style, w.recipient_label,
         nullif(split_part(coalesce(p.display_name, ''), ' ', 1), '') as sender_first_name
  from enc.warm_notes w
  left join public.profiles p on p.user_id = w.sender_user_id
  where w.id = slug
    and not w.revoked
    and w.expires_at > now()
    and w.moderation_status = 'approved'
$$;
revoke all on function public.warm_note_read(text) from public;
grant execute on function public.warm_note_read(text) to anon, authenticated, service_role;

-- Called once by the page after it rendered (a POST, so previews and crawlers never reach it).
create function public.warm_note_opened(slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  hit boolean;
begin
  update enc.warm_notes w
  set opened_count = w.opened_count + 1
  where w.id = slug
    and not w.revoked
    and w.expires_at > now()
    and w.moderation_status = 'approved'
  returning true into hit;
  return coalesce(hit, false);
end
$$;
revoke all on function public.warm_note_opened(text) from public;
grant execute on function public.warm_note_opened(text) to anon, authenticated, service_role;

-- warm_note_thank() is unchanged in behaviour; it now updates the enc table.
create or replace function public.warm_note_thank(slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender uuid;
begin
  update enc.warm_notes w
  set thanked_at = now()
  where w.id = slug
    and w.thanked_at is null
    and not w.revoked
    and w.expires_at > now()
    and w.moderation_status = 'approved'
  returning w.sender_user_id into sender;

  if sender is null then
    return false;
  end if;

  insert into public.jobs (type, user_id, payload)
  values ('warm_note_thanked', sender, jsonb_build_object('warm_note_id', slug));
  return true;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. users.timezone must be an IANA name
-- ---------------------------------------------------------------------------
-- The strict list, not a try of `at time zone`: Postgres also accepts POSIX strings such as
-- 'FOO5' there, which the planner (Deno's Intl) would not. One scan of pg_timezone_names per
-- users update is a few milliseconds and happens once per app open at most.
create function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz)
$$;
revoke all on function public.is_valid_timezone(text) from public, anon;
grant execute on function public.is_valid_timezone(text) to authenticated, service_role;

alter table public.users
  add constraint users_timezone_valid check (timezone is null or public.is_valid_timezone(timezone));

-- ---------------------------------------------------------------------------
-- 4. A length cap on notes.body
-- ---------------------------------------------------------------------------
-- 2 000 characters of plaintext (the client's input limit); the ciphertext cap on the base table
-- (4 bytes per character plus the packet overhead) holds even for a service-role writer.
alter table enc.notes add constraint notes_body_enc_len check (octet_length(body_enc) <= 9216);

create or replace function public.notes_insert() returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_catalog.char_length(new.body) > 2000 then
    raise exception 'notes.body is longer than 2000 characters' using errcode = '23514';
  end if;
  insert into enc.notes (id, user_id, body_enc, mood, source, wants_reply, pinned, hidden_from_recap,
                         exclude_from_ai, safety_level, life_areas, created_at, edited_at, deleted_at)
  values (new.id, new.user_id, enc.encrypt_text(new.body), new.mood, new.source, new.wants_reply, new.pinned,
          new.hidden_from_recap, new.exclude_from_ai, new.safety_level, new.life_areas, new.created_at,
          new.edited_at, new.deleted_at);
  return new;
end $$;

create or replace function public.notes_update() returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_catalog.char_length(new.body) > 2000 then
    raise exception 'notes.body is longer than 2000 characters' using errcode = '23514';
  end if;
  update enc.notes set
    body_enc = case when new.body is distinct from old.body then enc.encrypt_text(new.body) else body_enc end,
    mood = new.mood, source = new.source, wants_reply = new.wants_reply, pinned = new.pinned,
    hidden_from_recap = new.hidden_from_recap, exclude_from_ai = new.exclude_from_ai,
    safety_level = new.safety_level, life_areas = new.life_areas, edited_at = new.edited_at,
    deleted_at = new.deleted_at
  where id = old.id and user_id = old.user_id;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Deleted ids leave the arrays that pointed at them
-- ---------------------------------------------------------------------------
-- Runs as the caller: a user hard-deleting a note updates their own memory items under RLS; the
-- account cascade runs inside delete_own_account() as postgres.
create function public.notes_purge_source_refs() returns trigger language plpgsql set search_path = '' as $$
begin
  update enc.memory_items
  set source_note_ids = pg_catalog.array_remove(source_note_ids, old.id)
  where user_id = old.user_id and old.id = any (source_note_ids);
  return old;
end $$;
create trigger notes_purge_source_refs after delete on enc.notes for each row execute function public.notes_purge_source_refs();

-- SECURITY DEFINER: the users row is deleted by the cascade from auth.users, whichever role runs it
-- (delete_own_account() as postgres, or supabase_auth_admin from the dashboard), and none of them
-- but postgres may touch entitlement_grants.
create function public.users_purge_grant_refs() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.entitlement_grants
  set redeemed_by = pg_catalog.array_remove(redeemed_by, old.id)
  where old.id = any (redeemed_by);
  return old;
end $$;
revoke all on function public.users_purge_grant_refs() from public, anon, authenticated;
create trigger users_purge_grant_refs after delete on public.users for each row execute function public.users_purge_grant_refs();
