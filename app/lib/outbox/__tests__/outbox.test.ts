import { fakeCache } from '../../secure-storage/__tests__/fakes';
import { createOutbox } from '../outbox';
import { OUTBOX_STORAGE_KEY } from '../queue';
import { createSupabaseTransport, supabaseOutboxDb } from '../transport';
import type { Connectivity, NoteFields, OutboxOp } from '../types';
import { BACKOFF_BASE_MS, BACKOFF_MAX_MS, backoffMs } from '../worker';
import { fakeClock, fakeSupabase, idle, setup, testUuid } from './harness';

const fields = (body: string): NoteFields => ({
  body,
  mood: null,
  source: 'board',
  wants_reply: true,
  pinned: false,
  hidden_from_recap: false,
  exclude_from_ai: false,
  life_areas: [],
});
const createOp = (noteId: string, body = 'first draft'): OutboxOp => ({
  kind: 'note_create',
  noteId,
  fields: fields(body),
  created_at: '2026-10-01T12:00:00.000Z',
  edited_at: null,
});
const editOp = (noteId: string, body: string): OutboxOp => ({
  kind: 'note_update',
  noteId,
  patch: { body },
  edited_at: '2026-10-01T12:05:00.000Z',
});
const deleteOp = (noteId: string): OutboxOp => ({ kind: 'note_delete', noteId, deleted_at: '2026-10-01T12:10:00.000Z' });

describe('offline outbox', () => {
  it('queues a note written offline and syncs it when the connection returns', async () => {
    const { outbox, server, net, events, clock } = setup({ online: false });
    outbox.start();
    await idle(outbox);
    const noteId = testUuid();

    outbox.enqueue(createOp(noteId));
    await idle(outbox);

    expect(server.calls).toEqual([]);
    expect(outbox.items()).toHaveLength(1);
    expect(outbox.items()[0]?.createdOffline).toBe(true);
    // Offline, nothing polls: the connectivity listener restarts the run.
    expect(clock.pending()).toEqual([]);

    net.set(true);
    await idle(outbox);

    expect(server.tables.notes.get(noteId)).toMatchObject({ id: noteId, body: 'first draft' });
    expect(outbox.items()).toEqual([]);
    const synced = events.find((event) => event.type === 'synced');
    expect(synced?.kind).toBe('note_create');
    expect(synced?.createdOffline).toBe(true);
    // Events never carry the text.
    expect(JSON.stringify(events)).not.toContain('first draft');
  });

  it('a note written online syncs at once and is not marked offline', async () => {
    const { outbox, server, events } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    const noteId = testUuid();
    outbox.enqueue(createOp(noteId));
    await idle(outbox);
    expect(server.tables.notes.has(noteId)).toBe(true);
    expect(events.find((event) => event.type === 'synced')?.createdOffline).toBe(false);
  });

  it('retries a transient failure with backoff', async () => {
    const { outbox, server, clock } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    server.faults.push({ kind: 'fail', result: { error: { code: '' }, status: 503 } });
    const noteId = testUuid();

    outbox.enqueue(createOp(noteId));
    await idle(outbox);

    expect(server.tables.notes.size).toBe(0);
    expect(outbox.items()[0]?.attempts).toBe(1);
    expect(clock.pending()).toEqual([BACKOFF_BASE_MS]);

    clock.advance(BACKOFF_BASE_MS);
    await idle(outbox);

    expect(server.tables.notes.has(noteId)).toBe(true);
    expect(outbox.items()).toEqual([]);
  });

  it('a re-send with the same key after a lost response leaves one row', async () => {
    const { outbox, server, clock } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    // The server applies the insert but the phone never hears back.
    server.faults.push({ kind: 'lose_response' });
    const noteId = testUuid();

    outbox.enqueue(createOp(noteId));
    await idle(outbox);
    expect(server.tables.notes.size).toBe(1);
    expect(outbox.items()).toHaveLength(1);
    expect(clock.pending()).toEqual([BACKOFF_BASE_MS]);

    clock.advance(BACKOFF_MAX_MS);
    await idle(outbox);

    expect(server.tables.notes.size).toBe(1);
    expect(server.calls).toEqual(['insert:notes', 'insert:notes', 'update:notes']);
    expect(outbox.items()).toEqual([]);
  });

  it('a check-in re-sent after a lost response leaves one row', async () => {
    const { outbox, server, clock } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    server.faults.push({ kind: 'lose_response' });
    const checkinId = testUuid();

    outbox.enqueue({ kind: 'checkin_create', checkinId, mood: 3, energy: null, line: null, created_at: '2026-10-01T08:00:00.000Z' });
    await idle(outbox);
    clock.advance(BACKOFF_MAX_MS);
    await idle(outbox);

    expect(server.tables.checkins.size).toBe(1);
    expect(server.tables.checkins.get(checkinId)).toMatchObject({ mood: 3 });
    expect(outbox.items()).toEqual([]);
  });

  it('folds an offline edit into the queued create (last write wins)', async () => {
    const { outbox, server, net } = setup({ online: false });
    outbox.start();
    await idle(outbox);
    const noteId = testUuid();

    outbox.enqueue(createOp(noteId, 'first draft'));
    outbox.enqueue(editOp(noteId, 'second draft'));
    outbox.enqueue(editOp(noteId, 'third draft'));

    expect(outbox.items()).toHaveLength(1);
    net.set(true);
    await idle(outbox);

    expect(server.calls).toEqual(['insert:notes']);
    expect(server.tables.notes.get(noteId)).toMatchObject({ body: 'third draft', edited_at: '2026-10-01T12:05:00.000Z' });
  });

  it('an offline edit to a synced note is a separate queued update', async () => {
    const { outbox, server, net } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    const noteId = testUuid();
    outbox.enqueue(createOp(noteId));
    await idle(outbox);

    net.set(false);
    outbox.enqueue(editOp(noteId, 'edited on the plane'));
    outbox.enqueue(editOp(noteId, 'edited again'));
    expect(outbox.items().map((item) => item.op.kind)).toEqual(['note_update']);

    net.set(true);
    await idle(outbox);
    expect(server.calls).toEqual(['insert:notes', 'update:notes']);
    expect(server.tables.notes.get(noteId)).toMatchObject({ body: 'edited again' });
  });

  it('an edit made while the create is in flight is re-sent, not lost', async () => {
    const { outbox, server } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    const noteId = testUuid();

    outbox.enqueue(createOp(noteId, 'v1')); // the flush starts sending v1
    outbox.enqueue(editOp(noteId, 'v2')); // folded into the same item while it is in flight
    await idle(outbox);

    expect(server.tables.notes.get(noteId)).toMatchObject({ body: 'v2' });
    expect(outbox.items()).toEqual([]);
  });

  it('deleting a note that never left the device drops the queued write', async () => {
    const { outbox, server, net } = setup({ online: false });
    outbox.start();
    await idle(outbox);
    const noteId = testUuid();

    outbox.enqueue(createOp(noteId));
    outbox.enqueue(editOp(noteId, 'edit'));
    expect(outbox.enqueue(deleteOp(noteId))).toBeNull();
    expect(outbox.items()).toEqual([]);

    net.set(true);
    await idle(outbox);
    expect(server.calls).toEqual([]);
    expect(server.tables.notes.size).toBe(0);
  });

  it('deleting a synced note queues a soft delete', async () => {
    const { outbox, server, net } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    const noteId = testUuid();
    outbox.enqueue(createOp(noteId));
    await idle(outbox);

    net.set(false);
    outbox.enqueue(editOp(noteId, 'edit'));
    outbox.enqueue(deleteOp(noteId));
    expect(outbox.items().map((item) => item.op.kind)).toEqual(['note_delete']);

    net.set(true);
    await idle(outbox);
    expect(server.tables.notes.get(noteId)).toMatchObject({ deleted_at: '2026-10-01T12:10:00.000Z', body: 'first draft' });
  });

  it('a create that may have reached the server is deleted on the server, not just dropped', async () => {
    const { outbox, server, net } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    server.faults.push({ kind: 'lose_response' });
    const noteId = testUuid();
    outbox.enqueue(createOp(noteId));
    await idle(outbox);

    net.set(false);
    outbox.enqueue(deleteOp(noteId));
    expect(outbox.items().map((item) => item.op.kind)).toEqual(['note_delete']);
    net.set(true);
    await idle(outbox);
    expect(server.tables.notes.get(noteId)?.['deleted_at']).toBe('2026-10-01T12:10:00.000Z');
  });

  it('survives an app kill: a new outbox on the same file picks the queue up', async () => {
    const first = setup({ online: false });
    first.outbox.start();
    await idle(first.outbox);
    const noteId = testUuid();
    const checkinId = testUuid();
    first.outbox.enqueue(createOp(noteId));
    first.outbox.enqueue({ kind: 'checkin_create', checkinId, mood: 2, energy: 4, line: null, created_at: '2026-10-01T08:00:00.000Z' });
    expect(first.store.map.has(OUTBOX_STORAGE_KEY)).toBe(true);

    // Restart: same MMKV file, same server, back online.
    const second = setup({ online: true, store: first.store, server: first.server });
    expect(second.outbox.items().map((item) => item.op.kind)).toEqual(['note_create', 'checkin_create']);
    second.outbox.start();
    await idle(second.outbox);

    expect(first.server.tables.notes.has(noteId)).toBe(true);
    expect(first.server.tables.checkins.has(checkinId)).toBe(true);
    expect(second.outbox.items()).toEqual([]);
  });

  it('drops unreadable persisted items instead of crashing', () => {
    const first = setup({ online: false });
    first.store.map.set(OUTBOX_STORAGE_KEY, JSON.stringify([{ key: 'x', op: { kind: 'unknown' } }]));
    const second = setup({ online: false, store: first.store });
    expect(second.outbox.items()).toEqual([]);
  });

  it('drops a permanent failure (RLS denial) with a typed error, and the writes that depend on it', async () => {
    const { outbox, server, events, net } = setup({ online: false });
    outbox.start();
    await idle(outbox);
    const noteId = testUuid();
    const otherId = testUuid();
    outbox.enqueue(createOp(noteId));
    outbox.enqueue({ kind: 'checkin_create', checkinId: otherId, mood: 4, energy: null, line: null, created_at: '2026-10-01T08:00:00.000Z' });
    server.faults.push({ kind: 'fail', result: { error: { code: '42501' }, status: 403 } });

    net.set(true);
    await idle(outbox);

    const dropped = events.filter((event) => event.type === 'dropped');
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toMatchObject({ error: { kind: 'note_create', entityId: noteId, status: 403, code: '42501' } });
    // The error carries ids and codes only.
    expect(JSON.stringify(dropped[0]?.type === 'dropped' ? dropped[0].error : null)).not.toContain('first draft');
    expect(server.tables.notes.size).toBe(0);
    expect(server.tables.checkins.has(otherId)).toBe(true);
    expect(outbox.items()).toEqual([]);
  });

  it('treats 429 and an expired session as transient', async () => {
    const { outbox, server, clock } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    server.faults.push({ kind: 'fail', result: { error: { code: '' }, status: 429 } });
    server.faults.push({ kind: 'fail', result: { error: { code: 'PGRST303' }, status: 401 } });
    outbox.enqueue(createOp(testUuid()));
    await idle(outbox);
    clock.advance(BACKOFF_MAX_MS);
    await idle(outbox);
    expect(outbox.items()).toHaveLength(1);
    clock.advance(BACKOFF_MAX_MS);
    await idle(outbox);
    expect(outbox.items()).toEqual([]);
    expect(server.tables.notes.size).toBe(1);
  });

  it('sends writes to the same note in order, even when the first is in backoff', async () => {
    const { outbox, server, clock, net } = setup({ online: true });
    outbox.start();
    await idle(outbox);
    const noteId = testUuid();
    outbox.enqueue(createOp(noteId));
    await idle(outbox);

    net.set(false);
    outbox.enqueue(editOp(noteId, 'edit'));
    outbox.enqueue(deleteOp(testUuid())); // another note, unaffected
    server.faults.push({ kind: 'fail', result: { error: { code: '' }, status: 500 } });
    net.set(true);
    await idle(outbox);

    // The update failed and is in backoff; the other note's delete went ahead.
    expect(server.calls).toEqual(['insert:notes', 'update:notes', 'update:notes']);
    expect(outbox.items().map((item) => item.op.kind)).toEqual(['note_update']);
    expect(clock.pending()).toEqual([BACKOFF_BASE_MS]);
    clock.advance(BACKOFF_MAX_MS);
    await idle(outbox);
    expect(server.tables.notes.get(noteId)).toMatchObject({ body: 'edit' });
  });
});

describe('connectivity race', () => {
  it('a change event during the isOnline() read wins over the older value', async () => {
    const server = fakeSupabase();
    const clock = fakeClock();
    const reads: ((value: boolean) => void)[] = [];
    let listener: (online: boolean) => void = () => undefined;
    const connectivity: Connectivity = {
      isOnline: () => new Promise<boolean>((resolve) => reads.push(resolve)),
      subscribe(next) {
        listener = next;
        return () => undefined;
      },
    };
    const outbox = createOutbox({
      store: fakeCache(),
      transport: createSupabaseTransport(() => supabaseOutboxDb(server.client)),
      connectivity,
      newKey: testUuid,
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });
    outbox.start(); // the first run waits on isOnline()
    listener(true); // the connection comes back while that read is in flight
    reads[0]?.(false); // the read then answers with the older state
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The event's `true` stood, so a write now is not marked offline.
    expect(outbox.enqueue(createOp(testUuid()))?.createdOffline).toBe(false);
    for (const read of reads) read(true);
  });
});

describe('backoff', () => {
  it('doubles from 2 s, caps at 5 min, and jitters into the upper half', () => {
    expect(backoffMs(1, () => 1)).toBe(2_000);
    expect(backoffMs(2, () => 1)).toBe(4_000);
    expect(backoffMs(3, () => 0)).toBe(4_000);
    expect(backoffMs(30, () => 1)).toBe(BACKOFF_MAX_MS);
  });
});
