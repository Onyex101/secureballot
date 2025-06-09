"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.listUsers = void 0;
const adminService = __importStar(require("../../services/adminService"));
const auditService = __importStar(require("../../services/auditService"));
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
/**
 * List all system users with pagination and filtering
 */
const listUsers = async (req, res, next) => {
    try {
        const { role, status, page = 1, limit = 50 } = req.query;
        // Get users from service
        const result = await adminService.getUsers(role, status, Number(page), Number(limit));
        // Log the action using enum
        await auditService.createAdminAuditLog(req.user?.id || null, AuditLog_1.AuditActionType.ADMIN_USER_LIST_VIEW, req.ip || '', req.headers['user-agent'] || '', { query: req.query, success: true });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // Log failure (optional, as global handler will log too)
        // logger.error('Error fetching admin users:', error);
        await auditService
            .createAdminAuditLog(req.user?.id || null, AuditLog_1.AuditActionType.ADMIN_USER_LIST_VIEW, req.ip || '', req.headers['user-agent'] || '', { query: req.query, success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log user list view error', logErr));
        next(error);
    }
};
exports.listUsers = listUsers;
/**
 * Create a new admin user
 */
const createUser = async (req, res, next) => {
    try {
        const { email, fullName, phoneNumber, password, role } = req.body;
        const creatorUserId = req.user?.id;
        if (!creatorUserId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required to create user', 'AUTH_REQUIRED');
        }
        // Check if user with email already exists
        const userExists = await adminService.checkUserExists(email);
        if (userExists) {
            // Throw ApiError instead of returning directly
            throw new errorHandler_1.ApiError(409, 'User with this email already exists', 'USER_EXISTS', undefined, true);
        }
        // Create new admin user
        const newUser = await adminService.createAdminUser(email, fullName, phoneNumber, password, role, creatorUserId);
        // Log the action using enum
        await auditService.createAdminAuditLog(creatorUserId, AuditLog_1.AuditActionType.ADMIN_USER_CREATE, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            createdUserId: newUser.id,
            role: newUser.role,
        });
        // Return success
        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            data: {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role,
            },
        });
    }
    catch (error) {
        // Log failure (optional, as global handler will log too)
        // logger.error('Error creating admin user:', error);
        await auditService
            .createAdminAuditLog(req.user?.id || null, AuditLog_1.AuditActionType.ADMIN_USER_CREATE, req.ip || '', req.headers['user-agent'] || '', {
            success: false,
            email: req.body.email,
            role: req.body.role,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log user creation error', logErr));
        next(error);
    }
};
exports.createUser = createUser;
//# sourceMappingURL=systemAdminController.js.map