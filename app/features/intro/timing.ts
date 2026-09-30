import { motion } from '@rustle/shared';
import { Easing, type EasingFunction } from 'react-native';

// The durations of the cold-start sequence (docs/20 §6: 2 s splash · 1 s hold · 400 ms fade-up).

export const SPLASH_MS = 2000;
/** The company name fades out over the last part of the splash. */
export const SPLASH_FADE_MS = motion.base;
/** The Rustle screen fades in from the splash. */
export const STAGE_FADE_MS = motion.base;
/** How long the wordmark stands alone before the rest of the screen arrives. */
export const CONTENT_DELAY_MS = 1000;
export const CONTENT_FADE_MS = motion.base;
/** The content rises this far while it fades up (0 under reduce-motion: fades only). */
export const CONTENT_RISE = 8;

/** Parses the token's `cubic-bezier(a, b, c, d)` so the easing lives only in tokens.ts. */
export function easingFromToken(css: string): EasingFunction {
  const numbers = css.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const [x1, y1, x2, y2] = numbers;
  if (numbers.length !== 4 || x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    return Easing.out(Easing.cubic);
  }
  return Easing.bezier(x1, y1, x2, y2);
}

export const EASE = easingFromToken(motion.ease);
