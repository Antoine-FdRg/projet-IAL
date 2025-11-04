import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL connection pool configuration for measurement-db
 */
const measurementDbPoolConfig = {
  host: process.env.MEASUREMENT_DB_HOST || 'measurement-db',
  port: parseInt(process.env.MEASUREMENT_DB_PORT || '5432'),
  database: process.env.MEASUREMENT_DB_NAME || 'measurement_db',
  user: process.env.MEASUREMENT_DB_USER || 'ial_user',
  password: process.env.MEASUREMENT_DB_PASSWORD || 'ial_password',
  min: 2,
  max: 10,
};

/**
 * Global connection pool for measurement-db queries
 */
const measurementDbPool = new Pool(measurementDbPoolConfig);

measurementDbPool.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] - Unexpected measurement-db pool error:`, err);
});

console.log(`[${new Date().toISOString()}] - Measurement-db pool configured for ${measurementDbPoolConfig.host}:${measurementDbPoolConfig.port}/${measurementDbPoolConfig.database}`);

export default measurementDbPool;

/**
 * Test measurement-db connection
 */
export async function testMeasurementDbConnection(): Promise<boolean> {
  try {
    const result = await measurementDbPool.query('SELECT NOW()');
    console.log(`[${new Date().toISOString()}] - Measurement-db connection successful:`, result.rows[0]);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] - Measurement-db connection failed:`, error);
    return false;
  }
}
