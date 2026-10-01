import { QueryClient } from '@tanstack/react-query';

import {
  CheckinLineTooLongError,
  NoteTooLongError,
  checkinsQueryKey,
  createCheckin,
  createNote,
  deleteNote,
  editNote,
  notesQueryKey,
  overlayPending,
  parseNoteRows,
  type BoardNote,
  type Checkin,
  type NotesApiDeps,
} from '../../../features/notes/api';
import { CHECKIN_LINE_MAX_CHARS, NOTE_BODY_MAX_CHARS, type NoteFields } from '../types';
import { idle, setup, testUuid } from './harness';

function apiDeps(online: boolean) {
  const harness = setup({ online });
  // No garbage-collection timers left running after the test.
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  let tick = 0;
  const deps: NotesApiDeps = {
    outbox: harness.outbox,
    queryClient,
    newId: testUuid,
    now: () => new Date(Date.UTC(2026, 9, 1, 12, 0, tick++)),
  };
  const notes = () => queryClient.getQueryData<BoardNote[]>(notesQueryKey) ?? [];
  return { ...harness, deps, queryClient, notes };
}

describe('notes api over the outbox', () => {
  it('a note written offline shows in the cache at once, marked pending, and clears when synced', async () => {
    const { deps, outbox, net, notes, server } = apiDeps(false);
    outbox.start();
    await idle(outbox);

    const note = createNote(deps, { body: 'on the plane' });
    expect(notes()).toEqual([expect.objectContaining({ id: note.id, body: 'on the plane', pending: true })]);

    editNote(deps, note.id, { body: 'on the plane, edited' });
    expect(notes()[0]).toMatchObject({ body: 'on the plane, edited', pending: true });
    expect(outbox.items()).toHaveLength(1);

    net.set(true);
    await idle(outbox);
    expect(server.tables.notes.get(note.id)).toMatchObject({ body: 'on the plane, edited' });
    expect(overlayPending(notes(), outbox.items())[0]?.pending).toBe(false);
  });

  it('delete removes the note from the cache, including one that never synced', async () => {
    const { deps, outbox, notes } = apiDeps(false);
    outbox.start();
    await idle(outbox);
    const kept = createNote(deps, { body: 'kept' });
    const gone = createNote(deps, { body: 'gone' });
    deleteNote(deps, gone.id);
    expect(notes().map((note) => note.id)).toEqual([kept.id]);
    expect(outbox.items()).toHaveLength(1);
  });

  it('after a cold start the queued notes overlay the cached list, newest first', () => {
    const noteId = testUuid();
    const fields: NoteFields = {
      body: 'from the server',
      mood: null,
      source: 'board',
      wants_reply: true,
      pinned: false,
      hidden_from_recap: false,
      exclude_from_ai: false,
      life_areas: [],
    };
    const server: BoardNote = {
      ...fields,
      id: testUuid(),
      created_at: '2026-09-30T12:00:00.000Z',
      edited_at: null,
      deleted_at: null,
      pending: false,
    };
    const { outbox } = setup({ online: false });
    outbox.enqueue({
      kind: 'note_create',
      noteId,
      fields: { ...fields, body: 'queued' },
      created_at: '2026-10-01T12:00:00.000Z',
      edited_at: null,
    });
    outbox.enqueue({ kind: 'note_update', noteId: server.id, patch: { pinned: true }, edited_at: '2026-10-01T12:01:00.000Z' });

    const merged = overlayPending([server], outbox.items());
    expect(merged.map((note) => [note.id, note.pending])).toEqual([
      [noteId, true],
      [server.id, true],
    ]);
    expect(merged[1]?.pinned).toBe(true);
  });

  it('a check-in shows in the cache at once and syncs', async () => {
    const { deps, outbox, queryClient, net, server } = apiDeps(false);
    outbox.start();
    await idle(outbox);
    const checkin = createCheckin(deps, { mood: 4, line: 'slept well' });
    expect(queryClient.getQueryData<Checkin[]>(checkinsQueryKey)).toEqual([checkin]);
    net.set(true);
    await idle(outbox);
    expect(server.tables.checkins.get(checkin.id)).toMatchObject({ mood: 4, line: 'slept well', energy: null });
  });

  it('refuses a note body over the limit before anything is queued or shown, without the text in the error', async () => {
    const { deps, outbox, notes } = apiDeps(false);
    const tooLong = 'é'.repeat(NOTE_BODY_MAX_CHARS + 1);
    let thrown: unknown;
    try {
      createNote(deps, { body: tooLong });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(NoteTooLongError);
    expect(thrown).toMatchObject({ length: NOTE_BODY_MAX_CHARS + 1, limit: NOTE_BODY_MAX_CHARS });
    expect(String((thrown as Error).message)).not.toContain('é');
    expect(outbox.items()).toEqual([]);
    expect(notes()).toEqual([]);

    // Exactly at the limit is fine; an emoji counts as one character, as it does for Postgres.
    const atLimit = createNote(deps, { body: '🌿'.repeat(NOTE_BODY_MAX_CHARS) });
    expect(outbox.items()).toHaveLength(1);

    expect(() => editNote(deps, atLimit.id, { body: 'x'.repeat(NOTE_BODY_MAX_CHARS + 1) })).toThrow(NoteTooLongError);
    expect(notes()[0]?.body).toBe('🌿'.repeat(NOTE_BODY_MAX_CHARS));
    const queued = outbox.items()[0]?.op;
    expect(queued?.kind === 'note_create' ? queued.fields.body : null).toBe('🌿'.repeat(NOTE_BODY_MAX_CHARS));
  });

  it('refuses a check-in line over the limit before anything is queued or shown', () => {
    const { deps, outbox, queryClient } = apiDeps(false);
    expect(() => createCheckin(deps, { mood: 3, line: 'a'.repeat(CHECKIN_LINE_MAX_CHARS + 1) })).toThrow(
      expect.objectContaining({ name: 'CheckinLineTooLongError', length: CHECKIN_LINE_MAX_CHARS + 1, limit: CHECKIN_LINE_MAX_CHARS }),
    );
    expect(outbox.items()).toEqual([]);
    expect(queryClient.getQueryData(checkinsQueryKey)).toBeUndefined();
    expect(() => createCheckin(deps, { mood: 3, line: 'a'.repeat(CHECKIN_LINE_MAX_CHARS) })).not.toThrow();
    expect(new CheckinLineTooLongError(300).limit).toBe(CHECKIN_LINE_MAX_CHARS);
  });

  it('shows what the server holds: no length cap on read, unknown enum values kept, unreadable rows counted only', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const row = {
      id: testUuid(),
      body: 'x'.repeat(NOTE_BODY_MAX_CHARS + 500),
      mood: null,
      source: 'a_future_source',
      wants_reply: true,
      pinned: false,
      hidden_from_recap: false,
      exclude_from_ai: false,
      life_areas: ['a_future_area'],
      created_at: '2026-01-01T00:00:00.000Z',
      edited_at: null,
      deleted_at: null,
    };
    const rows = parseNoteRows([row, { id: 'broken', body: 'secret text' }]);
    expect(rows.map((note) => note.id)).toEqual([row.id]);
    expect(rows[0]?.body).toHaveLength(NOTE_BODY_MAX_CHARS + 500);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('notes_unreadable_rows:1');
    warn.mockRestore();
  });
});
