import { color, typography, type TypeScaleName } from '@rustle/shared';
import { render, renderHook, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { Text, fontFamily, textStyleFor } from '../components/Text';
import { ThemeProvider, resolveTheme, themeNameFor } from '../components/ThemeProvider';
import { useTheme } from '../hooks/useTheme';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));
const mockScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

describe('Text', () => {
  const expected: Record<TypeScaleName, [string, number, number]> = {
    noteHero: [fontFamily.serif, 26, 34],
    note: [fontFamily.serif, 20, 28],
    noteSmall: [fontFamily.serif, 17, 24],
    title: [fontFamily.sansMedium, 22, 28],
    body: [fontFamily.sans, 17, 24],
    label: [fontFamily.sans, 15, 20],
    caption: [fontFamily.sans, 13, 18],
  };

  it('covers exactly the seven styles of the type scale', () => {
    expect(Object.keys(expected).sort()).toEqual(Object.keys(typography.scale).sort());
  });

  it.each(Object.entries(expected))('%s maps to %j', (variant, [family, size, lineHeight]) => {
    render(
      <Text variant={variant as TypeScaleName} testID="t">
        x
      </Text>,
      { wrapper },
    );
    const node = screen.getByTestId('t');
    expect(StyleSheet.flatten(node.props.style)).toMatchObject({ fontFamily: family, fontSize: size, lineHeight });
    expect(node.props.allowFontScaling).toBe(true);
    expect(textStyleFor(variant as TypeScaleName)).toEqual({ fontFamily: family, fontSize: size, lineHeight });
  });

  it('defaults to body in ink, and takes a token colour', () => {
    render(
      <>
        <Text testID="default">x</Text>
        <Text testID="muted" color="ink2">
          y
        </Text>
      </>,
      { wrapper },
    );
    expect(StyleSheet.flatten(screen.getByTestId('default').props.style)).toMatchObject({
      fontSize: 17,
      color: color.ink.light,
    });
    expect(StyleSheet.flatten(screen.getByTestId('muted').props.style).color).toBe(color.ink2.light);
  });

  it('uses Literata and Instrument Sans from the tokens', () => {
    expect(fontFamily.serif).toBe('Literata');
    expect(fontFamily.sans).toBe('Instrument Sans');
  });
});

describe('ThemeProvider', () => {
  it('resolves Paper in light mode and Night in dark mode', () => {
    mockScheme.mockReturnValue('light');
    const light = renderHook(() => useTheme(), { wrapper });
    expect(light.result.current.name).toBe('paper');
    expect(light.result.current.colors.paper).toBe(color.paper.light);

    mockScheme.mockReturnValue('dark');
    const dark = renderHook(() => useTheme(), { wrapper });
    expect(dark.result.current.name).toBe('night');
    expect(dark.result.current.colors.ink).toBe(color.ink.dark);
  });

  it('treats an unknown scheme as light', () => {
    expect(themeNameFor(null)).toBe('paper');
    expect(themeNameFor('dark')).toBe('night');
  });

  it('resolves every colour token and exposes the other token groups', () => {
    const night = resolveTheme('night');
    expect(Object.keys(night.colors).sort()).toEqual(Object.keys(color).sort());
    expect(night.space).toEqual([4, 8, 12, 16, 20, 24, 32, 40]);
    expect(night.radius.card).toBe(18);
    expect(night.motion.base).toBe(400);
  });

  it('useTheme throws outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useTheme())).toThrow('ThemeProvider');
  });
});
