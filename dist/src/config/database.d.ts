import { Dialect } from 'sequelize';
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
declare const config: DatabaseConfig;
export default config;
