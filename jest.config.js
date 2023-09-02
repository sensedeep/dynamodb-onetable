/*
   Jest configuration
 */
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';
module.exports = {
    coveragePathIgnorePatterns: ['node_modules', 'test/utils'],
    coverageDirectory: 'coverage',
    globals: {
        __DYNAMODB__: null,
    },
    roots: ['<rootDir>/src', '<rootDir>/test'],
    testMatch: [
        '**/*.[jt]s',
        '!**/src/*.[jt]s',
        '!**/setup.[jt]s',
        '!**/init.[jt]s',
        '!**/teardown.[jt]s',
        '!**/helpers.[jt]s',
        '!**/schemas/*',
        '!**/proto.ts',
        '!**/stream.ts',
    ],
    globalSetup: '<rootDir>/test/utils/setup.ts',
    globalTeardown: '<rootDir>/test/utils/teardown.ts',
    testEnvironment: 'node',
    resetMocks: true,
    transform: {
        '^.+\\.(js|ts)$': 'ts-jest',
    },
    verbose: undefined,
}
