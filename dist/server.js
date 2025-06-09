"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const sequelize_1 = require("sequelize");
const app_1 = __importDefault(require("./app"));
const server_1 = __importDefault(require("./config/server"));
const database_1 = __importDefault(require("./config/database"));
const logger_1 = require("./config/logger");
let server;
const env = process.env.NODE_ENV || 'development';
const dbConfig = database_1.default[env];
// Connect to database
const sequelize = new sequelize_1.Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    ...(env === 'production' ? { dialectOptions: dbConfig.dialectOptions } : {}),
    ...(env === 'production' ? { pool: dbConfig.pool } : {}),
});
exports.sequelize = sequelize;
// Test database connection
const testDbConnection = async () => {
    try {
        await sequelize.authenticate();
        logger_1.logger.info('Database connection has been established successfully.');
    }
    catch (error) {
        logger_1.logger.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};
// Start server
const startServer = async () => {
    await testDbConnection();
    // Create HTTP or HTTPS server based on configuration
    if (server_1.default.httpsEnabled && server_1.default.sslKeyPath && server_1.default.sslCertPath) {
        try {
            const privateKey = fs_1.default.readFileSync(server_1.default.sslKeyPath, 'utf8');
            const certificate = fs_1.default.readFileSync(server_1.default.sslCertPath, 'utf8');
            const credentials = { key: privateKey, cert: certificate };
            server = https_1.default.createServer(credentials, app_1.default);
            logger_1.logger.info('Starting HTTPS server...');
        }
        catch (error) {
            logger_1.logger.error('Failed to read SSL certificates:', error);
            logger_1.logger.info('Falling back to HTTP server...');
            server = http_1.default.createServer(app_1.default);
        }
    }
    else {
        server = http_1.default.createServer(app_1.default);
    }
    server.listen(server_1.default.port, () => {
        logger_1.logger.info(`Server running in ${server_1.default.env} mode on port ${server_1.default.port}`);
        logger_1.logger.info(`API Documentation available at http://localhost:${server_1.default.port}/api-docs`);
    });
    // Handle server errors
    server.on('error', (error) => {
        if (error.syscall !== 'listen') {
            throw error;
        }
        const bind = typeof server_1.default.port === 'string'
            ? `Pipe ${server_1.default.port}`
            : `Port ${server_1.default.port}`;
        // Handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                logger_1.logger.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                logger_1.logger.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    });
    // Handle graceful shutdown
    const gracefulShutdown = (signal) => {
        logger_1.logger.info(`${signal} signal received: closing HTTP server...`);
        server.close(() => {
            logger_1.logger.info('HTTP server closed');
            sequelize
                .close()
                .then(() => {
                logger_1.logger.info('Database connection closed');
                process.exit(0);
            })
                .catch(err => {
                logger_1.logger.error('Error closing database connection:', err);
                process.exit(1);
            });
        });
    };
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};
startServer();
//# sourceMappingURL=server.js.map