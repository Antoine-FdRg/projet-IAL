import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL connection pool configuration for user-db
 */
const userDbPoolConfig = {
  host: process.env.USER_DB_HOST || 'user-db',
  port: parseInt(process.env.USER_DB_PORT || '5432'),
  database: process.env.USER_DB_NAME || 'user',
  user: process.env.USER_DB_USER || 'user',
  password: process.env.USER_DB_PASSWORD || 'user_password',
  min: 2,
  max: 10,
};

/**
 * Global connection pool for user-db queries
 */
const userDbPool = new Pool(userDbPoolConfig);

userDbPool.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] - Unexpected user-db pool error:`, err);
});

console.log(`[${new Date().toISOString()}] - User-db pool configured for ${userDbPoolConfig.host}:${userDbPoolConfig.port}/${userDbPoolConfig.database}`);

export default userDbPool;

/**
 * Test user-db connection
 */
export async function testUserDbConnection(): Promise<boolean> {
  try {
    const result = await userDbPool.query('SELECT NOW()');
    console.log(`[${new Date().toISOString()}] - User-db connection successful:`, result.rows[0]);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] - User-db connection failed:`, error);
    return false;
  }
}
