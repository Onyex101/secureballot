import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

const dbName = process.env.DB_NAME || 'nigeria_evoting';
const dbNameTest = process.env.DB_NAME_TEST || 'nigeria_evoting_test';

const createDatabase = async () => {
  // Connect to default postgres database
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default database first
  });

  try {
    // Create main database if it doesn't exist
    await pool.query(`
      SELECT 'CREATE DATABASE ${dbName}'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${dbName}')
      EXECUTE;
    `);
    logger.info(`Database ${dbName} created or already exists`);

    // Create test database if it doesn't exist
    await pool.query(`
      SELECT 'CREATE DATABASE ${dbNameTest}'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${dbNameTest}')
      EXECUTE;
    `);
    logger.info(`Database ${dbNameTest} created or already exists`);

    // Create PostgreSQL extensions if needed
    const mainDbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: dbName,
    });

    // Add UUID extension
    await mainDbPool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    logger.info('UUID extension created or already exists');

    // Add pgcrypto for encryption functions
    await mainDbPool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    logger.info('pgcrypto extension created or already exists');

    // Close connections
    await mainDbPool.end();
    await pool.end();

    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Error creating databases:', error);
    await pool.end();
    process.exit(1);
  }
};

// Run the function if this script is executed directly
if (require.main === module) {
  createDatabase()
    .then(() => {
      logger.info('Database creation script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database creation script failed:', error);
      process.exit(1);
    });
}

export default createDatabase;