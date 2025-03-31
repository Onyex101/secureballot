import dotenv from 'dotenv';
import { Dialect } from 'sequelize';
import { logger } from './logger';

dotenv.config();

interface DatabaseConfig {
  development: {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    dialect: Dialect;
    logging: boolean | ((sql: string, timing?: number) => void);
    dialectOptions?: {
      ssl?: {
        require?: boolean;
        rejectUnauthorized?: boolean;
      };
    };
    pool?: {
      max?: number;
      min?: number;
      acquire?: number;
      idle?: number;
    };
  };
  test: {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    dialect: Dialect;
    logging: boolean | ((sql: string, timing?: number) => void);
    dialectOptions?: {
      ssl?: {
        require?: boolean;
        rejectUnauthorized?: boolean;
      };
    };
    pool?: {
      max?: number;
      min?: number;
      acquire?: number;
      idle?: number;
    };
  };
  production: {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    dialect: Dialect;
    logging: boolean | ((sql: string, timing?: number) => void);
    dialectOptions?: {
      ssl?: {
        require?: boolean;
        rejectUnauthorized?: boolean;
      };
    };
    pool?: {
      max?: number;
      min?: number;
      acquire?: number;
      idle?: number;
    };
  };
}

// Check if SSL is explicitly required
const useSSL = process.env.DB_USE_SSL === 'true';

const config: DatabaseConfig = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'secure_ballot',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: (process.env.DB_DIALECT as Dialect) || 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? logger.debug : false,
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME_TEST || 'secure_ballot_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: (process.env.DB_DIALECT as Dialect) || 'postgres',
    logging: false,
  },
  production: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'secure_ballot',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: (process.env.DB_DIALECT as Dialect) || 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
    ...(useSSL && {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }),
  },
};

export default config;
