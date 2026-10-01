import type { SupabaseClient } from '@supabase/supabase-js';

import type { OutboxItem, OutboxTransport, SendResult } from './types';

/** Postgres unique violation: the row with this client-generated id is already on the server. */
export const UNIQUE_VIOLATION = '23505';

export interface WriteResult {
  /** Postgres SQLSTATE or PostgREST code; empty for a network failure. */
  error: { code: string } | null;
  /** HTTP status; 0 when the request never got a response. */
  status: number;
}

/** The three calls the outbox makes, so the transport can be tested against a fake. */
export interface OutboxDb {
  hasSession(): Promise<boolean>;
  insert(table: 'notes' | 'checkins', row: Record<string, unknown>): Promise<WriteResult>;
  update(table: 'notes', id: string, values: Record<string, unknown>): Promise<WriteResult>;
}

/**
 * Notes go through the `notes` view (decrypting view with INSTEAD OF triggers, migration 1) and
 * check-ins to the `checkins` table, both under RLS. No `.select()`: nothing is read back, so no
 * note text travels twice.
 */
export function supabaseOutboxDb(client: SupabaseClient): OutboxDb {
  return {
    async hasSession() {
      const { data } = await client.auth.getSession();
      return data.session !== null;
    },
    async insert(table, row) {
      const { error, status } = await client.from(table).insert(row);
      return { error: error ? { code: error.code ?? '' } : null, status };
    },
    async update(table, id, values) {
      const { error, status } = await client.from(table).update(values).eq('id', id);
      return { error: error ? { code: error.code ?? '' } : null, status };
    },
  };
}

/**
 * Transient: no response, 408, 429, 5xx, and a 401 from PostgREST's JWT checks (PGRST3xx: the
 * session is being refreshed). Everything else is permanent, including an RLS denial (42501),
 * a check-constraint failure (23514) and any other 4xx.
 */
export function classify(result: WriteResult): SendResult {
  if (!result.error) return { outcome: 'ok' };
  const { status } = result;
  const code = result.error.code;
  const transient =
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    (status === 401 && code.startsWith('PGRST3'));
  return { outcome: transient ? 'transient' : 'permanent', status, code };
}

/**
 * Idempotent replay. Every row id is generated on the device and is the idempotency key of its
 * create, so a re-send never makes a second row: an insert that hits a unique violation means an
 * earlier attempt landed. For a note, the queued fields are then written as an update, since an
 * offline edit may have been folded into the create after that attempt (last write wins). Updates
 * and soft deletes by id are idempotent by nature.
 *
 * Notes are not upserted (`on conflict`): PostgREST upserts need a unique index on the target,
 * and `notes` is a view.
 */
export function createSupabaseTransport(getDb: () => OutboxDb | null): OutboxTransport {
  return {
    async canSend() {
      const db = getDb();
      return db !== null && (await db.hasSession());
    },
    async send(item: OutboxItem): Promise<SendResult> {
      const db = getDb();
      // The worker checks canSend first; this guards a session lost between the two calls.
      if (!db || !(await db.hasSession())) return { outcome: 'transient', status: 0, code: 'no_session' };
      const { op } = item;
      switch (op.kind) {
        case 'note_create': {
          const inserted = await db.insert('notes', {
            id: op.noteId,
            ...op.fields,
            created_at: op.created_at,
            edited_at: op.edited_at,
          });
          if (inserted.error?.code !== UNIQUE_VIOLATION) return classify(inserted);
          return classify(await db.update('notes', op.noteId, { ...op.fields, edited_at: op.edited_at }));
        }
        case 'note_update':
          return classify(await db.update('notes', op.noteId, { ...op.patch, edited_at: op.edited_at }));
        case 'note_delete':
          return classify(await db.update('notes', op.noteId, { deleted_at: op.deleted_at }));
        case 'checkin_create': {
          const inserted = await db.insert('checkins', {
            id: op.checkinId,
            mood: op.mood,
            energy: op.energy,
            line: op.line,
            created_at: op.created_at,
          });
          if (inserted.error?.code === UNIQUE_VIOLATION) return { outcome: 'ok' };
          return classify(inserted);
        }
      }
    },
  };
}
