// Minimal flat config for a plain TypeScript workspace. It borrows the TypeScript parser and
// plugin that eslint-config-expo already depends on, so no new top-level package is added.
const expoConfigDir = require.resolve('eslint-config-expo/flat');
const fromExpo = (name) => require(require.resolve(name, { paths: [expoConfigDir] }));

const tsParser = fromExpo('@typescript-eslint/parser');
const tsPlugin = fromExpo('@typescript-eslint/eslint-plugin');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser, sourceType: 'module' },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
