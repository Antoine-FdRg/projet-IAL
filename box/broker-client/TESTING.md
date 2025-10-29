# Broker Client Tests

This document describes the comprehensive test suite for the broker-client service using Jest and Babel Jest.

## Test Structure

The test suite is organized into three main categories:

```
tests/
├── setup.ts                    # Global test configuration
├── unit/
│   ├── main.unit.test.ts      # Unit tests for main functionality
│   └── type.unit.test.ts      # Unit tests for type definitions
└── integration/
    └── broker-client.integration.test.ts  # Integration tests with NATS
```

## Test Categories

### Unit Tests

**File: `tests/unit/main.unit.test.ts`**

Tests individual functions in isolation with mocked dependencies:

- **Environment Configuration Tests**
  - `getConnectionOptions()` - Tests NATS connection configuration
  - `getPublishQueue()` - Tests queue name configuration
  
- **Broker Health Check Tests**
  - `checkBrokerHealth()` - Tests broker connectivity verification
  - Error handling for connection failures
  - RTT (Round Trip Time) measurement
  
- **Measurement Generation Tests**
  - `createRandomMeasurementList()` - Tests random measurement creation
  - Validates measurement structure and types
  - Tests error message generation (Bluetooth failures)
  - Tests both normal and nonsensical value generation
  
- **Message Publishing Tests**
  - `publishMeasurements()` - Tests NATS JetStream publishing
  - Tests with various measurement payloads
  - Error handling for publish failures
  - Connection management (open/close)
  
- **Main Function Tests**
  - `main()` - Tests the complete workflow
  - Success scenarios with healthy broker
  - Error scenarios with unreachable broker

**File: `tests/unit/type.unit.test.ts`**

Tests type definitions and data validation:

- **RawMeasurement Type Tests**
  - Validates all measurement types (temperature, pulse, weight, steps)
  - Tests timestamp format validation
  - Tests numeric value ranges
  - Tests unit string validation

### Integration Tests

**File: `tests/integration/broker-client.integration.test.ts`**

Tests real interactions with NATS server (when available):

- **NATS Connection Integration**
  - Real NATS server connectivity
  - Connection health verification
  - Graceful handling of unavailable servers
  
- **Message Publishing Integration**
  - End-to-end message publishing to JetStream
  - Message consumption verification
  - Stream and consumer management
  - Random measurement publishing workflows
  
- **Environment Configuration Integration**
  - Various NATS server configurations
  - Multiple server configurations
  
- **Error Handling Integration**
  - Connection failure scenarios
  - Invalid queue name handling

## Test Configuration

### Jest Configuration (`jest.config.ts`)

- **Environment**: Node.js
- **Module System**: ES Modules with TypeScript support
- **Transform**: Babel Jest with TypeScript preset
- **Coverage**: Comprehensive coverage reporting
- **Setup**: Global test environment setup

### Babel Configuration (`.babelrc`)

```json
{
  "presets": [
    ["@babel/preset-env", { "targets": { "node": "current" } }],
    "@babel/preset-typescript"
  ]
}
```

### Environment Variables (`.env.test`)

```bash
NATS_SERVER=nats://localhost:4222
BOX_PRODUCER_QUEUE=test.measurements
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test tests/unit
```

### Integration Tests Only
```bash
npm test tests/integration
```

### Specific Test File
```bash
npm test tests/unit/main.unit.test.ts
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Debug Mode
```bash
npm run test:debug
```

## Test Dependencies

### Runtime Dependencies
- `nats` - NATS client for broker communication
- `dotenv` - Environment variable management

### Development Dependencies
- `jest` - Test framework
- `babel-jest` - Babel transformer for Jest
- `ts-jest` - TypeScript support for Jest
- `@babel/core` - Babel core
- `@babel/preset-env` - Babel preset for Node.js
- `@babel/preset-typescript` - TypeScript preset for Babel
- `@types/jest` - TypeScript definitions for Jest
- `@types/node` - Node.js type definitions
