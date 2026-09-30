-- Migration 1: schema, RLS, column encryption and the decrypting views (M1-02).
-- Source of truth: docs/07 §3 (tables), §8 (encryption, D29/D46), docs/21 §0 criteria 3–4.
--
-- Layout
--   public.*        every table the app and the Edge Functions touch, RLS on all of them
--   enc.*           the six base tables whose text column is encrypted (bytea), plus the
--                   key and cipher functions; not exposed by PostgREST (config.toml schemas)
--   public.<view>   one security_invoker view per encrypted table, with the glossary name
--                   (notes, memory_items, memory_summary, deliveries, replies, recaps);
--                   reads decrypt, writes go through INSTEAD OF triggers that encrypt
--
-- Key management
--   The column key is a Vault secret named `rustle_column_key` (32 random bytes, hex).
--   Only enc.column_key() reads it, and only the two SECURITY DEFINER cipher functions,
--   owned by postgres, call that. Nothing ever returns the key to a client role.
--
-- Key rotation (a later ticket; the procedure, so it is written down now)
--   1. vault.create_secret(<new key>, 'rustle_column_key_next').
--   2. In batches, for each enc table: update set body_enc = pgp_sym_encrypt(
--        pgp_sym_decrypt(body_enc, old), new) where key_version = 1; set key_version = 2.
--      (Add a `key_version smallint default 1` column to the enc tables in that migration
--      first, and make enc.decrypt_text() pick the key by version during the rollover.)
--   3. Rename the secrets, drop the old one, drop the version branch from decrypt_text().
--   Because pgp_sym_encrypt salts every value, re-encryption is safe to run twice.
--
-- Key escrow (operations)
--   Vault secrets do not travel with pg_dump, PITR into another project or a preview branch.
--   At creation the PO copies the secret's value into the company password manager. Restoring
--   data into a fresh project means re-creating `rustle_column_key` with that same value BEFORE
--   the restore; a project that gets a new random key cannot read any existing ciphertext, and
--   the views then raise "Wrong key or corrupt data" instead of returning rows.
--
-- Deletion
--   Everything hangs off public.users(id) with ON DELETE CASCADE, and public.users hangs
--   off auth.users. delete_own_account() deletes the auth row; the rest follows.
--   Backup purge and the RevenueCat revoke are operational steps outside the database.

-- ---------------------------------------------------------------------------
-- 0. Extensions and schemas
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

create schema if not exists enc;
revoke all on schema enc from public;
grant usage on schema enc to authenticated, service_role;

-- The two shared enums (packages/shared/enums.ts, D46), defined once each as a domain.
-- scripts/check-enums.ts compares the array after each `-- enum:` marker with enums.ts.
create domain public.life_area as text
  -- enum:life_areas
  check (value = any (array['exams', 'breakup', 'divorce', 'health', 'caregiving', 'work', 'grief', 'change', 'loneliness', 'hard_time', 'other']::text[]));

create domain public.delivery_intent as text
  -- enum:delivery_intents
  check (value = any (array['daily', 'date_eve', 'date_day', 'follow_up', 'quiet_presence', 'win_celebration', 'first', 'seed', 'reengage']::text[]));

-- ---------------------------------------------------------------------------
-- 1. Column key in Vault, and the cipher functions
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'rustle_column_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'rustle_column_key',
      'pgcrypto column key for note text (docs/07 §8, D29). Rotation: see migration 1 header.'
    );
  end if;
end
$$;

create or replace function enc.column_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'rustle_column_key'
  limit 1
$$;
revoke all on function enc.column_key() from public, anon, authenticated, service_role;

create or replace function enc.encrypt_text(plain text)
returns bytea
language sql
volatile   -- pgp_sym_encrypt salts every call; never let the planner reuse a result
security definer
set search_path = ''
as $$
  select case
    when plain is null then null
    else extensions.pgp_sym_encrypt(plain, enc.column_key())
  end
$$;

create or replace function enc.decrypt_text(cipher bytea)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when cipher is null then null
    else extensions.pgp_sym_decrypt(cipher, enc.column_key())
  end
$$;

revoke all on function enc.encrypt_text(text) from public, anon;
revoke all on function enc.decrypt_text(bytea) from public, anon;
grant execute on function enc.encrypt_text(text) to authenticated, service_role;
grant execute on function enc.decrypt_text(bytea) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Identity
-- ---------------------------------------------------------------------------
create table public.users (
  id                   uuid primary key references auth.users (id) on delete cascade,
  created_at           timestamptz not null default now(),
  is_anonymous         boolean not null default true,
  locale               text,
  timezone             text,
  age_confirmed_at     timestamptz,
  welcome_week_ends_at timestamptz,
  last_opened_at       timestamptz,       -- the 24-month rule for never-linked accounts (docs/07 §5)
  deleted_at           timestamptz
);
comment on table public.users is 'Mirror of auth.users plus product fields. DOB is never stored (D46).';

-- Mirror auth.users into public.users (M1-03 was coded without this row).
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, created_at, is_anonymous)
  values (new.id, coalesce(new.created_at, now()), coalesce(new.is_anonymous, false))
  on conflict (id) do nothing;
  return new;
end
$$;
revoke all on function public.handle_auth_user_created() from public, anon, authenticated;
grant execute on function public.handle_auth_user_created() to supabase_auth_admin;

create or replace function public.handle_auth_user_linked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users set is_anonymous = coalesce(new.is_anonymous, false) where id = new.id;
  return new;
end
$$;
revoke all on function public.handle_auth_user_linked() from public, anon, authenticated;
grant execute on function public.handle_auth_user_linked() to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_created();

create trigger on_auth_user_linked
  after update of is_anonymous on auth.users
  for each row execute function public.handle_auth_user_linked();

create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.users (id) on delete cascade,
  kind         text not null check (kind in ('terms', 'ai_processing', 'special_category', 'quality_review', 'marketing_use')),
  version      text not null,
  locale       text not null,
  granted_at   timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index consents_user_id_idx on public.consents (user_id);

create table public.profiles (
  user_id            uuid primary key default auth.uid() references public.users (id) on delete cascade,
  display_name       text,
  pronouns           text,
  tone               text[] not null default '{}',
  avoid              text[] not null default '{}',
  focus_weights      jsonb not null default '{}'::jsonb check (jsonb_typeof(focus_weights) = 'object'),
  style_notes        text,
  theme              text not null default 'paper',
  lockscreen_private boolean not null default false,
  simple_mode        boolean not null default false,
  app_lock           boolean not null default false,
  reply_default      text not null default 'reply' check (reply_default in ('reply', 'listen')),
  updated_at         timestamptz not null default now()
);

create table public.delivery_prefs (
  user_id      uuid primary key default auth.uid() references public.users (id) on delete cascade,
  slots        jsonb not null default '[]'::jsonb
               check (jsonb_typeof(slots) = 'array' and jsonb_array_length(slots) <= 4),   -- [{slot, time}], one Rustle per slot (D46)
  quiet_hours  jsonb,
  adaptive     boolean not null default true,
  rhythm       text not null default 'active' check (rhythm in ('active', 'quiet')),
  paused_until timestamptz,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Inputs
-- ---------------------------------------------------------------------------
create table enc.notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references public.users (id) on delete cascade,
  body_enc          bytea not null,
  mood              smallint check (mood between 1 and 5),
  source            text not null default 'board' check (source in ('onboarding', 'board', 'checkin', 'voice')),
  wants_reply       boolean not null default true,
  pinned            boolean not null default false,
  hidden_from_recap boolean not null default false,
  exclude_from_ai   boolean not null default false,
  safety_level      text check (safety_level in ('none', 'low', 'elevated', 'crisis')),
  life_areas        public.life_area[] not null default '{}',
  created_at        timestamptz not null default now(),
  edited_at         timestamptz,
  deleted_at        timestamptz
);
create index notes_user_created_idx on enc.notes (user_id, created_at desc);

create table public.checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.users (id) on delete cascade,
  mood       smallint not null check (mood between 1 and 5),
  energy     smallint check (energy between 1 and 5),
  line       text check (char_length(line) <= 280),
  created_at timestamptz not null default now()
);
create index checkins_user_created_idx on public.checkins (user_id, created_at desc);

create table public.key_dates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.users (id) on delete cascade,
  label          text not null,
  date           date not null,
  kind           text not null default 'other' check (kind in ('exam', 'appointment', 'anniversary', 'court', 'medical', 'other')),
  remind         boolean not null default true,
  recurring      boolean not null default false,
  source_note_id uuid references enc.notes (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index key_dates_user_date_idx on public.key_dates (user_id, date);

-- ---------------------------------------------------------------------------
-- 4. Memory
-- ---------------------------------------------------------------------------
create table enc.memory_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.users (id) on delete cascade,
  kind            text not null check (kind in ('fact', 'person', 'situation', 'feeling', 'win', 'struggle', 'helps', 'avoid', 'goal', 'date', 'identity')),
  content_enc     bytea not null,
  salience        real not null default 0.5 check (salience between 0 and 1),
  status          text not null default 'active' check (status in ('active', 'resolved', 'archived', 'user_deleted')),
  resolved_at     timestamptz,
  life_areas      public.life_area[] not null default '{}',
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  times_mentioned integer not null default 1,
  source_note_ids uuid[] not null default '{}',
  user_visible    boolean not null default true,
  user_edited     boolean not null default false
);
create index memory_items_user_status_idx on enc.memory_items (user_id, status);

create table enc.memory_summary (
  user_id     uuid primary key default auth.uid() references public.users (id) on delete cascade,
  summary_enc bytea,
  version     integer not null default 1,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. Outputs
-- ---------------------------------------------------------------------------
create table enc.deliveries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.users (id) on delete cascade,
  body_enc        bytea not null,
  kind            public.delivery_intent not null,
  scheduled_for   timestamptz not null,
  delivered_at    timestamptz,
  opened_at       timestamptz,
  reaction        text check (reaction in ('heart', 'not_quite')),
  reaction_reason text check (reaction_reason in ('too_generic', 'too_positive', 'wrong_topic', 'too_long', 'dont_mention')),
  memory_refs     uuid[] not null default '{}',
  model           text,
  prompt_version  text,
  cost_micros     integer,
  created_at      timestamptz not null default now()
);
create index deliveries_user_scheduled_idx on enc.deliveries (user_id, scheduled_for desc);

create table enc.replies (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.users (id) on delete cascade,
  note_id         uuid not null references enc.notes (id) on delete cascade,
  body_enc        bytea not null,
  visible_at      timestamptz not null default now(),
  reaction        text check (reaction in ('heart', 'not_quite')),
  reaction_reason text check (reaction_reason in ('too_generic', 'too_positive', 'wrong_topic', 'too_long', 'dont_mention')),
  model           text,
  prompt_version  text,
  created_at      timestamptz not null default now()
);
create index replies_user_note_idx on enc.replies (user_id, note_id);

create table enc.recaps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.users (id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  cards_enc    bytea not null,
  helped       text check (helped in ('a_lot', 'a_little', 'not_really')),
  created_at   timestamptz not null default now(),
  viewed_at    timestamptz,
  shared       boolean not null default false
);
create index recaps_user_period_idx on enc.recaps (user_id, period_start desc);

create table public.warm_notes (
  id                text primary key check (char_length(id) between 10 and 64),   -- short, unguessable slug
  sender_user_id    uuid not null default auth.uid() references public.users (id) on delete cascade,
  recipient_label   text,
  situation         text not null,
  body              text not null check (char_length(body) <= 220),
  card_style        text not null default 'paper',
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default now() + interval '30 days',
  opened_count      integer not null default 0,
  thanked_at        timestamptz,
  revoked           boolean not null default false,
  reported_at       timestamptz,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'held', 'removed'))
);
create index warm_notes_sender_idx on public.warm_notes (sender_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 6. Entitlements
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id     uuid primary key references public.users (id) on delete cascade,
  entitlement text not null default 'premium',
  product_id  text,
  status      text not null,
  expires_at  timestamptz,
  store       text,
  updated_at  timestamptz not null default now()
);

create table public.entitlement_grants (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  kind            text not null check (kind in ('beta', 'creator', 'student', 'gift', 'partner', 'hardship', 'support')),
  entitlement     text not null default 'premium',
  duration_days   integer not null check (duration_days > 0),
  partner_id      uuid,
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redeemed_by     uuid[] not null default '{}',
  created_at      timestamptz not null default now(),
  expires_at      timestamptz
);

-- ---------------------------------------------------------------------------
-- 7. Ops
-- ---------------------------------------------------------------------------
create table public.jobs (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  user_id    uuid references public.users (id) on delete cascade,
  payload    jsonb not null default '{}'::jsonb,   -- IDs and parameters only, never note text
  run_at     timestamptz not null default now(),
  status     text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts   integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_claim_idx on public.jobs (status, run_at) where status = 'queued';

create table public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.users (id) on delete cascade,
  token      text not null,
  platform   text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create table public.safety_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  note_id      uuid references enc.notes (id) on delete set null,
  level        text not null check (level in ('low', 'elevated', 'crisis')),
  action_taken text not null,
  created_at   timestamptz not null default now()
);
create index safety_events_user_idx on public.safety_events (user_id, created_at desc);

-- Per-call cost log (docs/07 §7; the writer lives in M1-05). No prompt or output text, ever.
create table public.llm_calls (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid references public.users (id) on delete set null,
  step                        text not null,          -- safety|extract|daily|reply|recap|warm_note|guardrail|first|seed
  tier                        text,                   -- fast|writer|deep
  provider                    text not null default 'anthropic',
  model                       text not null,
  prompt_version              text not null,
  input_tokens                integer not null default 0,
  output_tokens               integer not null default 0,
  cache_read_input_tokens     integer not null default 0,
  cache_creation_input_tokens integer not null default 0,
  cost_micros                 integer not null default 0,
  latency_ms                  integer,
  batch_id                    text,
  status                      text not null default 'ok' check (status in ('ok', 'error', 'fallback')),
  created_at                  timestamptz not null default now()
);
create index llm_calls_created_idx on public.llm_calls (created_at desc);
create index llm_calls_step_created_idx on public.llm_calls (step, created_at desc);

-- ---------------------------------------------------------------------------
-- 8. Decrypting views (security_invoker) with INSTEAD OF triggers
-- ---------------------------------------------------------------------------

-- notes ----------------------------------------------------------------------
create view public.notes with (security_invoker = true) as
  select id, user_id, enc.decrypt_text(body_enc) as body, mood, source, wants_reply, pinned,
         hidden_from_recap, exclude_from_ai, safety_level, life_areas, created_at, edited_at, deleted_at
  from enc.notes;

alter view public.notes alter column id set default gen_random_uuid();
alter view public.notes alter column user_id set default auth.uid();
alter view public.notes alter column source set default 'board';
alter view public.notes alter column wants_reply set default true;
alter view public.notes alter column pinned set default false;
alter view public.notes alter column hidden_from_recap set default false;
alter view public.notes alter column exclude_from_ai set default false;
alter view public.notes alter column life_areas set default '{}';
alter view public.notes alter column created_at set default now();

create function public.notes_insert() returns trigger language plpgsql set search_path = '' as $$
begin
  insert into enc.notes (id, user_id, body_enc, mood, source, wants_reply, pinned, hidden_from_recap,
                         exclude_from_ai, safety_level, life_areas, created_at, edited_at, deleted_at)
  values (new.id, new.user_id, enc.encrypt_text(new.body), new.mood, new.source, new.wants_reply, new.pinned,
          new.hidden_from_recap, new.exclude_from_ai, new.safety_level, new.life_areas, new.created_at,
          new.edited_at, new.deleted_at);
  return new;
end $$;

create function public.notes_update() returns trigger language plpgsql set search_path = '' as $$
begin
  update enc.notes set
    body_enc = case when new.body is distinct from old.body then enc.encrypt_text(new.body) else body_enc end,
    mood = new.mood, source = new.source, wants_reply = new.wants_reply, pinned = new.pinned,
    hidden_from_recap = new.hidden_from_recap, exclude_from_ai = new.exclude_from_ai,
    safety_level = new.safety_level, life_areas = new.life_areas, edited_at = new.edited_at,
    deleted_at = new.deleted_at
  where id = old.id and user_id = old.user_id;
  return new;
end $$;

create function public.notes_delete() returns trigger language plpgsql set search_path = '' as $$
begin
  delete from enc.notes where id = old.id and user_id = old.user_id;
  return old;
end $$;

create trigger notes_instead_insert instead of insert on public.notes for each row execute function public.notes_insert();
create trigger notes_instead_update instead of update on public.notes for each row execute function public.notes_update();
create trigger notes_instead_delete instead of delete on public.notes for each row execute function public.notes_delete();

-- memory_items -----------------------------------------------------------------
create view public.memory_items with (security_invoker = true) as
  select id, user_id, kind, enc.decrypt_text(content_enc) as content, salience, status, resolved_at,
         life_areas, first_seen_at, last_seen_at, times_mentioned, source_note_ids, user_visible, user_edited
  from enc.memory_items;

alter view public.memory_items alter column id set default gen_random_uuid();
alter view public.memory_items alter column user_id set default auth.uid();
alter view public.memory_items alter column salience set default 0.5;
alter view public.memory_items alter column status set default 'active';
alter view public.memory_items alter column life_areas set default '{}';
alter view public.memory_items alter column first_seen_at set default now();
alter view public.memory_items alter column last_seen_at set default now();
alter view public.memory_items alter column times_mentioned set default 1;
alter view public.memory_items alter column source_note_ids set default '{}';
alter view public.memory_items alter column user_visible set default true;
alter view public.memory_items alter column user_edited set default false;

create function public.memory_items_insert() returns trigger language plpgsql set search_path = '' as $$
begin
  insert into enc.memory_items (id, user_id, kind, content_enc, salience, status, resolved_at, life_areas,
                                first_seen_at, last_seen_at, times_mentioned, source_note_ids, user_visible, user_edited)
  values (new.id, new.user_id, new.kind, enc.encrypt_text(new.content), new.salience, new.status, new.resolved_at,
          new.life_areas, new.first_seen_at, new.last_seen_at, new.times_mentioned, new.source_note_ids,
          new.user_visible, new.user_edited);
  return new;
end $$;

create function public.memory_items_update() returns trigger language plpgsql set search_path = '' as $$
begin
  update enc.memory_items set
    kind = new.kind,
    content_enc = case when new.content is distinct from old.content then enc.encrypt_text(new.content) else content_enc end,
    salience = new.salience, status = new.status, resolved_at = new.resolved_at, life_areas = new.life_areas,
    first_seen_at = new.first_seen_at, last_seen_at = new.last_seen_at, times_mentioned = new.times_mentioned,
    source_note_ids = new.source_note_ids, user_visible = new.user_visible, user_edited = new.user_edited
  where id = old.id and user_id = old.user_id;
  return new;
end $$;

create function public.memory_items_delete() returns trigger language plpgsql set search_path = '' as $$
begin
  delete from enc.memory_items where id = old.id and user_id = old.user_id;
  return old;
end $$;

create trigger memory_items_instead_insert instead of insert on public.memory_items for each row execute function public.memory_items_insert();
create trigger memory_items_instead_update instead of update on public.memory_items for each row execute function public.memory_items_update();
create trigger memory_items_instead_delete instead of delete on public.memory_items for each row execute function public.memory_items_delete();

-- memory_summary ---------------------------------------------------------------
create view public.memory_summary with (security_invoker = true) as
  select user_id, enc.decrypt_text(summary_enc) as summary, version, updated_at
  from enc.memory_summary;

alter view public.memory_summary alter column user_id set default auth.uid();
alter view public.memory_summary alter column version set default 1;
alter view public.memory_summary alter column updated_at set default now();

create function public.memory_summary_insert() returns trigger language plpgsql set search_path = '' as $$
begin
  insert into enc.memory_summary (user_id, summary_enc, version, updated_at)
  values (new.user_id, enc.encrypt_text(new.summary), new.version, new.updated_at);
  return new;
end $$;

create function public.memory_summary_update() returns trigger language plpgsql set search_path = '' as $$
begin
  update enc.memory_summary set
    summary_enc = case when new.summary is distinct from old.summary then enc.encrypt_text(new.summary) else summary_enc end,
    version = new.version, updated_at = new.updated_at
  where user_id = old.user_id;
  return new;
end $$;

create function public.memory_summary_delete() returns trigger language plpgsql set search_path = '' as $$
begin
  delete from enc.memory_summary where user_id = old.user_id;
  return old;
end $$;

create trigger memory_summary_instead_insert instead of insert on public.memory_summary for each row execute function public.memory_summary_insert();
create trigger memory_summary_instead_update instead of update on public.memory_summary for each row execute function public.memory_summary_update();
create trigger memory_summary_instead_delete instead of delete on public.memory_summary for each row execute function public.memory_summary_delete();

-- deliveries -------------------------------------------------------------------
create view public.deliveries with (security_invoker = true) as
  select id, user_id, enc.decrypt_text(body_enc) as body, kind, scheduled_for, delivered_at, opened_at,
         reaction, reaction_reason, memory_refs, model, prompt_version, cost_micros, created_at
  from enc.deliveries;

alter view public.deliveries alter column id set default gen_random_uuid();
alter view public.deliveries alter column user_id set default auth.uid();
alter view public.deliveries alter column memory_refs set default '{}';
alter view public.deliveries alter column created_at set default now();

create function public.deliveries_insert() returns trigger language plpgsql set search_path = '' as $$
begin
  insert into enc.deliveries (id, user_id, body_enc, kind, scheduled_for, delivered_at, opened_at, reaction,
                              reaction_reason, memory_refs, model, prompt_version, cost_micros, created_at)
  values (new.id, new.user_id, enc.encrypt_text(new.body), new.kind, new.scheduled_for, new.delivered_at,
          new.opened_at, new.reaction, new.reaction_reason, new.memory_refs, new.model, new.prompt_version,
          new.cost_micros, new.created_at);
  return new;
end $$;

create function public.deliveries_update() returns trigger language plpgsql set search_path = '' as $$
begin
  update enc.deliveries set
    body_enc = case when new.body is distinct from old.body then enc.encrypt_text(new.body) else body_enc end,
    kind = new.kind, scheduled_for = new.scheduled_for, delivered_at = new.delivered_at, opened_at = new.opened_at,
    reaction = new.reaction, reaction_reason = new.reaction_reason, memory_refs = new.memory_refs,
    model = new.model, prompt_version = new.prompt_version, cost_micros = new.cost_micros
  where id = old.id and user_id = old.user_id;
  return new;
end $$;

create function public.deliveries_delete() returns trigger language plpgsql set search_path = '' as $$
begin
  delete from enc.deliveries where id = old.id and user_id = old.user_id;
  return old;
end $$;

create trigger deliveries_instead_insert instead of insert on public.deliveries for each row execute function public.deliveries_insert();
create trigger deliveries_instead_update instead of update on public.deliveries for each row execute function public.deliveries_update();
create trigger deliveries_instead_delete instead of delete on public.deliveries for each row execute function public.deliveries_delete();

-- replies ----------------------------------------------------------------------
create view public.replies with (security_invoker = true) as
  select id, user_id, note_id, enc.decrypt_text(body_enc) as body, visible_at, reaction, reaction_reason,
         model, prompt_version, created_at
  from enc.replies;

alter view public.replies alter column id set default gen_random_uuid();
alter view public.replies alter column user_id set default auth.uid();
alter view public.replies alter column visible_at set default now();
alter view public.replies alter column created_at set default now();

create function public.replies_insert() returns trigger language plpgsql set search_path = '' as $$
begin
  insert into enc.replies (id, user_id, note_id, body_enc, visible_at, reaction, reaction_reason, model,
                           prompt_version, created_at)
  values (new.id, new.user_id, new.note_id, enc.encrypt_text(new.body), new.visible_at, new.reaction,
          new.reaction_reason, new.model, new.prompt_version, new.created_at);
  return new;
end $$;

create function public.replies_update() returns trigger language plpgsql set search_path = '' as $$
begin
  update enc.replies set
    body_enc = case when new.body is distinct from old.body then enc.encrypt_text(new.body) else body_enc end,
    note_id = new.note_id, visible_at = new.visible_at, reaction = new.reaction,
    reaction_reason = new.reaction_reason, model = new.model, prompt_version = new.prompt_version
  where id = old.id and user_id = old.user_id;
  return new;
end $$;

create function public.replies_delete() returns trigger language plpgsql set search_path = '' as $$
begin
  delete from enc.replies where id = old.id and user_id = old.user_id;
  return old;
end $$;

create trigger replies_instead_insert instead of insert on public.replies for each row execute function public.replies_insert();
create trigger replies_instead_update instead of update on public.replies for each row execute function public.replies_update();
create trigger replies_instead_delete instead of delete on public.replies for each row execute function public.replies_delete();

-- recaps -----------------------------------------------------------------------
create view public.recaps with (security_invoker = true) as
  select id, user_id, period_start, period_end, enc.decrypt_text(cards_enc)::jsonb as cards, helped,
         created_at, viewed_at, shared
  from enc.recaps;

alter view public.recaps alter column id set default gen_random_uuid();
alter view public.recaps alter column user_id set default auth.uid();
alter view public.recaps alter column created_at set default now();
alter view public.recaps alter column shared set default false;

create function public.recaps_insert() returns trigger language plpgsql set search_path = '' as $$
begin
  insert into enc.recaps (id, user_id, period_start, period_end, cards_enc, helped, created_at, viewed_at, shared)
  values (new.id, new.user_id, new.period_start, new.period_end, enc.encrypt_text(new.cards::text), new.helped,
          new.created_at, new.viewed_at, new.shared);
  return new;
end $$;

create function public.recaps_update() returns trigger language plpgsql set search_path = '' as $$
begin
  update enc.recaps set
    period_start = new.period_start, period_end = new.period_end,
    cards_enc = case when new.cards is distinct from old.cards then enc.encrypt_text(new.cards::text) else cards_enc end,
    helped = new.helped, viewed_at = new.viewed_at, shared = new.shared
  where id = old.id and user_id = old.user_id;
  return new;
end $$;

create function public.recaps_delete() returns trigger language plpgsql set search_path = '' as $$
begin
  delete from enc.recaps where id = old.id and user_id = old.user_id;
  return old;
end $$;

create trigger recaps_instead_insert instead of insert on public.recaps for each row execute function public.recaps_insert();
create trigger recaps_instead_update instead of update on public.recaps for each row execute function public.recaps_update();
create trigger recaps_instead_delete instead of delete on public.recaps for each row execute function public.recaps_delete();

-- ---------------------------------------------------------------------------
-- 9. Row-level security: every table, in this migration
-- ---------------------------------------------------------------------------

-- Tables a user owns: read and write own rows only.
create policy users_select_own on public.users for select to authenticated using (id = (select auth.uid()));
create policy users_update_own on public.users for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy consents_select_own on public.consents for select to authenticated using (user_id = (select auth.uid()));
create policy consents_insert_own on public.consents for insert to authenticated with check (user_id = (select auth.uid()));
create policy consents_update_own on public.consents for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy profiles_own on public.profiles for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy delivery_prefs_own on public.delivery_prefs for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy checkins_own on public.checkins for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy key_dates_own on public.key_dates for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_tokens_own on public.push_tokens for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy notes_own on enc.notes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy memory_items_own on enc.memory_items for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy memory_summary_own on enc.memory_summary for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy deliveries_own on enc.deliveries for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy replies_own on enc.replies for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy recaps_own on enc.recaps for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Sender-only (docs/07 §8); the public page goes through the RPCs below. Rows are written by the
-- warm-notes Edge Function (service role) after moderation; the sender may read, revoke and delete.
create policy warm_notes_sender_select on public.warm_notes for select to authenticated using (sender_user_id = (select auth.uid()));
create policy warm_notes_sender_update on public.warm_notes for update to authenticated using (sender_user_id = (select auth.uid())) with check (sender_user_id = (select auth.uid()));
create policy warm_notes_sender_delete on public.warm_notes for delete to authenticated using (sender_user_id = (select auth.uid()));

-- Read-only for the user; written by the RevenueCat webhook with the service role.
create policy subscriptions_select_own on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));

-- Deny-all for users (RLS on, no policies): the service role alone reaches these.
alter table public.users              enable row level security;
alter table public.consents           enable row level security;
alter table public.profiles           enable row level security;
alter table public.delivery_prefs     enable row level security;
alter table enc.notes                 enable row level security;
alter table public.checkins           enable row level security;
alter table public.key_dates          enable row level security;
alter table enc.memory_items          enable row level security;
alter table enc.memory_summary        enable row level security;
alter table enc.deliveries            enable row level security;
alter table enc.replies               enable row level security;
alter table enc.recaps                enable row level security;
alter table public.warm_notes         enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.entitlement_grants enable row level security;
alter table public.jobs               enable row level security;
alter table public.push_tokens        enable row level security;
alter table public.safety_events      enable row level security;
alter table public.llm_calls          enable row level security;

-- ---------------------------------------------------------------------------
-- 10. Grants. Anonymous-auth users are `authenticated`; `anon` gets nothing but the RPCs.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant select, insert, update, delete on enc.notes, enc.memory_items, enc.memory_summary, enc.deliveries, enc.replies, enc.recaps
  to authenticated, service_role;

-- Column-level limits on what a user may change directly; the rest is server-side.
revoke update on public.users from authenticated;
grant update (locale, timezone, age_confirmed_at, last_opened_at) on public.users to authenticated;
revoke insert, delete on public.users from authenticated;

revoke update on public.consents from authenticated;
grant update (withdrawn_at) on public.consents to authenticated;
revoke delete on public.consents from authenticated;

-- warm_notes: the server publishes (App Attest, rate limit, moderation happen there); the sender
-- can only revoke. Body, slug, expiry, counters and moderation state are never client-writable.
revoke insert, update on public.warm_notes from authenticated;
grant update (revoked) on public.warm_notes to authenticated;

-- Server-written outputs: the user reacts, opens, rates and deletes; only the server creates
-- them or sets model, prompt_version and cost (docs/07 §3, §7).
revoke insert, update on public.deliveries from authenticated;
grant update (delivered_at, opened_at, reaction, reaction_reason) on public.deliveries to authenticated;
revoke insert, update on public.replies from authenticated;
grant update (reaction, reaction_reason) on public.replies to authenticated;
revoke insert, update on public.recaps from authenticated;
grant update (helped, viewed_at, shared) on public.recaps to authenticated;
revoke insert, update on public.memory_summary from authenticated;   -- read and delete only

-- notes: the safety level is set by the server-side gate (docs/08 §7), never by the client.
revoke insert, update on public.notes from authenticated;
grant insert (id, user_id, body, mood, source, wants_reply, pinned, hidden_from_recap, exclude_from_ai, life_areas, created_at, edited_at, deleted_at) on public.notes to authenticated;
grant update (body, mood, source, wants_reply, pinned, hidden_from_recap, exclude_from_ai, life_areas, edited_at, deleted_at) on public.notes to authenticated;

revoke insert, update, delete on public.subscriptions from authenticated;
revoke all on public.entitlement_grants from authenticated;
revoke all on public.jobs from authenticated;
revoke all on public.safety_events from authenticated;
revoke all on public.llm_calls from authenticated;

-- ---------------------------------------------------------------------------
-- 11. RPCs
-- ---------------------------------------------------------------------------

-- Hard delete of the caller's own account: auth.users → public.users → everything (cascade).
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end
$$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- The public warm-note page (docs/07 §8): only the fields the page shows, and only while the
-- note is live. Counts the view. Called by the web with the anon key.
create or replace function public.warm_note_read(slug text)
returns table (body text, card_style text, recipient_label text, sender_first_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    with hit as (
      update public.warm_notes w
      set opened_count = w.opened_count + 1
      where w.id = slug
        and not w.revoked
        and w.expires_at > now()
        and w.moderation_status = 'approved'
      returning w.body, w.card_style, w.recipient_label, w.sender_user_id
    )
    select hit.body, hit.card_style, hit.recipient_label,
           nullif(split_part(coalesce(p.display_name, ''), ' ', 1), '') as sender_first_name
    from hit
    left join public.profiles p on p.user_id = hit.sender_user_id;
end
$$;
revoke all on function public.warm_note_read(text) from public;
grant execute on function public.warm_note_read(text) to anon, authenticated, service_role;

-- The recipient's one-tap thank you: sets thanked_at once and queues the sender's single push.
create or replace function public.warm_note_thank(slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender uuid;
begin
  update public.warm_notes w
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
revoke all on function public.warm_note_thank(text) from public;
grant execute on function public.warm_note_thank(text) to anon, authenticated, service_role;
