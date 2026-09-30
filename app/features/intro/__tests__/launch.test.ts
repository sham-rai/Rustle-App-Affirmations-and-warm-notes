import { isIntroSeen, markIntroSeen, resetIntroSeen } from '../intro-seen';
import { HOME_ROUTE, INTRO_ROUTE, launchRoute, shouldMarkSeenOnLaunch } from '../launch';
import { splitLink } from '../link-text';
import { easingFromToken } from '../timing';

const ready = (restoredFrom: 'new' | 'session' | 'keychain') =>
  ({ status: 'ready', userId: 'u1', isAnonymous: true, restoredFrom }) as const;

describe('launchRoute (docs/21 §1.0)', () => {
  const base = { introSeen: false, accountsConfigured: true };

  it('shows the intro for a freshly created anonymous account', () => {
    expect(launchRoute({ ...base, auth: ready('new') })).toBe(INTRO_ROUTE);
  });

  it('goes straight to Today for a restored session', () => {
    expect(launchRoute({ ...base, auth: ready('session') })).toBe(HOME_ROUTE);
    expect(launchRoute({ ...base, auth: ready('keychain') })).toBe(HOME_ROUTE);
  });

  it('waits (native splash stays up) while the session is loading', () => {
    expect(launchRoute({ ...base, auth: { status: 'loading' } })).toBeNull();
  });

  it('never replays once seen', () => {
    expect(launchRoute({ ...base, introSeen: true, auth: ready('new') })).toBe(HOME_ROUTE);
    expect(launchRoute({ ...base, introSeen: true, auth: { status: 'loading' } })).toBe(HOME_ROUTE);
  });

  it('shows the intro on a first launch offline, and skips it with no account system', () => {
    expect(launchRoute({ ...base, auth: { status: 'failed', reason: 'offline', hasStoredToken: false } })).toBe(
      INTRO_ROUTE,
    );
    expect(launchRoute({ ...base, accountsConfigured: false, auth: { status: 'loading' } })).toBe(HOME_ROUTE);
    expect(launchRoute({ ...base, auth: { status: 'not_configured' } })).toBe(HOME_ROUTE);
  });

  it('never replays the intro for a reinstall whose stored token could not be refreshed yet', () => {
    expect(launchRoute({ ...base, auth: { status: 'failed', reason: 'offline', hasStoredToken: true } })).toBe(
      HOME_ROUTE,
    );
    expect(launchRoute({ ...base, auth: { status: 'failed', reason: 'server', hasStoredToken: true } })).toBe(
      HOME_ROUTE,
    );
  });

  it('counts a restored session as seen', () => {
    expect(shouldMarkSeenOnLaunch(ready('session'))).toBe(true);
    expect(shouldMarkSeenOnLaunch(ready('new'))).toBe(false);
    expect(shouldMarkSeenOnLaunch({ status: 'loading' })).toBe(false);
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
