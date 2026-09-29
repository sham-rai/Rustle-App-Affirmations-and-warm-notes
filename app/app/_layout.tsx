import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavigationThemeProvider, type Theme as NavigationTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { fontFamily, fontSources } from '../components/Text';
import { ThemeProvider } from '../components/ThemeProvider';
import { useTheme } from '../hooks/useTheme';
import { i18n, useDeviceLanguage } from '../i18n';

// Keep the splash up until the fonts are ready (M1-04). Onboarding and auth come later.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontSources);
  const ready = fontsLoaded || fontError != null;
  useDeviceLanguage();

  useEffect(() => {
    // On a font error, show the app in the system font rather than a stuck splash.
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <TokenNavigationTheme>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </TokenNavigationTheme>
      </ThemeProvider>
    </I18nextProvider>
  );
}

/** Gives the navigator the token colours, so no default white flashes behind a screen. */
function TokenNavigationTheme({ children }: { children: ReactNode }) {
  const { scheme, colors } = useTheme();
  const theme = useMemo<NavigationTheme>(
    () => ({
      dark: scheme === 'dark',
      colors: {
        primary: colors.sage,
        background: colors.paper,
        card: colors.card,
        text: colors.ink,
        border: colors.line,
        notification: colors.warm,
      },
      fonts: {
        regular: { fontFamily: fontFamily.sans, fontWeight: '400' },
        medium: { fontFamily: fontFamily.sansMedium, fontWeight: '500' },
        bold: { fontFamily: fontFamily.sansMedium, fontWeight: '600' },
        heavy: { fontFamily: fontFamily.sansMedium, fontWeight: '700' },
      },
    }),
    [scheme, colors],
  );
  return <NavigationThemeProvider value={theme}>{children}</NavigationThemeProvider>;
}
