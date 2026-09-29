import {
  color,
  motion,
  radius,
  shadow,
  space,
  typography,
  type ColorName,
  type ColorScheme,
} from '@rustle/shared';
import { createContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

// Maps packages/shared/tokens.ts to a resolved theme (docs/20 §3, §15).
// Only Paper (light) and Night (dark) exist; dark mode follows the system (docs/05 §12).
// Named themes (Dawn, the premium set) slot in here later without changing useTheme().

export type ThemeName = 'paper' | 'night';
export type ThemeColors = { readonly [K in ColorName]: string };

export type Theme = {
  readonly name: ThemeName;
  readonly scheme: ColorScheme;
  readonly colors: ThemeColors;
  readonly typography: typeof typography;
  readonly space: typeof space;
  readonly radius: typeof radius;
  readonly shadow: typeof shadow;
  readonly motion: typeof motion;
};

const SCHEME_OF: Record<ThemeName, ColorScheme> = { paper: 'light', night: 'dark' };

export function resolveTheme(name: ThemeName): Theme {
  const scheme = SCHEME_OF[name];
  const colors = Object.fromEntries(
    (Object.keys(color) as ColorName[]).map((key) => [key, color[key][scheme]]),
  ) as Record<ColorName, string>;
  return { name, scheme, colors, typography, space, radius, shadow, motion };
}

const THEMES: Record<ThemeName, Theme> = {
  paper: resolveTheme('paper'),
  night: resolveTheme('night'),
};

/** The system scheme picks the theme; no manual override yet. */
export function themeNameFor(systemScheme: string | null | undefined): ThemeName {
  return systemScheme === 'dark' ? 'night' : 'paper';
}

export const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const theme = useMemo(() => THEMES[themeNameFor(systemScheme)], [systemScheme]);
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}
