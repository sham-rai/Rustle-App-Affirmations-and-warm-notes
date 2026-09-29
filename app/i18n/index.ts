import { getLocales, useLocales, type Locale } from 'expo-localization';
import { createInstance } from 'i18next';
import { useEffect } from 'react';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import fr from './fr.json';

// i18n setup (docs/20 §10, docs/21 §17). Only the root layout imports this module; components
// use `useT()` from './useT', which applies the "tu" / "vous" context.

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';

function isSupported(code: string | null | undefined): code is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === code);
}

/**
 * The first supported language in the device's preference order; `fr-CA` and `fr-FR`
 * both resolve to `fr`, anything unsupported falls back to English.
 */
export function resolveLanguage(locales: readonly Pick<Locale, 'languageCode' | 'languageTag'>[]): Language {
  for (const locale of locales) {
    const code = (locale.languageCode ?? locale.languageTag.split('-')[0] ?? '').toLowerCase();
    if (isSupported(code)) return code;
  }
  return FALLBACK_LANGUAGE;
}

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

/** The app's i18next instance; components reach it only through useT(). */
export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(getLocales()),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  // Bundled resources: initialise synchronously so the first frame already has strings.
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Keeps the language in step with the device when it changes while the app runs (Android). */
export function useDeviceLanguage(): void {
  const locales = useLocales();
  useEffect(() => {
    const next = resolveLanguage(locales);
    if (i18n.language !== next) void i18n.changeLanguage(next);
  }, [locales]);
}
