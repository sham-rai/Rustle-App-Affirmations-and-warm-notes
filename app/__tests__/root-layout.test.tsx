import { renderRouter, screen } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';

import RootLayout from '../app/_layout';
import Index from '../app/index';
import TabLayout from '../app/(tabs)/_layout';
import NotesScreen from '../app/(tabs)/notes';
import TodayScreen from '../app/(tabs)/today';
import YouScreen from '../app/(tabs)/you';

// A French (Quebec) device; fonts load at once.
const FR_CA = [{ languageCode: 'fr', languageTag: 'fr-CA', regionCode: 'CA' }];
jest.mock('expo-localization', () => ({
  getLocales: () => FR_CA,
  useLocales: () => FR_CA,
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../i18n/preferences');

const routes = {
  _layout: RootLayout,
  index: Index,
  '(tabs)/_layout': TabLayout,
  '(tabs)/today': TodayScreen,
  '(tabs)/notes': NotesScreen,
  '(tabs)/you': YouScreen,
};

describe('RootLayout and the tabs, on a French device', () => {
  it('opens on Today and shows the three tabs with French labels', () => {
    const router = renderRouter(routes, { initialUrl: '/' });

    expect(router.getPathname()).toBe('/today');
    // "Aujourd’hui" is both the tab label and the screen title.
    expect(screen.getAllByText('Aujourd’hui')).toHaveLength(2);
    expect(screen.getByText('Notes')).toBeOnTheScreen();
    expect(screen.getByText('Toi')).toBeOnTheScreen();
    expect(screen.getByText('Quand Rustle te laissera une note, tu la trouveras ici.')).toBeOnTheScreen();
    // Exactly three tabs: the "/" redirect lives in the root Stack, not in the tab bar.
    expect(screen.queryByText('index')).toBeNull();
  });

  it('hides the splash once the fonts are loaded', () => {
    renderRouter(routes, { initialUrl: '/' });
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('shows the Notes board empty state from docs/05 §5', () => {
    renderRouter(routes, { initialUrl: '/notes' });
    expect(
      screen.getByText(
        'C’est ton espace. Mets-y n’importe quoi : une peur, une victoire, une pensée en passant. Je m’en souviendrai.',
      ),
    ).toBeOnTheScreen();
  });
});
