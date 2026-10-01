import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavigationThemeProvider, type Theme as NavigationTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { fontFamily, fontSources } from '../components/Text';
import { ThemeProvider } from '../components/ThemeProvider';
import { useTheme } from '../hooks/useTheme';
import { i18n, useDeviceLanguage } from '../i18n';
import { AuthProvider, useAuth } from '../lib/auth/AuthProvider';
import { track } from '../lib/analytics';
import { initSentry } from '../lib/sentry';
import { isSupabaseConfigured } from '../lib/supabase';

// Keep the splash up until the fonts are ready (M1-04) and, on a cold start, until the session is
// known (M2-01): a restored session then goes straight from the native splash to Today, and a new
// account to the company splash, with nothing in between. AuthProvider creates or restores the
// anonymous account (M1-03).
void SplashScreen.preventAutoHideAsync();

// Module scope: once per cold start, before anything can crash. Both SDKs are off without their key.
initSentry();
track('app_opened', { source: 'icon' });

/** Never hold the native splash longer than this, even if the session is slow to come back. */
const MAX_NATIVE_SPLASH_MS = 4000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontSources);
  const ready = fontsLoaded || fontError != null;
  useDeviceLanguage();

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <TokenNavigationTheme>
          <AuthProvider>
            <HideSplashWhenLaunchKnown />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(onboarding)" options={{ animation: 'none' }} />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AuthProvider>
        </TokenNavigationTheme>
      </ThemeProvider>
    </I18nextProvider>
  );
}

/**
 * Mounted once the fonts are ready (on a font error too: the app then shows in the system font
 * rather than a stuck splash). Hides the native splash once "/" knows where to go.
 */
function HideSplashWhenLaunchKnown() {
  const auth = useAuth();
  const known = auth.status !== 'loading' || !isSupabaseConfigured();

  useEffect(() => {
    if (known) void SplashScreen.hideAsync();
  }, [known]);

  useEffect(() => {
    const timeout = setTimeout(() => void SplashScreen.hideAsync(), MAX_NATIVE_SPLASH_MS);
    return () => clearTimeout(timeout);
  }, []);

  return null;
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
