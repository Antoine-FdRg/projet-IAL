import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "mjs", "cjs", "jsx", "json", "node"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      useESM: true
    }]
  },
  testMatch: [
    "<rootDir>/tests/**/*.test.ts"
  ],
  setupFilesAfterEnv: [
    "<rootDir>/tests/setup.ts"
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts"
  ],
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 30000
};

export default config;