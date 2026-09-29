import { use } from 'react';

import { ThemeContext, type Theme } from '../components/ThemeProvider';

export type { Theme, ThemeColors, ThemeName } from '../components/ThemeProvider';

export function useTheme(): Theme {
  const theme = use(ThemeContext);
  if (!theme) throw new Error('useTheme() must be called inside <ThemeProvider>.');
  return theme;
}
