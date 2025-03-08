import { createLogger, format, transports } from "winston";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { combine, timestamp, printf, colorize, json } = format;

// Define log directory and file path
const logDir = "logs";
const logFile = process.env.LOG_FILE_PATH || path.join(logDir, "app.log");

// Define log format for console
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} ${level}: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
  }`;
});

// Create the logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), json()),
  defaultMeta: { service: "nigeria-evoting-api" },
  transports: [
    // Write logs to console in development
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        consoleFormat,
      ),
    }),
    // Write logs to file
    new transports.File({
      filename: logFile,
      maxsize: parseInt(process.env.LOG_MAX_SIZE || "10485760", 10), // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || "7", 10),
      tailable: true,
    }),
  ],
});

// Create a stream object with a 'write' function that will be used by morgan
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export { logger, stream };
