import { isConsentsComplete, resetConsentsComplete } from '../onboarding-flags';
import { fetchOnboardingState, nextOnboardingRoute, onboardingRoute } from '../onboarding-state';
import type { ConsentClient } from '../records';
import { fake, fakeClient } from './fake-supabase';

const client = fakeClient as unknown as ConsentClient;

beforeEach(() => {
  fake.reset();
  resetConsentsComplete();
});

describe('onboardingRoute: where an unfinished onboarding resumes', () => {
  it.each([
    ['nothing done → the gate', false, [], '/age'],
    ['consents without age (cannot happen in order) → still the gate', false, ['terms'], '/age'],
    ['age confirmed only → terms', true, [], '/consent/terms'],
    ['terms given → AI processing', true, ['terms'], '/consent/ai'],
    ['terms and AI → special-category', true, ['terms', 'ai_processing'], '/consent/special-category'],
    ['a gap in the middle → the first missing one', true, ['terms', 'special_category'], '/consent/ai'],
    ['everything → Today', true, ['terms', 'ai_processing', 'special_category'], '/today'],
  ] as const)('%s', (_name, ageConfirmed, consentKinds, expected) => {
    expect(onboardingRoute({ ageConfirmed, consentKinds })).toBe(expected);
  });
});

describe('fetchOnboardingState', () => {
  it('reads age_confirmed_at and the non-withdrawn consent kinds', async () => {
    fake.seed(true, ['terms', 'ai_processing']);
    fake.consents.push({ kind: 'special_category', withdrawn_at: '2026-09-30T13:00:00.000Z' });
    await expect(fetchOnboardingState(client)).resolves.toEqual({
      ok: true,
      state: { ageConfirmed: true, consentKinds: ['terms', 'ai_processing'] },
    });
  });

  it('reports no session and failed reads without throwing', async () => {
    fake.session = false;
    await expect(fetchOnboardingState(client)).resolves.toEqual({ ok: false, reason: 'no_session' });
    fake.session = true;
    fake.failReads = true;
    await expect(fetchOnboardingState(client)).resolves.toEqual({ ok: false, reason: 'read_failed' });
  });

  it('has nothing to ask without a configured project', async () => {
    await expect(fetchOnboardingState(null)).resolves.toEqual({ ok: true, state: null });
  });
});

describe('nextOnboardingRoute', () => {
  it('follows the server, and caches "done" only when the server says so', async () => {
    fake.seed(true, ['terms', 'ai_processing']);
    await expect(nextOnboardingRoute(client, '/today')).resolves.toBe('/consent/special-category');
    expect(isConsentsComplete()).toBe(false);

    fake.seed(true, ['terms', 'ai_processing', 'special_category']);
    await expect(nextOnboardingRoute(client, '/consent/ai')).resolves.toBe('/today');
    expect(isConsentsComplete()).toBe(true);
  });

  it('falls back to the static next screen when the read fails', async () => {
    fake.failReads = true;
    await expect(nextOnboardingRoute(client, '/consent/ai')).resolves.toBe('/consent/ai');
  });
});
