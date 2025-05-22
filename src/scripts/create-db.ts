import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../config/logger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbName = process.env.DB_NAME || 'secure_ballot';

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
    // Check if main database exists
    const mainDbExists = await pool.query(`
      SELECT 1 FROM pg_database WHERE datname = '${dbName}'
    `);

    // Create main database if it doesn't exist
    if (mainDbExists.rowCount === 0) {
      await pool.query(`CREATE DATABASE ${dbName}`);
      logger.info(`Database ${dbName} created`);
    } else {
      logger.info(`Database ${dbName} already exists`);
    }

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
    .catch(error => {
      logger.error('Database creation script failed:', error);
      process.exit(1);
    });
}

export default createDatabase;
