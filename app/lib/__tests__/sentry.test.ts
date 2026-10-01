import type { ErrorEvent } from '@sentry/react-native';

import { MAX_STRING_LENGTH, scrubEvent } from '../sentry';

jest.mock('@sentry/react-native', () => ({ init: jest.fn() }));

describe('scrubEvent', () => {
  const note = 'x'.repeat(MAX_STRING_LENGTH + 1);

  it('removes bodies, user and breadcrumb data, and long strings', () => {
    const event = {
      type: undefined,
      message: note,
      user: { email: 'a@b.c', id: 'u' },
      request: { url: 'https://x.test/notes', data: { body: note }, cookies: { a: 'b' }, headers: { a: 'b' } },
      extra: { note, short: 'ok', tenChars: 'my day sux' },
      breadcrumbs: [{ category: 'fetch', message: note, data: { body: note }, level: 'info', timestamp: 1 }],
    } as unknown as ErrorEvent;
    const out = scrubEvent(event);
    const json = JSON.stringify(out);
    expect(json).not.toContain(note);
    expect(out.user).toBeUndefined();
    expect(out.request?.data).toBeUndefined();
    expect(out.breadcrumbs?.[0]).toEqual({ category: 'fetch', level: 'info', timestamp: 1, type: undefined });
    expect(out.extra).toBeUndefined();
    expect(json).not.toContain('my day sux');
  });
});
