import http from 'http';
import https from 'https';
import fs from 'fs';
import { Sequelize } from 'sequelize';

import app from './app';
import serverConfig from './config/server';
import databaseConfig from './config/database';
import { logger } from './config/logger';

let server: http.Server | https.Server;
const env = process.env.NODE_ENV || 'development';
const dbConfig = databaseConfig[env as keyof typeof databaseConfig];

// Connect to database
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    ...(env === 'production' ? { dialectOptions: dbConfig.dialectOptions } : {}),
    ...(env === 'production' ? { pool: dbConfig.pool } : {}),
  }
);

// Test database connection
const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await testDbConnection();

  // Create HTTP or HTTPS server based on configuration
  if (serverConfig.httpsEnabled && serverConfig.sslKeyPath && serverConfig.sslCertPath) {
    try {
      const privateKey = fs.readFileSync(serverConfig.sslKeyPath, 'utf8');
      const certificate = fs.readFileSync(serverConfig.sslCertPath, 'utf8');
      const credentials = { key: privateKey, cert: certificate };

      server = https.createServer(credentials, app);
      logger.info('Starting HTTPS server...');
    } catch (error) {
      logger.error('Failed to read SSL certificates:', error);
      logger.info('Falling back to HTTP server...');
      server = http.createServer(app);
    }
  } else {
    server = http.createServer(app);
  }

  server.listen(serverConfig.port, () => {
    logger.info(`Server running in ${serverConfig.env} mode on port ${serverConfig.port}`);
    logger.info(`API Documentation available at http://localhost:${serverConfig.port}/api-docs`);
  });

  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof serverConfig.port === 'string'
      ? `Pipe ${serverConfig.port}`
      : `Port ${serverConfig.port}`;

    // Handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        logger.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  // Handle graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} signal received: closing HTTP server...`);
    server.close(() => {
      logger.info('HTTP server closed');
      sequelize.close()
        .then(() => {
          logger.info('Database connection closed');
          process.exit(0);
        })
        .catch((err) => {
          logger.error('Error closing database connection:', err);
          process.exit(1);
        });
    });
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();

export { sequelize };