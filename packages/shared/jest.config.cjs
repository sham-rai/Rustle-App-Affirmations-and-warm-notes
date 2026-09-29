/** Plain Jest. TypeScript is transpiled with the repo's own `typescript`, no Babel. */
module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/**/*.test.ts'],
  transform: { '^.+\\.ts$': '<rootDir>/jest.transform.cjs' },
};
