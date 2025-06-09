"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = exports.logger = void 0;
const winston_1 = require("winston");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { combine, timestamp, printf, colorize, json } = winston_1.format;
// Define log directory and file path
const logDir = 'logs';
const logFile = process.env.LOG_FILE_PATH || path_1.default.join(logDir, 'app.log');
// Define log format for console
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
});
// Create the logger
const logger = (0, winston_1.createLogger)({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    transports: [
        // Write logs to console in development
        new winston_1.transports.Console({
            format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat),
        }),
        // Write logs to file
        new winston_1.transports.File({
            filename: logFile,
            maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10),
            maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
            tailable: true,
        }),
    ],
});
exports.logger = logger;
// Create a stream object with a 'write' function that will be used by morgan
const stream = {
    write: (message) => {
        logger.info(message.trim());
    },
};
exports.stream = stream;
//# sourceMappingURL=logger.js.map