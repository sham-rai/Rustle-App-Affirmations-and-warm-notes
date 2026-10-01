import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { getOutbox, type NoteFields, type NotePatch, type Outbox, type OutboxItem } from '../../lib/outbox';
import {
  CHECKIN_LINE_MAX_CHARS,
  NOTE_BODY_MAX_CHARS,
  charLength,
} from '../../lib/outbox/types';
import { getSupabase } from '../../lib/supabase';

// Notes and check-ins are written only through the offline outbox (docs/07 §4.2 step 1): the
// write lands in the TanStack Query cache at once, is queued in the encrypted MMKV file, and syncs
// when the connection allows. Ids are generated here, so the same id is the idempotency key.

export const notesQueryKey = ['notes'] as const;
export const checkinsQueryKey = ['checkins'] as const;

const NOTE_COLUMNS =
  'id, body, mood, source, wants_reply, pinned, hidden_from_recap, exclude_from_ai, life_areas, created_at, edited_at, deleted_at';

/**
 * What the server already holds is shown as it is: no client-side length cap (that applies to
 * writes only), and `source` / `life_areas` read as plain strings, so a value added server-side
 * later never hides a note. Parsed loosely, then cast to the typed fields.
 */
const serverNoteRowSchema = z.object({
  id: z.string(),
  body: z.string(),
  mood: z.number().nullable(),
  source: z.string(),
  wants_reply: z.boolean(),
  pinned: z.boolean(),
  hidden_from_recap: z.boolean(),
  exclude_from_ai: z.boolean(),
  life_areas: z.array(z.string()),
  created_at: z.string(),
  edited_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
});

export interface NoteRow extends NoteFields {
  id: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface BoardNote extends NoteRow {
  /** True while a write to this note waits in the outbox. */
  pending: boolean;
}

export interface Checkin {
  id: string;
  mood: number;
  energy: number | null;
  line: string | null;
  created_at: string;
  pending: boolean;
}

export type NewNoteInput = Pick<NoteFields, 'body'> & Partial<Omit<NoteFields, 'body'>>;
export interface NewCheckinInput {
  mood: number;
  energy?: number | null;
  line?: string | null;
}

export interface NotesApiDeps {
  outbox: Pick<Outbox, 'enqueue' | 'items'>;
  queryClient: QueryClient;
  newId: () => string;
  now: () => Date;
}

/** A note body over the limit. Carries the length and the limit, never the text. */
export class NoteTooLongError extends Error {
  readonly length: number;
  readonly limit: number;
  constructor(length: number, limit: number = NOTE_BODY_MAX_CHARS) {
    super(`note_too_long:${length}>${limit}`);
    this.name = 'NoteTooLongError';
    this.length = length;
    this.limit = limit;
  }
}

/** A check-in line over the limit. Carries the length and the limit, never the text. */
export class CheckinLineTooLongError extends Error {
  readonly length: number;
  readonly limit: number;
  constructor(length: number, limit: number = CHECKIN_LINE_MAX_CHARS) {
    super(`checkin_line_too_long:${length}>${limit}`);
    this.name = 'CheckinLineTooLongError';
    this.length = length;
    this.limit = limit;
  }
}

function assertNoteBody(body: string): void {
  const length = charLength(body);
  if (length > NOTE_BODY_MAX_CHARS) throw new NoteTooLongError(length);
}

const byNewest = (a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at);

/**
 * Lays the queued writes over a list of notes: queued creates appear, queued edits apply, queued
 * deletes hide the note, and `pending` marks every note with a write in flight. Idempotent, so it
 * can run on every outbox change.
 */
export function overlayPending(notes: readonly BoardNote[], items: readonly OutboxItem[]): BoardNote[] {
  const byId = new Map<string, BoardNote>();
  for (const note of notes) byId.set(note.id, { ...note, pending: false });
  for (const { op } of items) {
    if (op.kind === 'checkin_create') continue;
    const current = byId.get(op.noteId);
    if (op.kind === 'note_create') {
      byId.set(op.noteId, {
        ...op.fields,
        id: op.noteId,
        created_at: op.created_at,
        edited_at: op.edited_at,
        deleted_at: null,
        pending: true,
      });
    } else if (op.kind === 'note_update') {
      if (current) byId.set(op.noteId, { ...current, ...op.patch, id: op.noteId, edited_at: op.edited_at, pending: true });
    } else {
      byId.delete(op.noteId);
    }
  }
  return [...byId.values()].filter((note) => note.deleted_at === null).sort(byNewest);
}

function setNotes(deps: NotesApiDeps, update: (notes: BoardNote[]) => BoardNote[]): void {
  deps.queryClient.setQueryData<BoardNote[]>(notesQueryKey, (previous) =>
    overlayPending(update(previous ?? []), deps.outbox.items()),
  );
}

/** Throws `NoteTooLongError` before anything is queued or shown. */
export function createNote(deps: NotesApiDeps, input: NewNoteInput): BoardNote {
  assertNoteBody(input.body);
  const id = deps.newId();
  const fields: NoteFields = {
    body: input.body,
    mood: input.mood ?? null,
    source: input.source ?? 'board',
    wants_reply: input.wants_reply ?? true,
    pinned: input.pinned ?? false,
    hidden_from_recap: input.hidden_from_recap ?? false,
    exclude_from_ai: input.exclude_from_ai ?? false,
    life_areas: input.life_areas ?? [],
  };
  const created_at = deps.now().toISOString();
  deps.outbox.enqueue({ kind: 'note_create', noteId: id, fields, created_at, edited_at: null });
  const note: BoardNote = { id, ...fields, created_at, edited_at: null, deleted_at: null, pending: true };
  setNotes(deps, (notes) => [note, ...notes.filter((existing) => existing.id !== id)]);
  return note;
}

/**
 * Last write wins: folded into a queued create or edit of the same note, else queued on its own.
 * Throws `NoteTooLongError` before anything is queued.
 */
export function editNote(deps: NotesApiDeps, id: string, patch: NotePatch): void {
  if (patch.body !== undefined) assertNoteBody(patch.body);
  const edited_at = deps.now().toISOString();
  deps.outbox.enqueue({ kind: 'note_update', noteId: id, patch, edited_at });
  setNotes(deps, (notes) => notes.map((note) => (note.id === id ? { ...note, ...patch, edited_at } : note)));
}

/** Soft delete (`deleted_at`); a note that never left the device is just dropped from the queue. */
export function deleteNote(deps: NotesApiDeps, id: string): void {
  deps.outbox.enqueue({ kind: 'note_delete', noteId: id, deleted_at: deps.now().toISOString() });
  setNotes(deps, (notes) => notes.filter((note) => note.id !== id));
}

/** Throws `CheckinLineTooLongError` before anything is queued or shown. */
export function createCheckin(deps: NotesApiDeps, input: NewCheckinInput): Checkin {
  if (input.line) {
    const length = charLength(input.line);
    if (length > CHECKIN_LINE_MAX_CHARS) throw new CheckinLineTooLongError(length);
  }
  const checkin: Checkin = {
    id: deps.newId(),
    mood: input.mood,
    energy: input.energy ?? null,
    line: input.line ?? null,
    created_at: deps.now().toISOString(),
    pending: true,
  };
  deps.outbox.enqueue({
    kind: 'checkin_create',
    checkinId: checkin.id,
    mood: checkin.mood,
    energy: checkin.energy,
    line: checkin.line,
    created_at: checkin.created_at,
  });
  deps.queryClient.setQueryData<Checkin[]>(checkinsQueryKey, (previous) => [checkin, ...(previous ?? [])]);
  return checkin;
}

/** The user's live notes from the `notes` view (RLS keeps it to their own), newest first. */
export async function fetchNoteRows(): Promise<BoardNote[]> {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('notes')
    .select(NOTE_COLUMNS)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  // The error carries a code only; never its details, which may quote the row.
  if (error) throw new Error(`notes_fetch_failed:${error.code}`);
  return parseNoteRows(data ?? []);
}

/** Rows from the `notes` view as board notes. Unreadable rows are counted in one warning, count only. */
export function parseNoteRows(data: readonly unknown[]): BoardNote[] {
  const rows: BoardNote[] = [];
  let unreadable = 0;
  for (const row of data) {
    const parsed = serverNoteRowSchema.safeParse(row);
    if (!parsed.success) {
      unreadable += 1;
      continue;
    }
    const { source, life_areas, ...rest } = parsed.data;
    rows.push({
      ...rest,
      source: source as NoteFields['source'],
      life_areas: life_areas as NoteFields['life_areas'],
      pending: false,
    });
  }
  if (unreadable > 0) console.warn(`notes_unreadable_rows:${unreadable}`);
  return rows;
}

function useNotesApiDeps(): NotesApiDeps {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({ outbox: getOutbox(), queryClient, newId: () => Crypto.randomUUID(), now: () => new Date() }),
    [queryClient],
  );
}

/**
 * The board's notes: server rows with the outbox laid over them. Offline, the last cached list
 * (or the queued notes alone, after a cold start) is shown instead of an error.
 */
export function useNotes() {
  const deps = useNotesApiDeps();
  const { outbox, queryClient } = deps;

  useEffect(() => {
    const fullOutbox = getOutbox();
    const unsubscribe = fullOutbox.subscribe(() => setNotes(deps, (notes) => notes));
    const unsubscribeEvents = fullOutbox.onEvent((event) => {
      // A write the server refused is gone from the queue; show the server's truth again.
      if (event.type === 'dropped') void queryClient.invalidateQueries({ queryKey: notesQueryKey });
    });
    return () => {
      unsubscribe();
      unsubscribeEvents();
    };
  }, [deps, queryClient]);

  return useQuery({
    queryKey: notesQueryKey,
    queryFn: async () => {
      try {
        return overlayPending(await fetchNoteRows(), outbox.items());
      } catch (error) {
        const previous = queryClient.getQueryData<BoardNote[]>(notesQueryKey);
        if (previous || outbox.items().length > 0) return overlayPending(previous ?? [], outbox.items());
        throw error;
      }
    },
  });
}

/** Note and check-in writes bound to the app's outbox and query cache. */
export function useNoteActions() {
  const deps = useNotesApiDeps();
  return useMemo(
    () => ({
      createNote: (input: NewNoteInput) => createNote(deps, input),
      editNote: (id: string, patch: NotePatch) => editNote(deps, id, patch),
      deleteNote: (id: string) => deleteNote(deps, id),
      createCheckin: (input: NewCheckinInput) => createCheckin(deps, input),
    }),
    [deps],
  );
}
