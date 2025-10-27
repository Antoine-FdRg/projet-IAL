// Global test setup
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default environment variables for tests
process.env.NATS_SERVER = process.env.NATS_SERVER || 'nats://localhost:4222';
process.env.BOX_PRODUCER_QUEUE = process.env.BOX_PRODUCER_QUEUE || 'test.measurements';