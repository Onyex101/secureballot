import databaseConfig from './database';
import serverConfig from './server';
import swaggerConfig from './swagger';

interface Config {
  database: typeof databaseConfig;
  server: typeof serverConfig;
  swagger: typeof swaggerConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

export const config: Config = {
  database: databaseConfig,
  server: serverConfig,
  swagger: swaggerConfig,
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};
