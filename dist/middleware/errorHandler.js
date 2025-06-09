"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = exports.errorHandler = void 0;
const sequelize_1 = require("sequelize");
const logger_1 = require("../config/logger");
// Define ApiError as a class extending Error
class ApiError extends Error {
    constructor(statusCode, message, code, details, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
// Removed the old interface definition
// export interface ApiError extends Error {
//   statusCode?: number;
//   code?: string;
//   details?: any;
//   isOperational?: boolean;
// }
const errorHandler = (err, // Can be generic Error or specific ApiError
req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
    // Defaults for generic Error
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Something went wrong';
    let details = {};
    let isOperational = false;
    // Check if it's an instance of our ApiError class
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        errorCode = err.code || errorCode;
        message = err.message;
        details = err.details || details;
        isOperational = err.isOperational;
    }
    else if (err instanceof sequelize_1.ValidationError) {
        // Handle Sequelize validation errors
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Validation error';
        details = err.errors.map(e => ({
            field: e.path,
            message: e.message,
            value: e.value,
        }));
        isOperational = true; // Validation errors are operational
    }
    else if (err.name === 'JsonWebTokenError') {
        // Handle JWT errors
        statusCode = 401;
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
        isOperational = true;
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorCode = 'TOKEN_EXPIRED';
        message = 'Authentication token has expired';
        isOperational = true;
    }
    // Log error
    if (!isOperational) {
        // Log internal errors more verbosely
        logger_1.logger.error({
            message: 'Internal Server Error',
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            requestId: req.headers['x-request-id'] || '',
            ip: req.ip,
        });
        // Don't expose internal error details in production
        if (process.env.NODE_ENV === 'production') {
            message = 'An internal server error occurred.';
            errorCode = 'INTERNAL_SERVER_ERROR';
            details = {};
        }
    }
    else {
        logger_1.logger.warn({
            message: err.message,
            code: errorCode,
            statusCode,
            path: req.path,
            method: req.method,
            requestId: req.headers['x-request-id'] || '',
            ip: req.ip,
        });
    }
    // Send response
    res.status(statusCode).json({
        code: errorCode,
        message,
        details: Object.keys(details).length ? details : undefined,
        // Only include stack for non-operational errors in development
        ...(process.env.NODE_ENV === 'development' && !isOperational ? { stack: err.stack } : {}),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map