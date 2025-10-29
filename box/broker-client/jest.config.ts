import type { Config } from "jest";

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)sx?$": ["babel-jest", { configFile: "./.babelrc" }]
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "mjs", "cjs", "jsx", "json", "node"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  globals: {
    "ts-jest": {
      useESM: true
    }
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
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