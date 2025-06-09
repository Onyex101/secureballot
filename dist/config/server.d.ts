interface ServerConfig {
    env: string;
    port: number;
    apiVersion: string;
    apiPrefix: string;
    corsOrigin: string | string[];
    rateLimitWindowMs: number;
    rateLimitMax: number;
    secureCookie: boolean;
    httpsEnabled: boolean;
    sslKeyPath?: string;
    sslCertPath?: string;
}
declare const serverConfig: ServerConfig;
export default serverConfig;
