"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../config/logger");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const dbName = process.env.DB_NAME || 'secure_ballot';
const createDatabase = async () => {
    // Connect to default postgres database
    const pool = new pg_1.Pool({
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
            logger_1.logger.info(`Database ${dbName} created`);
        }
        else {
            logger_1.logger.info(`Database ${dbName} already exists`);
        }
        // Create PostgreSQL extensions if needed
        const mainDbPool = new pg_1.Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: dbName,
        });
        // Add UUID extension
        await mainDbPool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        logger_1.logger.info('UUID extension created or already exists');
        // Add pgcrypto for encryption functions
        await mainDbPool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
        logger_1.logger.info('pgcrypto extension created or already exists');
        // Close connections
        await mainDbPool.end();
        await pool.end();
        logger_1.logger.info('Database setup completed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error creating databases:', error);
        await pool.end();
        process.exit(1);
    }
};
// Run the function if this script is executed directly
if (require.main === module) {
    createDatabase()
        .then(() => {
        logger_1.logger.info('Database creation script completed');
        process.exit(0);
    })
        .catch(error => {
        logger_1.logger.error('Database creation script failed:', error);
        process.exit(1);
    });
}
exports.default = createDatabase;
//# sourceMappingURL=create-db.js.map