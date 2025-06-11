"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = exports.adminLimiter = exports.ussdLimiter = exports.sensitiveOpLimiter = exports.authLimiter = exports.defaultLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("../config/logger");
// Default rate limiter for general API endpoints
exports.defaultLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP, please try again later.',
    },
    handler: (req, res, next, options) => {
        logger_1.logger.warn({
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
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
        message: 'Too many login attempts from this IP, please try again after an hour.',
    },
    handler: (req, res, next, options) => {
        logger_1.logger.warn({
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
exports.sensitiveOpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 'TOO_MANY_SENSITIVE_OPERATIONS',
        message: 'Too many sensitive operations from this IP, please try again after an hour.',
    },
    handler: (req, res, next, options) => {
        logger_1.logger.warn({
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
exports.ussdLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 'TOO_MANY_USSD_REQUESTS',
        message: 'Too many USSD requests from this IP, please try again after an hour.',
    },
    handler: (req, res, next, options) => {
        logger_1.logger.warn({
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
exports.adminLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 'TOO_MANY_ADMIN_REQUESTS',
        message: 'Too many admin requests from this IP, please try again after 15 minutes.',
    },
    handler: (req, res, next, options) => {
        logger_1.logger.warn({
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
const createRateLimiter = (windowMs, max, errorCode, errorMessage) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            code: errorCode,
            message: errorMessage,
        },
        handler: (req, res, next, options) => {
            logger_1.logger.warn({
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
exports.createRateLimiter = createRateLimiter;
//# sourceMappingURL=rateLimiter.js.map