import 'i18next';

import type en from './en.json';

// English is the source of truth for keys; French adds `_vous` siblings (i18next context).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
