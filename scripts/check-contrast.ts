// docs/20 §15, docs/21 §14.2: WCAG contrast for the text pairs of docs/20 §3.1–3.2, computed
// from packages/shared/tokens.ts. Fails below 4.5 : 1. Run with `npm run check:contrast` (tsx).

import { color, type ColorName, type ColorScheme } from '../packages/shared/tokens.ts';

export const AA_TEXT = 4.5;

type Rgb = readonly [number, number, number];
const WHITE: Rgb = [255, 255, 255];

function parseHex(hex: string): Rgb {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb colour: ${hex}`);
  return [parseInt(match[1] ?? '', 16), parseInt(match[2] ?? '', 16), parseInt(match[3] ?? '', 16)];
}

function luminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastPair = { label: string; fg: Rgb; bg: Rgb };
export type ContrastResult = ContrastPair & { ratio: number; pass: boolean };

const tok = (name: ColorName, scheme: ColorScheme): Rgb => parseHex(color[name][scheme]);
const PASTELS: ColorName[] = ['noteButter', 'noteBlush', 'noteSage', 'noteSky', 'noteLilac'];

/** The text pairs named in docs/20 §3.1–3.2 and the M1-04 ticket. */
export function contrastPairs(): ContrastPair[] {
  const pairs: ContrastPair[] = [];
  for (const scheme of ['light', 'dark'] as const) {
    for (const fg of ['ink', 'ink2'] as const) {
      for (const bg of ['paper', 'card'] as const) {
        pairs.push({ label: `${scheme}: ${fg} on ${bg}`, fg: tok(fg, scheme), bg: tok(bg, scheme) });
      }
    }
    // Sage is text too: links and the active tab label (docs/20 §3.1).
    for (const bg of ['paper', 'card'] as const) {
      pairs.push({ label: `${scheme}: sage on ${bg}`, fg: tok('sage', scheme), bg: tok(bg, scheme) });
    }
    // Sticky notes carry the charcoal ink in both schemes (docs/20 §3.2: "ink on it 8.7 : 1").
    for (const bg of PASTELS) {
      pairs.push({ label: `${scheme}: ink (light) on ${bg}`, fg: tok('ink', 'light'), bg: tok(bg, scheme) });
    }
  }
  for (const bg of ['sage', 'sageDeep', 'warm', 'remove', 'calm'] as const) {
    pairs.push({ label: `light: white on ${bg}`, fg: WHITE, bg: tok(bg, 'light') });
  }
  return pairs;
}

export function checkContrast(pairs: ContrastPair[] = contrastPairs()): ContrastResult[] {
  return pairs.map((pair) => {
    const ratio = contrastRatio(pair.fg, pair.bg);
    return { ...pair, ratio, pass: ratio >= AA_TEXT };
  });
}

if (process.argv[1]?.endsWith('check-contrast.ts')) {
  const results = checkContrast();
  for (const r of results) console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.ratio.toFixed(2)} : 1  ${r.label}`);
  const failures = results.filter((r) => !r.pass);
  if (failures.length > 0) {
    console.error(`check-contrast: ${failures.length} pair(s) below ${AA_TEXT} : 1`);
    process.exit(1);
  }
}
