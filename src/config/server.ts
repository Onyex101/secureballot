import dotenv from "dotenv";

dotenv.config();

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

const serverConfig: ServerConfig = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  apiVersion: process.env.API_VERSION || "v1",
  apiPrefix: process.env.API_PREFIX || "/api",
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : "*",
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  secureCookie: process.env.SECURE_COOKIE === "true",
  httpsEnabled: process.env.HTTPS_ENABLED === "true",
  sslKeyPath: process.env.SSL_KEY_PATH,
  sslCertPath: process.env.SSL_CERT_PATH,
};

export default serverConfig;
