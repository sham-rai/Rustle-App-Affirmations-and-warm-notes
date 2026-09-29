import { resolveBackupStatus, shortAccountId } from '../backup-status';

const ready = { status: 'ready', userId: '5f3a9c12-0000-4000-8000-000000000000', isAnonymous: true, restoredFrom: 'new' } as const;

describe('backup status', () => {
  it('shows the short account id so a reinstall can be checked by eye', () => {
    expect(shortAccountId(ready.userId)).toBe('5f3a9c12');
  });

  it('is not connected when no Supabase project is configured', () => {
    expect(resolveBackupStatus({ status: 'not_configured' }, null)).toEqual({ kind: 'not_connected' });
  });

  it('is loading while the bootstrap runs, and says so when it failed', () => {
    expect(resolveBackupStatus({ status: 'loading' }, null)).toEqual({ kind: 'loading' });
    expect(resolveBackupStatus({ status: 'failed', reason: 'offline' }, null)).toEqual({ kind: 'unavailable' });
  });

  it('warns an anonymous user that the notes are not backed up', () => {
    expect(resolveBackupStatus(ready, { is_anonymous: true, identities: [{ provider: 'anonymous' }] })).toEqual({
      kind: 'anonymous', shortId: '5f3a9c12',
    });
  });

  it('names the linked provider once an identity is attached', () => {
    expect(resolveBackupStatus(ready, { is_anonymous: false, identities: [{ provider: 'apple' }] })).toEqual({
      kind: 'linked', shortId: '5f3a9c12', provider: 'apple',
    });
  });
});
