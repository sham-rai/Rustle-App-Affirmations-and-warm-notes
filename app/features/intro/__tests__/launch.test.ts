import { isIntroSeen, markIntroSeen, resetIntroSeen } from '../intro-seen';
import { GATE_ROUTE, HOME_ROUTE, INTRO_ROUTE, launchRoute, shouldMarkOnboardedOnLaunch } from '../launch';
import { splitLink } from '../link-text';
import { easingFromToken } from '../timing';

type RestoredFrom = 'new' | 'session' | 'keychain' | 'keystore' | 'block_store';
const ready = (restoredFrom: RestoredFrom) =>
  ({ status: 'ready', userId: 'u1', isAnonymous: true, restoredFrom }) as const;

describe('launchRoute (docs/21 §1.0–1.3)', () => {
  const fresh = { introSeen: false, consentsComplete: false, accountsConfigured: true };
  const done = { introSeen: true, consentsComplete: true, accountsConfigured: true };
  const killedAfterBegin = { introSeen: true, consentsComplete: false, accountsConfigured: true };

  // [case, input, expected route]
  const cases: [string, Parameters<typeof launchRoute>[0], ReturnType<typeof launchRoute>][] = [
    ['a new account on a fresh install → the intro', { ...fresh, auth: ready('new') }, INTRO_ROUTE],
    ['a new account after the intro was seen → the gate', { ...killedAfterBegin, auth: ready('new') }, GATE_ROUTE],
    ['a cached session, killed before Begin → the intro', { ...fresh, auth: ready('session') }, INTRO_ROUTE],
    ['a cached session, killed before the last consent → the gate', { ...killedAfterBegin, auth: ready('session') }, GATE_ROUTE],
    ['a cached session, onboarded → Today', { ...done, auth: ready('session') }, HOME_ROUTE],
    ['a Keychain restore (reinstall) → Today', { ...fresh, auth: ready('keychain') }, HOME_ROUTE],
    ['a Keystore restore (reinstall) → Today', { ...fresh, auth: ready('keystore') }, HOME_ROUTE],
    ['a Block Store restore (reinstall) → Today', { ...fresh, auth: ready('block_store') }, HOME_ROUTE],
    ['loading, not yet onboarded → wait', { ...fresh, auth: { status: 'loading' } }, null],
    ['loading, intro seen but consents not complete → wait', { ...killedAfterBegin, auth: { status: 'loading' } }, null],
    ['loading, onboarded → Today at once', { ...done, auth: { status: 'loading' } }, HOME_ROUTE],
    ['onboarded, even with a new account → Today', { ...done, auth: ready('new') }, HOME_ROUTE],
    [
      'a first launch offline (provably no token) → the intro',
      { ...fresh, auth: { status: 'failed', reason: 'offline', hasStoredToken: false } },
      INTRO_ROUTE,
    ],
    [
      'offline with no token after the intro → the gate',
      { ...killedAfterBegin, auth: { status: 'failed', reason: 'offline', hasStoredToken: false } },
      GATE_ROUTE,
    ],
    [
      'a reinstall whose stored token could not be refreshed yet (offline) → Today',
      { ...fresh, auth: { status: 'failed', reason: 'offline', hasStoredToken: true } },
      HOME_ROUTE,
    ],
    [
      'a reinstall whose stored token could not be refreshed yet (server) → Today',
      { ...fresh, auth: { status: 'failed', reason: 'server', hasStoredToken: true } },
      HOME_ROUTE,
    ],
    ['an unknown token state (the store threw) → Today', { ...fresh, auth: { status: 'failed', reason: 'server' } }, HOME_ROUTE],
    ['no account system, loading → Today', { ...fresh, accountsConfigured: false, auth: { status: 'loading' } }, HOME_ROUTE],
    ['not configured → Today', { ...fresh, auth: { status: 'not_configured' } }, HOME_ROUTE],
  ];

  it.each(cases)('%s', (_name, input, expected) => {
    expect(launchRoute(input)).toBe(expected);
  });
});

describe('shouldMarkOnboardedOnLaunch', () => {
  it('marks an existing account whose local flags may be lost', () => {
    expect(shouldMarkOnboardedOnLaunch(ready('keychain'))).toBe(true);
    expect(shouldMarkOnboardedOnLaunch(ready('keystore'))).toBe(true);
    expect(shouldMarkOnboardedOnLaunch(ready('block_store'))).toBe(true);
    expect(shouldMarkOnboardedOnLaunch({ status: 'failed', reason: 'offline', hasStoredToken: true })).toBe(true);
    expect(shouldMarkOnboardedOnLaunch({ status: 'failed', reason: 'server' })).toBe(true);
    expect(shouldMarkOnboardedOnLaunch({ status: 'not_configured' })).toBe(true);
  });

  it('leaves the flags of this install’s own session, a new account and a first launch alone', () => {
    expect(shouldMarkOnboardedOnLaunch(ready('session'))).toBe(false);
    expect(shouldMarkOnboardedOnLaunch(ready('new'))).toBe(false);
    expect(shouldMarkOnboardedOnLaunch({ status: 'loading' })).toBe(false);
    expect(shouldMarkOnboardedOnLaunch({ status: 'failed', reason: 'offline', hasStoredToken: false })).toBe(false);
  });
});

describe('the intro-seen flag', () => {
  it('is kept, and reset on sign-out', () => {
    resetIntroSeen();
    expect(isIntroSeen()).toBe(false);
    markIntroSeen();
    expect(isIntroSeen()).toBe(true);
    resetIntroSeen();
    expect(isIntroSeen()).toBe(false);
  });
});

describe('splitLink', () => {
  it('splits a sentence around its link, wherever the link sits', () => {
    expect(splitLink('If you’re in crisis, <link>get help now</link>.')).toEqual({
      before: 'If you’re in crisis, ',
      link: 'get help now',
      after: '.',
    });
    expect(splitLink('<link>Help</link> is here')).toEqual({ before: '', link: 'Help', after: ' is here' });
    expect(splitLink('No link')).toEqual({ before: 'No link', link: '', after: '' });
  });
});

describe('easingFromToken', () => {
  it('follows the motion token curve', () => {
    const ease = easingFromToken('cubic-bezier(0.2, 0, 0, 1)');
    expect(ease(0)).toBeCloseTo(0, 5);
    expect(ease(1)).toBeCloseTo(1, 5);
    expect(ease(0.5)).toBeGreaterThan(0.5); // ease-out: fast start, soft landing
  });
});
