import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans/400Regular';
import { InstrumentSans_500Medium } from '@expo-google-fonts/instrument-sans/500Medium';
import { Literata_400Regular } from '@expo-google-fonts/literata/400Regular';
import { typography, type ColorName, type TypeScaleName } from '@rustle/shared';
import { Text as NativeText, type TextProps as NativeTextProps, type TextStyle } from 'react-native';

import { useTheme } from '../hooks/useTheme';

// The seven type styles of docs/20 §4. Literata for Rustle's words, Instrument Sans for the interface.

export type TextVariant = TypeScaleName;

export const fontFamily = {
  serif: typography.serif,
  sans: typography.sans,
  sansMedium: `${typography.sans} Medium`,
} as const;

/** Loaded by the root layout with expo-font; keys are the family names used in styles. */
export const fontSources = {
  [fontFamily.serif]: Literata_400Regular,
  [fontFamily.sans]: InstrumentSans_400Regular,
  [fontFamily.sansMedium]: InstrumentSans_500Medium,
} as const;

const FAMILY_OF: Record<TextVariant, string> = {
  noteHero: fontFamily.serif,
  note: fontFamily.serif,
  noteSmall: fontFamily.serif,
  title: fontFamily.sansMedium,
  body: fontFamily.sans,
  label: fontFamily.sans,
  caption: fontFamily.sans,
};

/** Family, size and line height for a named style (no colour). */
export function textStyleFor(variant: TextVariant): Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight'> {
  const [fontSize, lineHeight] = typography.scale[variant];
  return { fontFamily: FAMILY_OF[variant], fontSize, lineHeight };
}

// Font scaling is always on (docs/20 §4): layouts reflow, they never opt out.
export type TextProps = Omit<NativeTextProps, 'allowFontScaling'> & {
  variant?: TextVariant;
  color?: ColorName;
};

export function Text({ variant = 'body', color = 'ink', style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <NativeText
      {...rest}
      allowFontScaling
      style={[textStyleFor(variant), { color: colors[color] }, style]}
    />
  );
}
