import { QueryClient } from '@tanstack/react-query';

import {
  checkinsQueryKey,
  createCheckin,
  createNote,
  deleteNote,
  editNote,
  notesQueryKey,
  overlayPending,
  type BoardNote,
  type Checkin,
  type NotesApiDeps,
} from '../../../features/notes/api';
import type { NoteFields } from '../types';
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
});
