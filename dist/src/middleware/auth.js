"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireDeviceVerification = exports.requireMfa = exports.hasPermission = exports.requireVoter = exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
const AdminUser_1 = __importDefault(require("../db/models/AdminUser"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
const index_1 = require("../config/index");
const logger_1 = require("../config/logger");
/**
 * Middleware to authenticate JWT token for both admin and voter users
 * @route All protected routes
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new errorHandler_1.ApiError(401, 'No authorization header', 'AUTH_HEADER_MISSING');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new errorHandler_1.ApiError(401, 'No token provided', 'TOKEN_MISSING');
        }
        try {
            // Use JWT_SECRET from config with proper fallback
            const secret = index_1.config.jwt.secret || process.env.JWT_SECRET;
            if (!secret) {
                logger_1.logger.error('JWT secret is not defined');
                throw new errorHandler_1.ApiError(500, 'Internal server error', 'SERVER_ERROR');
            }
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            // Extract user ID and role from token
            const userId = decoded.id;
            const role = decoded.role;
            if (!userId || !role) {
                throw new errorHandler_1.ApiError(401, 'Invalid token payload', 'INVALID_TOKEN_PAYLOAD');
            }
            // Store user ID and role in request for easier access
            req.userId = userId;
            req.role = role;
            // Handle different user types based on role
            if (role === 'admin') {
                const admin = await AdminUser_1.default.findByPk(userId, {
                    include: ['roles', 'permissions'],
                });
                if (!admin) {
                    throw new errorHandler_1.ApiError(401, 'Admin user not found', 'USER_NOT_FOUND');
                }
                if (!admin.isActive) {
                    throw new errorHandler_1.ApiError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
                }
                req.user = admin;
                req.userType = 'admin';
            }
            else if (role === 'voter') {
                const voter = await Voter_1.default.findByPk(userId);
                if (!voter) {
                    throw new errorHandler_1.ApiError(401, 'Voter not found', 'USER_NOT_FOUND');
                }
                if (!voter.isActive) {
                    throw new errorHandler_1.ApiError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
                }
                req.user = voter;
                req.userType = 'voter';
            }
            else {
                throw new errorHandler_1.ApiError(403, 'Invalid user role', 'INVALID_ROLE');
            }
            next();
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errorHandler_1.ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN');
            }
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
/**
 * Middleware to ensure user is an admin
 * @route Admin-only routes
 */
const requireAdmin = (req, res, next) => {
    try {
        if (!req.user || req.userType !== 'admin') {
            throw new errorHandler_1.ApiError(403, 'Admin access required', 'ADMIN_REQUIRED');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware to ensure user is a voter
 * @route Voter-only routes
 */
const requireVoter = (req, res, next) => {
    try {
        if (!req.user || req.userType !== 'voter') {
            throw new errorHandler_1.ApiError(403, 'Voter access required', 'VOTER_REQUIRED');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireVoter = requireVoter;
/**
 * Middleware to check specific permissions for admin users
 * @param requiredPermission Required permission string
 * @route Admin routes with specific permission requirements
 */
const hasPermission = (requiredPermission) => {
    return (req, res, next) => {
        try {
            if (!req.user || req.userType !== 'admin') {
                throw new errorHandler_1.ApiError(403, 'Admin access required', 'ADMIN_REQUIRED');
            }
            // Check if user is a system administrator (always has all permissions)
            if (req.user.adminType === 'SystemAdministrator') {
                return next();
            }
            // Check specific permission
            const hasRequiredPermission = req.user.permissions?.some((permission) => permission.permissionName === requiredPermission);
            if (!hasRequiredPermission) {
                throw new errorHandler_1.ApiError(403, `Required permission: ${requiredPermission}`, 'PERMISSION_DENIED');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.hasPermission = hasPermission;
/**
 * Middleware to check if MFA is enabled
 * @route Routes requiring MFA
 */
const requireMfa = (req, res, next) => {
    try {
        if (!req.user) {
            throw new errorHandler_1.ApiError(401, 'User not authenticated', 'AUTHENTICATION_REQUIRED');
        }
        if (!req.user.mfaEnabled) {
            throw new errorHandler_1.ApiError(403, 'MFA not enabled', 'MFA_NOT_ENABLED');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireMfa = requireMfa;
/**
 * Middleware to check device verification for mobile routes
 * @route Mobile routes requiring device verification
 */
const requireDeviceVerification = (req, res, next) => {
    try {
        if (!req.user) {
            throw new errorHandler_1.ApiError(401, 'User not authenticated', 'AUTHENTICATION_REQUIRED');
        }
        const deviceId = req.headers['x-device-id'];
        if (!deviceId) {
            throw new errorHandler_1.ApiError(400, 'Device ID required', 'DEVICE_ID_REQUIRED');
        }
        // TODO: Implement device verification logic
        // This should check if the deviceId is registered for this user
        // For now, we'll just pass through
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireDeviceVerification = requireDeviceVerification;
//# sourceMappingURL=auth.js.map