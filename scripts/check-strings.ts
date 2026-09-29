/// <reference types="node" />
// docs/20 §10, docs/21 §17.1: no "!" and never the word "affirmation" in UI strings.
// Run with `npm run check:strings` (tsx). Exits 1 on any violation.

import en from '../app/i18n/en.json';
import fr from '../app/i18n/fr.json';

export type StringViolation = { file: string; key: string; rule: 'exclamation' | 'affirmation'; value: string };

type StringTree = { readonly [key: string]: string | StringTree };

function* leaves(tree: StringTree, prefix = ''): Generator<[string, string]> {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') yield [path, value];
    else yield* leaves(value, path);
  }
}

export function findStringViolations(files: Record<string, StringTree>): StringViolation[] {
  const violations: StringViolation[] = [];
  for (const [file, tree] of Object.entries(files)) {
    for (const [key, value] of leaves(tree)) {
      if (value.includes('!')) violations.push({ file, key, rule: 'exclamation', value });
      if (/affirmation/i.test(value)) violations.push({ file, key, rule: 'affirmation', value });
    }
  }
  return violations;
}

export const STRING_FILES: Record<string, StringTree> = { 'app/i18n/en.json': en, 'app/i18n/fr.json': fr };

if (process.argv[1]?.endsWith('check-strings.ts')) {
  const violations = findStringViolations(STRING_FILES);
  for (const v of violations) console.error(`${v.file} ${v.key}: ${v.rule} in "${v.value}"`);
  if (violations.length > 0) process.exit(1);
  console.log(`check-strings: ${Object.keys(STRING_FILES).length} files clean`);
}
