import { isIntroSeen, markIntroSeen, resetIntroSeen } from '../intro-seen';
import { CHECK_SERVER, GATE_ROUTE, HOME_ROUTE, INTRO_ROUTE, launchRoute } from '../launch';
import { splitLink } from '../link-text';
import { easingFromToken } from '../timing';

type RestoredFrom = 'new' | 'session' | 'keychain' | 'keystore' | 'block_store';
const ready = (restoredFrom: RestoredFrom) =>
  ({ status: 'ready', userId: 'u1', isAnonymous: true, restoredFrom }) as const;

describe('launchRoute (docs/21 §1.0–1.3)', () => {
  const fresh = { introSeen: false, consentsComplete: false, accountsConfigured: true, blocked: false };
  const done = { ...fresh, introSeen: true, consentsComplete: true };
  const afterBegin = { ...fresh, introSeen: true };

  // [case, input, expected]
  const cases: [string, Parameters<typeof launchRoute>[0], ReturnType<typeof launchRoute>][] = [
    ['blocked → the gate (its block screen), before anything else', { ...done, blocked: true, auth: { status: 'loading' } }, GATE_ROUTE],
    ['blocked, with the bootstrap saying so → the gate', { ...fresh, blocked: true, auth: { status: 'failed', reason: 'blocked' } }, GATE_ROUTE],
    ['no account system → Today', { ...fresh, accountsConfigured: false, auth: { status: 'loading' } }, HOME_ROUTE],
    ['not configured → Today', { ...fresh, auth: { status: 'not_configured' } }, HOME_ROUTE],
    ['both local flags set → Today at once, even while loading', { ...done, auth: { status: 'loading' } }, HOME_ROUTE],
    ['both local flags set, any session → Today', { ...done, auth: ready('session') }, HOME_ROUTE],
    ['loading, not onboarded → wait', { ...fresh, auth: { status: 'loading' } }, null],
    ['a new account → the intro', { ...fresh, auth: ready('new') }, INTRO_ROUTE],
    ['a new account after the intro was seen → the gate', { ...afterBegin, auth: ready('new') }, GATE_ROUTE],
    ['a cached session, intro never passed (killed before Begin) → the intro', { ...fresh, auth: ready('session') }, INTRO_ROUTE],
    ['a cached session, intro seen → ask the server', { ...afterBegin, auth: ready('session') }, CHECK_SERVER],
    ['a Keychain restore → ask the server', { ...fresh, auth: ready('keychain') }, CHECK_SERVER],
    ['a Keystore restore → ask the server', { ...fresh, auth: ready('keystore') }, CHECK_SERVER],
    ['a Block Store restore → ask the server', { ...fresh, auth: ready('block_store') }, CHECK_SERVER],
    [
      'a first launch offline (provably no token) → the intro',
      { ...fresh, auth: { status: 'failed', reason: 'offline', hasStoredToken: false } },
      INTRO_ROUTE,
    ],
    [
      'a stored token not refreshed yet (offline) → Today, flags left unset',
      { ...fresh, auth: { status: 'failed', reason: 'offline', hasStoredToken: true } },
      HOME_ROUTE,
    ],
    [
      'a stored token not refreshed yet (server) → Today',
      { ...fresh, auth: { status: 'failed', reason: 'server', hasStoredToken: true } },
      HOME_ROUTE,
    ],
    ['an unknown token state (the store threw) → Today', { ...fresh, auth: { status: 'failed', reason: 'server' } }, HOME_ROUTE],
  ];

  it.each(cases)('%s', (_name, input, expected) => {
    expect(launchRoute(input)).toBe(expected);
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
