const base = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  rootDir: '.',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^thumbhash$': '<rootDir>/test/e2e/stubs/thumbhash.ts',
  },
};

module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/seeds/**',
    '!src/main.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { statements: 85, lines: 85, functions: 75, branches: 70 },
  },
  projects: [
    { ...base, displayName: 'unit', testRegex: 'src/.*\\.spec\\.ts$' },
    {
      ...base,
      displayName: 'int',
      testRegex: 'test/integration/.*\\.int-spec\\.ts$',
      testTimeout: 20000,
    },
    {
      ...base,
      displayName: 'e2e',
      testRegex: 'test/e2e/.*\\.e2e-spec\\.ts$',
      setupFiles: ['<rootDir>/test/e2e/setup-env.ts'],
      testTimeout: 20000,
    },
  ],
};
