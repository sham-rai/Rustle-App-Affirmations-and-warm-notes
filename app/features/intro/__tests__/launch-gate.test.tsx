import { act, renderRouter, screen } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';

import OnboardingLayout from '../../../app/(onboarding)/_layout';
import AgeScreen from '../../../app/(onboarding)/age';
import RustleScreen from '../../../app/(onboarding)/rustle';
import CompanySplash from '../../../app/(onboarding)/splash';
import TabLayout from '../../../app/(tabs)/_layout';
import NotesScreen from '../../../app/(tabs)/notes';
import TodayScreen from '../../../app/(tabs)/today';
import YouScreen from '../../../app/(tabs)/you';
import RootLayout from '../../../app/_layout';
import Index from '../../../app/index';
import type { AuthBootstrapState } from '../../../lib/auth';
import { deleteAnonymousAccount } from '../../../lib/supabase';
import {
  clearAgeBlockedForTests,
  isConsentsComplete,
  markAgeBlocked,
  markConsentsComplete,
  resetConsentsComplete,
} from '../../consent/block-flag';
import { isIntroSeen, markIntroSeen, resetIntroSeen } from '../intro-seen';

// The cold-start gate (docs/21 §1.0): with a Supabase project configured, "/" waits for the
// session with the native splash up, then sends a freshly created account to the company splash.
const EN_CA = [{ languageCode: 'en', languageTag: 'en-CA', regionCode: 'CA' }];
jest.mock('expo-localization', () => ({ getLocales: () => EN_CA, useLocales: () => EN_CA }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../../i18n/preferences');
jest.mock('../tree/Tree', () => ({ Tree: () => null }));
jest.mock('../FoldedNoteMark', () => ({ FoldedNoteMark: () => null }));
jest.mock('../../../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => null,
  deleteAnonymousAccount: jest.fn(() => Promise.resolve({ serverDeleted: false, signedOut: true, localCleared: true })),
}));

// A controllable session: tests move it from loading to ready.
let mockAuthState: AuthBootstrapState = { status: 'loading' };
const mockListeners = new Set<() => void>();
function setAuth(next: AuthBootstrapState) {
  mockAuthState = next;
  mockListeners.forEach((listener) => listener());
}
jest.mock('../../../lib/auth/AuthProvider', () => {
  const { useSyncExternalStore } = jest.requireActual<typeof import('react')>('react');
  const subscribe = (listener: () => void) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  };
  return {
    AuthProvider: ({ children }: { children: unknown }) => children,
    useAuth: () => useSyncExternalStore(subscribe, () => mockAuthState),
  };
});

// Whole-router renders: a loaded machine can take longer than Jest's 5 s default.
jest.setTimeout(30000);

const routes = {
  _layout: RootLayout,
  index: Index,
  '(onboarding)/_layout': OnboardingLayout,
  '(onboarding)/splash': CompanySplash,
  '(onboarding)/rustle': RustleScreen,
  '(onboarding)/age': AgeScreen,
  '(tabs)/_layout': TabLayout,
  '(tabs)/today': TodayScreen,
  '(tabs)/notes': NotesScreen,
  '(tabs)/you': YouScreen,
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(SplashScreen.hideAsync).mockClear();
  resetIntroSeen();
  resetConsentsComplete();
  clearAgeBlockedForTests();
  mockAuthState = { status: 'loading' };
});
afterEach(() => jest.useRealTimers());

describe('the launch gate', () => {
  it('keeps the native splash up while loading, then opens the company splash for a new account', async () => {
    const router = renderRouter(routes, { initialUrl: '/' });
    await act(async () => {});

    // Loading: the native splash stays, and behind it "/" is paper with the company name.
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    expect(router.getPathname()).toBe('/');
    expect(screen.getByText('DreamTeam Co.')).toBeOnTheScreen();

    await act(async () => {
      setAuth({ status: 'ready', userId: 'u1', isAnonymous: true, restoredFrom: 'new' });
    });

    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(router.getPathname()).toBe('/splash');
  });

  it('sends an onboarded install’s restored session straight to Today', async () => {
    markIntroSeen();
    markConsentsComplete();
    const router = renderRouter(routes, { initialUrl: '/' });
    await act(async () => {
      setAuth({ status: 'ready', userId: 'u1', isAnonymous: true, restoredFrom: 'session' });
    });
    expect(router.getPathname()).toBe('/today');
  });

  it('sends a session that stopped between Begin and the last consent back to the age gate', async () => {
    markIntroSeen();
    const router = renderRouter(routes, { initialUrl: '/' });
    await act(async () => {
      setAuth({ status: 'ready', userId: 'u1', isAnonymous: true, restoredFrom: 'session' });
    });
    expect(router.getPathname()).toBe('/age');
    expect(isConsentsComplete()).toBe(false);
  });

  it('sends a blocked install to the block screen before the session is known', async () => {
    markAgeBlocked();
    const router = renderRouter(routes, { initialUrl: '/' });
    await act(async () => {});
    expect(router.getPathname()).toBe('/age');
    expect(screen.getByText('Rustle is for adults')).toBeOnTheScreen();
    // The fallback delete for an account that already exists on this install.
    expect(deleteAnonymousAccount).toHaveBeenCalled();
  });

  it('sends a reinstall restored from the Keychain to Today and marks it onboarded', async () => {
    const router = renderRouter(routes, { initialUrl: '/' });
    await act(async () => {
      setAuth({ status: 'ready', userId: 'u1', isAnonymous: true, restoredFrom: 'keychain' });
    });
    expect(router.getPathname()).toBe('/today');
    expect(isIntroSeen()).toBe(true);
    expect(isConsentsComplete()).toBe(true);
  });

  it('hides the native splash after the cap even if the session never comes back', async () => {
    renderRouter(routes, { initialUrl: '/' });
    await act(async () => {});
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(screen.getByText('DreamTeam Co.')).toBeOnTheScreen();
  });
});
