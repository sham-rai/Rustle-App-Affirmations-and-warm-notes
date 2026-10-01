import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../../../app/_layout';
import OnboardingLayout from '../../../app/(onboarding)/_layout';
import RustleScreen from '../../../app/(onboarding)/rustle';
import CompanySplash from '../../../app/(onboarding)/splash';
import TabLayout from '../../../app/(tabs)/_layout';
import NotesScreen from '../../../app/(tabs)/notes';
import TodayScreen from '../../../app/(tabs)/today';
import YouScreen from '../../../app/(tabs)/you';
import Index from '../../../app/index';
import { isIntroSeen, resetIntroSeen } from '../intro-seen';
import { CONTENT_DELAY_MS, CONTENT_FADE_MS, SPLASH_MS } from '../timing';

// docs/20 §6 pins the sequence: 2 s splash, 1 s hold, 400 ms fade-up. Literals here, so a changed
// constant fails this file instead of silently moving the test with it.
const SPLASH = 2000;
const HOLD = 1000;
const FADE = 400;

// An English device; fonts load at once. Skia needs its native module, so the tree and the mark
// are stood in for by plain views here (their maths is tested in tree-maths.test.ts).
const EN_CA = [{ languageCode: 'en', languageTag: 'en-CA', regionCode: 'CA' }];
jest.mock('expo-localization', () => ({ getLocales: () => EN_CA, useLocales: () => EN_CA }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../../i18n/preferences');
jest.mock('../tree/Tree', () => ({ Tree: () => mockStandIn('intro-tree') }));
jest.mock('../FoldedNoteMark', () => ({ FoldedNoteMark: () => mockStandIn('intro-mark') }));

function mockStandIn(testID: string) {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View: StandIn } = jest.requireActual<typeof import('react-native')>('react-native');
  return createElement(StandIn, { testID });
}

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

/** Renders at `url` and lets the first async effects (reduce-motion, session) settle. */
async function renderAt(url: string) {
  const router = renderRouter(routes, { initialUrl: url });
  await act(async () => {});
  return router;
}

const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(() => {
  jest.useFakeTimers();
  resetIntroSeen();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('the timing constants (docs/20 §6)', () => {
  it('are 2 s, 1 s and 400 ms', () => {
    expect(SPLASH_MS).toBe(SPLASH);
    expect(CONTENT_DELAY_MS).toBe(HOLD);
    expect(CONTENT_FADE_MS).toBe(FADE);
  });
});

describe('the company splash (docs/21 §1.0)', () => {
  it('shows the placeholder company name, then after 2 s opens the Rustle screen', async () => {
    const router = await renderAt('/splash');
    expect(screen.getByText('DreamTeam Co.')).toBeOnTheScreen();

    advance(SPLASH - 1);
    expect(router.getPathname()).toBe('/splash');

    advance(1);
    expect(router.getPathname()).toBe('/rustle');
  });
});

describe('the Rustle screen (docs/21 §1.1)', () => {
  it('shows the tree, mark and wordmark at once, and the rest after one second', async () => {
    await renderAt('/rustle');

    expect(screen.getByTestId('intro-tree')).toBeOnTheScreen();
    expect(screen.getByTestId('intro-mark')).toBeOnTheScreen();
    expect(screen.getByText('rustle')).toBeOnTheScreen();
    // Before the fade-up the rest of the screen is neither reachable nor announced.
    const headline = 'Notes that know what you’re going through.';
    expect(screen.queryByText(headline)).toBeNull();
    expect(screen.getByText(headline, { includeHiddenElements: true })).toBeOnTheScreen();

    // Still hidden right up to the end of the hold.
    advance(HOLD - 1);
    expect(screen.queryByText(headline)).toBeNull();

    advance(1 + FADE);

    expect(screen.getByText(headline)).toBeOnTheScreen();
    expect(
      screen.getByText('Tell me a little. I’ll remember, and leave you something kind when you need it.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Begin' })).toBeOnTheScreen();
    expect(screen.getByText('Not a medical service.')).toBeOnTheScreen();
    // No dead controls: the account link and the crisis link arrive with their screens.
    expect(screen.queryByText('I already have an account')).toBeNull();
    expect(screen.queryByText(/get help now/)).toBeNull();
    expect(screen.getByText('Rustle is AI, not a therapist or a crisis service.')).toBeOnTheScreen();
  });

  it('Begin marks the intro seen and, until the age gate exists, opens Today', async () => {
    const router = await renderAt('/rustle');
    advance(HOLD + FADE);

    fireEvent.press(screen.getByRole('button', { name: 'Begin' }));

    expect(isIntroSeen()).toBe(true);
    expect(router.getPathname()).toBe('/today');
  });
});
