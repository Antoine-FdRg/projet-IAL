import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      useESM: true
    }]
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "mjs", "cjs", "jsx", "json", "node"],
  testMatch: [
    "<rootDir>/tests/**/*.test.ts"
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts"
  ],
  coverageReporters: ["text", "lcov", "html"]
};

export default config;