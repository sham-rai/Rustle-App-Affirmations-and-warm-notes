import { useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import en from './en.json';
import type { Language } from './index';
import { getAddress, subscribeAddress, type Address } from './preferences';

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every string key, as a dot path into en.json (the `_vous` siblings are resolved by context). */
export type StringKey = Leaves<typeof en>;
export type Interpolation = Record<string, string | number>;

export function useAddress(): Address {
  return useSyncExternalStore(subscribeAddress, getAddress, getAddress);
}

/**
 * The one translation hook. It sets the i18next context from the "tu" / "vous" preference,
 * so a French key with a `_vous` sibling returns that sibling for a "vous" user.
 * English has no `_vous` keys, so the context falls through to the plain key.
 */
export function useT(): { t: (key: StringKey, values?: Interpolation) => string; language: Language; address: Address } {
  const { t: translate, i18n } = useTranslation();
  const address = useAddress();

  const t = useCallback(
    (key: StringKey, values?: Interpolation): string =>
      translate(key, { ...values, context: address === 'vous' ? 'vous' : undefined }),
    [translate, address],
  );

  const language: Language = i18n.resolvedLanguage === 'fr' ? 'fr' : 'en';
  return { t, language, address };
}
