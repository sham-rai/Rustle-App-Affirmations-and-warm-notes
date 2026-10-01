import { attachOutboxTriggers, type AppStateEvents, type AuthEvents } from '../triggers';
import type { OutboxOp } from '../types';
import { idle, setup, testUuid } from './harness';

function fakeAuth() {
  const listeners = new Set<(event: string, session: object | null) => void>();
  const auth: AuthEvents = {
    onAuthStateChange(callback) {
      listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
  };
  return { auth, listeners, emit: (event: string, session: object | null) => listeners.forEach((l) => l(event, session)) };
}

function fakeAppState() {
  const listeners = new Set<(state: string) => void>();
  const appState: AppStateEvents = {
    addEventListener(_type, listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  return { appState, listeners, emit: (state: string) => listeners.forEach((l) => l(state)) };
}

const createOp = (noteId: string): OutboxOp => ({
  kind: 'note_create',
  noteId,
  fields: {
    body: 'written before the session',
    mood: null,
    source: 'onboarding',
    wants_reply: true,
    pinned: false,
    hidden_from_recap: false,
    exclude_from_ai: false,
    life_areas: [],
  },
  created_at: '2026-10-01T12:00:00.000Z',
  edited_at: null,
});

describe('outbox triggers', () => {
  it('a write queued before the session exists goes out as soon as the session arrives, not after the backoff', async () => {
    const { outbox, server, clock } = setup({ online: true });
    server.setSignedIn(false);
    const auth = fakeAuth();
    outbox.start();
    attachOutboxTriggers(outbox, { auth: auth.auth });
    await idle(outbox);
    const noteId = testUuid();

    outbox.enqueue(createOp(noteId));
    await idle(outbox);
    expect(server.tables.notes.size).toBe(0);
    // Never sent: no attempt counted, no backoff.
    expect(server.calls).toEqual([]);
    expect(outbox.items()[0]?.attempts).toBe(0);
    expect(clock.pending()).toEqual([]);

    // An event without a session, or an unrelated one, sends nothing.
    auth.emit('INITIAL_SESSION', null);
    auth.emit('USER_UPDATED', { access_token: 'jwt' });
    await idle(outbox);
    expect(server.tables.notes.size).toBe(0);

    server.setSignedIn(true);
    auth.emit('SIGNED_IN', { access_token: 'jwt' });
    await idle(outbox); // no clock advance: within the same tick, not after the backoff

    expect(server.tables.notes.has(noteId)).toBe(true);
    expect(outbox.items()).toEqual([]);
  });

  it('TOKEN_REFRESHED and returning to the foreground end the backoff', async () => {
    const { outbox, server } = setup({ online: true });
    const auth = fakeAuth();
    const app = fakeAppState();
    outbox.start();
    attachOutboxTriggers(outbox, { auth: auth.auth, appState: app.appState });
    await idle(outbox);

    server.faults.push({ kind: 'fail', result: { error: { code: 'PGRST303' }, status: 401 } });
    outbox.enqueue(createOp(testUuid()));
    await idle(outbox);
    expect(outbox.items()).toHaveLength(1);
    auth.emit('TOKEN_REFRESHED', { access_token: 'jwt2' });
    await idle(outbox);
    expect(outbox.items()).toEqual([]);

    server.faults.push({ kind: 'fail', result: { error: { code: '' }, status: 503 } });
    outbox.enqueue(createOp(testUuid()));
    await idle(outbox);
    app.emit('background');
    await idle(outbox);
    expect(outbox.items()).toHaveLength(1);
    app.emit('active');
    await idle(outbox);
    expect(outbox.items()).toEqual([]);
    expect(server.tables.notes.size).toBe(2);
  });

  it('stop removes both subscriptions', () => {
    const { outbox } = setup({ online: true });
    const auth = fakeAuth();
    const app = fakeAppState();
    const stop = attachOutboxTriggers(outbox, { auth: auth.auth, appState: app.appState });
    expect(auth.listeners.size).toBe(1);
    expect(app.listeners.size).toBe(1);
    stop();
    expect(auth.listeners.size).toBe(0);
    expect(app.listeners.size).toBe(0);
  });

  it('a write made and deleted before the session exists never reaches the server', async () => {
    const { outbox, server } = setup({ online: true });
    server.setSignedIn(false);
    const auth = fakeAuth();
    outbox.start();
    attachOutboxTriggers(outbox, { auth: auth.auth });
    const noteId = testUuid();
    outbox.enqueue(createOp(noteId));
    await idle(outbox);
    expect(outbox.enqueue({ kind: 'note_delete', noteId, deleted_at: '2026-10-01T12:10:00.000Z' })).toBeNull();
    expect(outbox.items()).toEqual([]);

    server.setSignedIn(true);
    auth.emit('SIGNED_IN', { access_token: 'jwt' });
    await idle(outbox);
    expect(server.calls).toEqual([]);
  });

  it('a stale offline reading does not block a foreground retry', async () => {
    const { outbox, server, net } = setup({ online: false });
    const app = fakeAppState();
    outbox.start();
    attachOutboxTriggers(outbox, { appState: app.appState });
    outbox.enqueue(createOp(testUuid()));
    await idle(outbox);
    expect(server.calls).toEqual([]);

    net.setSilently(true); // back online, but no change event arrived
    app.emit('active');
    await idle(outbox);
    expect(outbox.items()).toEqual([]);
    expect(server.tables.notes.size).toBe(1);
  });
});
