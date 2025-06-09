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
export declare const config: Config;
export {};
