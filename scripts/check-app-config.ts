// app/app.json cannot import packages/shared/tokens.ts, so the native splash colours are copied
// into it. This check keeps the copy honest: the expo-splash-screen backgroundColor (light and
// dark) must equal color.paper, or the hand-off to the company splash flashes (docs/21 §1.0).
// Run with `npm run check:app-config` (tsx). Exits 1 on any mismatch.

import appJson from '../app/app.json';
import { color } from '../packages/shared/tokens.ts';

export type AppConfigViolation = { field: string; expected: string; actual: string | undefined };

type SplashOptions = { backgroundColor?: string; dark?: { backgroundColor?: string } };

/** The options object of the expo-splash-screen plugin entry, if any. */
export function splashOptions(plugins: readonly unknown[]): SplashOptions | undefined {
  for (const plugin of plugins) {
    if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') {
      const options: unknown = plugin[1];
      return typeof options === 'object' && options !== null ? (options as SplashOptions) : {};
    }
  }
  return undefined;
}

const same = (a: string | undefined, b: string) => a?.toLowerCase() === b.toLowerCase();

export function checkAppConfig(plugins: readonly unknown[]): AppConfigViolation[] {
  const options = splashOptions(plugins);
  const light = options?.backgroundColor;
  const dark = options?.dark?.backgroundColor;
  const violations: AppConfigViolation[] = [];
  if (!same(light, color.paper.light)) {
    violations.push({ field: 'expo-splash-screen.backgroundColor', expected: color.paper.light, actual: light });
  }
  if (!same(dark, color.paper.dark)) {
    violations.push({ field: 'expo-splash-screen.dark.backgroundColor', expected: color.paper.dark, actual: dark });
  }
  return violations;
}

if (process.argv[1]?.endsWith('check-app-config.ts')) {
  const violations = checkAppConfig(appJson.expo.plugins);
  for (const v of violations) {
    console.error(`app/app.json ${v.field}: ${v.actual ?? 'missing'}, expected ${v.expected} (packages/shared/tokens.ts)`);
  }
  if (violations.length > 0) process.exit(1);
  console.log('check-app-config: native splash matches color.paper (light and dark)');
}
