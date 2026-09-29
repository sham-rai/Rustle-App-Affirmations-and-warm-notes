// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// docs/21 §14.2: colours come only from packages/shared/tokens.ts, never hex literals in the app.
const HEX = '#[0-9a-fA-F]{3,8}\\b';
const noHexColours = [
  {
    selector: `Literal[value=/${HEX}/]`,
    message: 'No hex colours in the app: use a token from @rustle/shared via useTheme().',
  },
  {
    selector: `TemplateElement[value.raw=/${HEX}/]`,
    message: 'No hex colours in the app: use a token from @rustle/shared via useTheme().',
  },
];

// docs/21 §17.1: no hard-coded text in JSX; every user-facing string goes through useT().
const noHardCodedText = [
  {
    selector: 'JSXText[value=/[A-Za-zÀ-ÿ]/]',
    message: 'No hard-coded text: add a key to en.json / fr.json and use useT().',
  },
  {
    selector: 'JSXExpressionContainer > Literal[value=/[A-Za-zÀ-ÿ]/]',
    message: 'No hard-coded text: add a key to en.json / fr.json and use useT().',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'ios/*', 'android/*', 'coverage/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': ['error', ...noHexColours],
      // Nobody calls i18next's t() directly: useT() applies the "tu" / "vous" context.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'i18next', message: 'Use useT() from app/i18n/useT.' },
            {
              name: 'react-i18next',
              importNames: ['useTranslation', 'Trans', 'withTranslation', 'Translation'],
              message: 'Use useT() from app/i18n/useT.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.tsx'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-syntax': ['error', ...noHexColours, ...noHardCodedText],
    },
  },
  {
    files: ['i18n/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]);
