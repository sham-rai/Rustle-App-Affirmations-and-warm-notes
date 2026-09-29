import { renderRouter, screen } from 'expo-router/testing-library';
import { Slot } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from '../components/ThemeProvider';
import '../i18n';
import TabLayout from '../app/(tabs)/_layout';
import NotesScreen from '../app/(tabs)/notes';
import TodayScreen from '../app/(tabs)/today';
import YouScreen from '../app/(tabs)/you';

// A French device at the largest accessibility text size (font scale 3).
const FR_CA = [{ languageCode: 'fr', languageTag: 'fr-CA', regionCode: 'CA' }];
jest.mock('expo-localization', () => ({
  getLocales: () => FR_CA,
  useLocales: () => FR_CA,
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 3 }),
}));
jest.mock('../i18n/preferences');

function Root() {
  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}

describe('Tab bar at font scale 3, in French', () => {
  it('wraps labels over two lines instead of truncating, and sizes the bar for them', () => {
    renderRouter(
      {
        _layout: Root,
        '(tabs)/_layout': TabLayout,
        '(tabs)/today': TodayScreen,
        '(tabs)/notes': NotesScreen,
        '(tabs)/you': YouScreen,
      },
      { initialUrl: '/today' },
    );

    // "Aujourd’hui" is the screen title and the tab label; the label is the one with a line limit.
    const labels = screen.getAllByText('Aujourd’hui').filter((node) => node.props.numberOfLines !== undefined);
    expect(labels).toHaveLength(1);
    expect(labels[0]?.props.numberOfLines).toBe(2);
    expect(labels[0]?.props.allowFontScaling).toBe(true);
    for (const label of ['Notes', 'Toi']) {
      expect(screen.getByText(label).props.numberOfLines).toBe(2);
    }

    // Two 20 pt label lines at 3x plus padding: 2 × 20 × 3 + 2 × 12 = 144 (no bottom inset in tests).
    const bars = screen.UNSAFE_root.findAll(
      (node) => typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.height === 144,
    );
    expect(bars.length).toBeGreaterThan(0);
  });
});
