/** @type {import('jest').Config} */

module.exports = {
    verbose: true,
    projects: [
        {
            displayName: 'unit',
            testMatch: ['<rootDir>/test/**/*.test.js'],
            testEnvironment: 'node',
        },
    ],
    coverageThreshold: {
      global: {
        branches: 65,
        functions: 65,
        lines: 65,
        statements: 65
      }
    },
};
