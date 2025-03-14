import dotenv from "dotenv";
import { Dialect } from "sequelize";

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
    dialectOptions: {
      ssl: {
        require: boolean;
        rejectUnauthorized: boolean;
      };
    };
    pool: {
      max: number;
      min: number;
      acquire: number;
      idle: number;
    };
  };
}

const config: DatabaseConfig = {
  development: {
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "secure_ballot",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: (process.env.DB_DIALECT as Dialect) || "postgres",
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
  },
  test: {
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME_TEST || "secure_ballot_test",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: (process.env.DB_DIALECT as Dialect) || "postgres",
    logging: false,
  },
  production: {
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "secure_ballot",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: (process.env.DB_DIALECT as Dialect) || "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
  },
};

export default config;
