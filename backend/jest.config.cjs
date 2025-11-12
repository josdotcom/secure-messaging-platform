module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    coverageDirectory: '<rootDir>/coverage',
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        }
    },
    // Only include the following line if you actually have this file!
    // setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
    testTimeout: 30000,
    verbose: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};
