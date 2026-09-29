// Design tokens, transcribed verbatim from docs/20-style-guide.md §13
// (the JSON key `type` is exported as `typography`: `type` is a TypeScript import modifier).
// This is the only place in the repo where colour literals may live.
// Change docs/20 §13 first, then this file.

export const color = {
  paper: { light: '#F6F1E7', dark: '#1C1A17' },
  card: { light: '#FFFBF3', dark: '#262320' },
  ink: { light: '#2A2622', dark: '#EFE8DC' },
  ink2: { light: '#6B6259', dark: '#A89F93' },
  line: { light: '#E4DCCF', dark: '#3A3630' },
  sage: { light: '#4F6F52', dark: '#9DBB9A' },
  sageDeep: { light: '#3F5C42', dark: '#B7CDB4' },
  sageWash: { light: '#E3EAE0', dark: '#2C3A2D' },
  warm: { light: '#9E5238', dark: '#D99A80' },
  remove: { light: '#A24B3C', dark: '#D9846F' },
  calm: { light: '#2F5D62', dark: '#8FBFC4' },
  noteButter: { light: '#F3E3A5', dark: '#C9B77A' },
  noteBlush: { light: '#F1D3C9', dark: '#C7A79C' },
  noteSage: { light: '#D8E3D0', dark: '#A9B8A0' },
  noteSky: { light: '#D5E1EA', dark: '#A3B2BF' },
  noteLilac: { light: '#E1D9EA', dark: '#B3A9C0' },
} as const;

export const typography = {
  serif: 'Literata',
  sans: 'Instrument Sans',
  scale: {
    noteHero: [26, 34],
    note: [20, 28],
    noteSmall: [17, 24],
    title: [22, 28],
    body: [17, 24],
    label: [15, 20],
    caption: [13, 18],
  },
} as const;

export const space = [4, 8, 12, 16, 20, 24, 32, 40] as const;

export const radius = { chip: 12, sticky: 6, card: 18, hero: 24 } as const;

export const shadow = {
  card: { color: 'rgba(60,45,30,0.10)', y: 6, blur: 18 },
} as const;

export const motion = {
  fast: 200,
  base: 400,
  slow: 600,
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

export const tokens = { color, typography, space, radius, shadow, motion } as const;

export type Tokens = typeof tokens;
export type ColorName = keyof typeof color;
export type ColorScheme = keyof (typeof color)[ColorName];
export type TypeScaleName = keyof typeof typography.scale;
/** [fontSize, lineHeight] in points. */
export type TypeScaleEntry = (typeof typography.scale)[TypeScaleName];
export type RadiusName = keyof typeof radius;
