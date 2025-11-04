import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL connection pool configuration
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'measurement-db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'measurement_db',
  user: process.env.DB_USER || 'ial_user',
  password: process.env.DB_PASSWORD || 'ial_password',
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Test database connection on startup
 */
export async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log(`[${new Date().toISOString()}] - Database connected successfully:`, result.rows[0].now);
    client.release();
  } catch (error) {
    console.log(`[${new Date().toISOString()}] - DB_HOST: ${process.env.DB_HOST}`);
    console.log(`[${new Date().toISOString()}] - DB_PORT: ${process.env.DB_PORT}`);
    console.log(`[${new Date().toISOString()}] - DB_NAME: ${process.env.DB_NAME}`);
    console.log(`[${new Date().toISOString()}] - DB_USER: ${process.env.DB_USER}`);
    console.log(`[${new Date().toISOString()}] - DB_PASSWORD: ${process.env.DB_PASSWORD}`);
    console.error(`[${new Date().toISOString()}] - Failed to connect to database:`, error);
    throw error;
  }
}

/**
 * Graceful shutdown of the connection pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log(`[${new Date().toISOString()}] - Database connection pool closed`);
}

export default pool;
