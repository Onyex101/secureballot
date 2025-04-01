import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { logger } from '../config/logger';

// Define ApiError as a class extending Error
class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any;
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    details?: any,
    isOperational = true, // Default operational to true for ApiErrors
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Removed the old interface definition
// export interface ApiError extends Error {
//   statusCode?: number;
//   code?: string;
//   details?: any;
//   isOperational?: boolean;
// }

const errorHandler = (
  err: Error | ApiError, // Can be generic Error or specific ApiError
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
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
  } else if (err instanceof ValidationError) {
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
  } else if (err.name === 'JsonWebTokenError') {
    // Handle JWT errors
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
    isOperational = true;
  }

  // Log error
  if (!isOperational) {
    // Log internal errors more verbosely
    logger.error({
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
  } else {
    logger.warn({
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

export { errorHandler, ApiError };
