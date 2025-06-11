import rateLimit from 'express-rate-limit';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { logger } from '../config/logger';

// Default rate limiter for general API endpoints
export const defaultLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs (increased from 100)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP, please try again later.',
  },
  handler: (req, res, next, options) => {
    logger.warn({
      message: 'Rate limit exceeded',
      path: req.path,
      method: req.method,
      ip: req.ip,
      limit: options.max,
      windowMs: options.windowMs,
    });

    res.status(options.statusCode).json(options.message);
  },
});

// More strict rate limiter for authentication endpoints
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 25, // Limit each IP to 25 login attempts per hour (increased from 10)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts from this IP, please try again after an hour.',
  },
  handler: (req, res, next, options) => {
    logger.warn({
      message: 'Authentication rate limit exceeded',
      path: req.path,
      method: req.method,
      ip: req.ip,
      limit: options.max,
      windowMs: options.windowMs,
    });

    res.status(options.statusCode).json(options.message);
  },
});

// Rate limiter for sensitive operations
export const sensitiveOpLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 sensitive operations per hour (increased from 5)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_SENSITIVE_OPERATIONS',
    message: 'Too many sensitive operations from this IP, please try again after an hour.',
  },
  handler: (req, res, next, options) => {
    logger.warn({
      message: 'Sensitive operation rate limit exceeded',
      path: req.path,
      method: req.method,
      ip: req.ip,
      limit: options.max,
      windowMs: options.windowMs,
    });

    res.status(options.statusCode).json(options.message);
  },
});

// Rate limiter for USSD endpoints
export const ussdLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 USSD requests per hour (increased from 20)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_USSD_REQUESTS',
    message: 'Too many USSD requests from this IP, please try again after an hour.',
  },
  handler: (req, res, next, options) => {
    logger.warn({
      message: 'USSD rate limit exceeded',
      path: req.path,
      method: req.method,
      ip: req.ip,
      limit: options.max,
      windowMs: options.windowMs,
    });

    res.status(options.statusCode).json(options.message);
  },
});

// Rate limiter for admin endpoints
export const adminLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP to 150 admin requests per 15 minutes (increased from 50)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_ADMIN_REQUESTS',
    message: 'Too many admin requests from this IP, please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    logger.warn({
      message: 'Admin rate limit exceeded',
      path: req.path,
      method: req.method,
      ip: req.ip,
      limit: options.max,
      windowMs: options.windowMs,
    });

    res.status(options.statusCode).json(options.message);
  },
});

// Create a custom rate limiter with configurable options
export const createRateLimiter = (
  windowMs: number,
  max: number,
  errorCode: string,
  errorMessage: string,
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      code: errorCode,
      message: errorMessage,
    },
    handler: (req, res, next, options) => {
      logger.warn({
        message: 'Custom rate limit exceeded',
        path: req.path,
        method: req.method,
        ip: req.ip,
        limit: options.max,
        windowMs: options.windowMs,
      });

      res.status(options.statusCode).json(options.message);
    },
  });
};
