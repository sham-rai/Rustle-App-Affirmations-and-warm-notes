/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@rustle/shared$': '<rootDir>/../packages/shared/index.ts',
    '^@rustle/shared/(.*)$': '<rootDir>/../packages/shared/$1',
  },
};
