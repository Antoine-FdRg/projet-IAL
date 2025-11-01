import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL connection pool configuration
 */
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'measurement_db',
  user: process.env.DB_USER || 'ial_user',
  password: process.env.DB_PASSWORD || 'ial_password',
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
};

/**
 * Global connection pool for database queries
 */
const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] - Unexpected database pool error:`, err);
});

console.log(`[${new Date().toISOString()}] - Database pool configured for ${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);

export default pool;

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(`[${new Date().toISOString()}] - Database connection successful:`, result.rows[0]);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] - Database connection failed:`, error);
    return false;
  }
}
