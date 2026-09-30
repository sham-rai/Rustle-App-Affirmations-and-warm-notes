import { act, renderRouter, screen } from 'expo-router/testing-library';

import OnboardingLayout from '../../../app/(onboarding)/_layout';
import RustleScreen from '../../../app/(onboarding)/rustle';
import RootLayout from '../../../app/_layout';
import NotesScreen from '../../../app/(tabs)/notes';
import TabLayout from '../../../app/(tabs)/_layout';
import TodayScreen from '../../../app/(tabs)/today';
import YouScreen from '../../../app/(tabs)/you';
import Index from '../../../app/index';
import { setAddress } from '../../../i18n/preferences';
import { CONTENT_DELAY_MS, CONTENT_FADE_MS } from '../timing';

// A French (Quebec) device: French from the device locale, "tu" by default, "vous" when chosen.
const FR_CA = [{ languageCode: 'fr', languageTag: 'fr-CA', regionCode: 'CA' }];
jest.mock('expo-localization', () => ({ getLocales: () => FR_CA, useLocales: () => FR_CA }));
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
  '(onboarding)/rustle': RustleScreen,
  '(tabs)/_layout': TabLayout,
  '(tabs)/today': TodayScreen,
  '(tabs)/notes': NotesScreen,
  '(tabs)/you': YouScreen,
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  setAddress('tu');
});

async function showContent() {
  renderRouter(routes, { initialUrl: '/rustle' });
  await act(async () => {});
  act(() => {
    jest.advanceTimersByTime(CONTENT_DELAY_MS + CONTENT_FADE_MS);
  });
}

describe('the Rustle screen in French', () => {
  it('uses "tu" by default', async () => {
    await showContent();
    expect(screen.getByText('Des notes qui savent ce que tu traverses.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'J’ai déjà un compte' })).toBeOnTheScreen();
    expect(screen.getByText('trouve de l’aide maintenant')).toBeOnTheScreen();
    expect(screen.getByText('Rustle est une IA, et non un thérapeute ni un service de crise.')).toBeOnTheScreen();
  });

  it('never "tu"-es a "vous" user', async () => {
    setAddress('vous');
    await showContent();
    expect(screen.getByText('Des notes qui savent ce que vous traversez.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Racontez-moi un peu. Je m’en souviendrai, et je vous laisserai un mot réconfortant quand vous en aurez besoin.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('trouvez de l’aide maintenant')).toBeOnTheScreen();
  });
});
