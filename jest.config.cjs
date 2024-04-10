module.exports = {
    roots: ["<rootDir>/tests"],
    collectCoverageFrom: [
        "tests/**/*.{js,jsx,ts,tsx}",
        "!tests/**/*.d.ts",
        "!tests/mocks/**",
    ],
    coveragePathIgnorePatterns: [],
    setupFilesAfterEnv: ["./config/jest/setupTests.js"],
    testEnvironment: "jest-environment-jsdom",
    modulePaths: ["<rootDir>/src"],
    transform: {
        "^.+\\.(ts|js|tsx|jsx)$": "@swc/jest",
        "^.+\\.css$": "<rootDir>/config/jest/cssTransform.js",
        "^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)":
            "<rootDir>/config/jest/fileTransform.cjs",
    },
    transformIgnorePatterns: [
        "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$",
        "^.+\\.module\\.(css|sass|scss)$",
    ],
    moduleFileExtensions: [
        // Place tsx and ts to beginning as suggestion from Jest team
        // https://jestjs.io/docs/configuration#modulefileextensions-arraystring
        "tsx",
        "ts",
        "web.js",
        "js",
        "web.ts",
        "web.tsx",
        "json",
        "web.jsx",
        "jsx",
        "node",
    ],
    resetMocks: true,
};