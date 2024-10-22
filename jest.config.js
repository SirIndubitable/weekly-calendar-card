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
};
