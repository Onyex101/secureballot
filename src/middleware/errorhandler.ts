import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { logger } from '../config/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Something went wrong';
  let details = err.details || {};
  const isOperational = err.isOperational || false;

  // Log error
  if (statusCode === 500) {
    logger.error({
      message: 'Internal Server Error',
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'] || '',
      ip: req.ip,
    });
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

  // Handle Sequelize validation errors
  if (err instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation error';
    details = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Send response
  res.status(statusCode).json({
    code: errorCode,
    message,
    details: Object.keys(details).length ? details : undefined,
    ...(process.env.NODE_ENV === 'development' && !isOperational
      ? { stack: err.stack }
      : {}),
  });
};

export default errorHandler;