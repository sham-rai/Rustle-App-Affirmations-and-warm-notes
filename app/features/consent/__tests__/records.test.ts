import { CONSENT_COPY_LOCALE, CONSENT_VERSIONS, confirmAge, recordConsent, type ConsentClient } from '../records';
import { fake, fakeClient, USER_ID } from './fake-supabase';

const client = fakeClient as unknown as ConsentClient;

beforeEach(() => fake.reset());

describe('recordConsent (docs/21 §1.3)', () => {
  it('writes one consents row with the kind, version and locale, and nothing else', async () => {
    await expect(recordConsent(client, 'ai_processing', 'en')).resolves.toEqual({ ok: true, skipped: false });
    expect(fake.writes).toEqual([
      { table: 'consents', op: 'insert', row: { kind: 'ai_processing', version: CONSENT_VERSIONS.ai_processing, locale: 'en' } },
    ]);
  });

  it('inserts nothing when the server already holds that consent (idempotent)', async () => {
    fake.seed(true, ['terms']);
    await expect(recordConsent(client, 'terms', 'en')).resolves.toEqual({ ok: true, skipped: true });
    expect(fake.writes).toEqual([]);
  });

  it('records French consents with the Canadian French copy locale', async () => {
    await recordConsent(client, 'special_category', 'fr');
    expect(fake.writes[0]?.row).toEqual({ kind: 'special_category', version: '2026-10-01', locale: 'fr-CA' });
    expect(CONSENT_COPY_LOCALE.fr).toBe('fr-CA');
  });

  it('reports a failed write without throwing', async () => {
    fake.failWrites = true;
    await expect(recordConsent(client, 'terms', 'en')).resolves.toEqual({ ok: false, reason: 'write_failed' });
  });

  it('writes nothing without a session', async () => {
    fake.session = false;
    await expect(recordConsent(client, 'terms', 'en')).resolves.toEqual({ ok: false, reason: 'no_session' });
    expect(fake.writes).toEqual([]);
  });

  it('skips when no Supabase project is configured', async () => {
    await expect(recordConsent(null, 'terms', 'en')).resolves.toEqual({ ok: true, skipped: true });
  });
});

describe('confirmAge (D46)', () => {
  it('stores only age_confirmed_at, on the user’s own row', async () => {
    const now = new Date('2026-10-01T15:00:00.000Z');
    await expect(confirmAge(client, now)).resolves.toEqual({ ok: true, skipped: false });
    expect(fake.writes).toEqual([
      { table: 'users', op: 'update', row: { age_confirmed_at: '2026-10-01T15:00:00.000Z' }, filter: ['id', USER_ID] },
    ]);
  });

  it('reports a failed write', async () => {
    fake.failWrites = true;
    await expect(confirmAge(client, new Date())).resolves.toEqual({ ok: false, reason: 'write_failed' });
  });
});
