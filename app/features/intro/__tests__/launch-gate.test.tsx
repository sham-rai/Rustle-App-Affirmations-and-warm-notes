import { act, renderRouter, screen } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';

import OnboardingLayout from '../../../app/(onboarding)/_layout';
import RustleScreen from '../../../app/(onboarding)/rustle';
import CompanySplash from '../../../app/(onboarding)/splash';
import TabLayout from '../../../app/(tabs)/_layout';
import NotesScreen from '../../../app/(tabs)/notes';
import TodayScreen from '../../../app/(tabs)/today';
import YouScreen from '../../../app/(tabs)/you';
import RootLayout from '../../../app/_layout';
import Index from '../../../app/index';
import type { AuthBootstrapState } from '../../../lib/auth';
import { resetIntroSeen } from '../intro-seen';

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
jest.mock('../../../lib/supabase', () => ({ isSupabaseConfigured: () => true, getSupabase: () => null }));

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

const routes = {
  _layout: RootLayout,
  index: Index,
  '(onboarding)/_layout': OnboardingLayout,
  '(onboarding)/splash': CompanySplash,
  '(onboarding)/rustle': RustleScreen,
  '(tabs)/_layout': TabLayout,
  '(tabs)/today': TodayScreen,
  '(tabs)/notes': NotesScreen,
  '(tabs)/you': YouScreen,
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(SplashScreen.hideAsync).mockClear();
  resetIntroSeen();
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

  it('sends a restored session straight to Today', async () => {
    const router = renderRouter(routes, { initialUrl: '/' });
    await act(async () => {
      setAuth({ status: 'ready', userId: 'u1', isAnonymous: true, restoredFrom: 'session' });
    });
    expect(router.getPathname()).toBe('/today');
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
