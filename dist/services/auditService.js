"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecurityLogs = exports.getAuditLogs = exports.createAdminAuditLog = exports.createAuditLog = void 0;
const AuditLog_1 = __importDefault(require("../db/models/AuditLog"));
const sequelize_1 = require("sequelize");
const logger_1 = require("../config/logger");
/**
 * Create an audit log entry
 * Includes fallback handling for foreign key constraint violations
 */
const createAuditLog = async (userId, actionType, ipAddress, userAgent, actionDetails) => {
    try {
        return await AuditLog_1.default.create({
            userId,
            actionType,
            ipAddress,
            userAgent,
            actionDetails,
        });
    }
    catch (error) {
        // If we get a foreign key constraint error on user_id, retry with null userId
        if (error?.name === 'SequelizeForeignKeyConstraintError' &&
            error?.table === 'audit_logs' &&
            error?.constraint === 'fk_audit_logs_user_id') {
            logger_1.logger.warn('Foreign key constraint violation on audit log user_id, retrying with null userId', {
                originalUserId: userId,
                actionType,
                ipAddress,
                error: error.message,
            });
            // Retry with null userId and add context to action details
            return AuditLog_1.default.create({
                userId: null,
                actionType,
                ipAddress,
                userAgent,
                actionDetails: {
                    ...actionDetails,
                    originalUserId: userId,
                    fallbackReason: 'Foreign key constraint violation - user not found in voters table',
                },
            });
        }
        // Re-throw if it's not the specific foreign key error we're handling
        throw error;
    }
};
exports.createAuditLog = createAuditLog;
/**
 * Create an audit log entry for admin actions
 */
const createAdminAuditLog = async (adminId, actionType, ipAddress, userAgent, actionDetails) => {
    try {
        return await AuditLog_1.default.create({
            adminId,
            actionType,
            ipAddress,
            userAgent,
            actionDetails,
        });
    }
    catch (error) {
        // If we get a foreign key constraint error on admin_id, retry with null adminId
        if (error?.name === 'SequelizeForeignKeyConstraintError' &&
            error?.table === 'audit_logs' &&
            error?.constraint === 'fk_audit_logs_admin_id') {
            logger_1.logger.warn('Foreign key constraint violation on audit log admin_id, retrying with null adminId', {
                originalAdminId: adminId,
                actionType,
                ipAddress,
                error: error.message,
            });
            // Retry with null adminId and add context to action details
            return AuditLog_1.default.create({
                adminId: null,
                actionType,
                ipAddress,
                userAgent,
                actionDetails: {
                    ...actionDetails,
                    originalAdminId: adminId,
                    fallbackReason: 'Foreign key constraint violation - admin not found in admin_users table',
                },
            });
        }
        // Re-throw if it's not the specific foreign key error we're handling
        throw error;
    }
};
exports.createAdminAuditLog = createAdminAuditLog;
/**
 * Get audit logs with filtering and pagination
 */
const getAuditLogs = async (actionType, startDate, endDate, userId, page = 1, limit = 50) => {
    // Build filter conditions
    const whereConditions = {};
    if (actionType) {
        whereConditions.actionType = actionType;
    }
    if (userId) {
        whereConditions.userId = userId;
    }
    // Date range filter
    if (startDate || endDate) {
        whereConditions.actionTimestamp = {};
        if (startDate) {
            whereConditions.actionTimestamp[sequelize_1.Op.gte] = new Date(startDate);
        }
        if (endDate) {
            whereConditions.actionTimestamp[sequelize_1.Op.lte] = new Date(endDate);
        }
    }
    // Calculate pagination
    const offset = (page - 1) * limit;
    // Fetch audit logs with pagination
    const { count, rows: auditLogs } = await AuditLog_1.default.findAndCountAll({
        where: whereConditions,
        limit,
        offset,
        order: [['actionTimestamp', 'DESC']],
    });
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    return {
        auditLogs,
        pagination: {
            total: count,
            page,
            limit,
            totalPages,
        },
    };
};
exports.getAuditLogs = getAuditLogs;
/**
 * Get security logs with filtering and pagination
 */
const getSecurityLogs = async (severity, startDate, endDate, page = 1, limit = 50) => {
    // Build filter conditions
    const whereConditions = {
        isSuspicious: true, // Only get suspicious logs
    };
    // Map severity to custom logic if needed
    if (severity) {
        // This is a simplified example - in a real app, you might have a severity field
        // or determine severity based on other factors
        switch (severity) {
            case 'critical':
                whereConditions.actionType = {
                    [sequelize_1.Op.in]: ['password_reset', 'mfa_verify'],
                };
                break;
            case 'high':
                whereConditions.actionType = {
                    [sequelize_1.Op.in]: ['login', 'vote_cast'],
                };
                break;
            case 'medium':
                whereConditions.actionType = {
                    [sequelize_1.Op.in]: ['verification', 'profile_update'],
                };
                break;
            case 'low':
                whereConditions.actionType = {
                    [sequelize_1.Op.in]: ['election_view', 'logout'],
                };
                break;
        }
    }
    // Date range filter
    if (startDate || endDate) {
        whereConditions.actionTimestamp = {};
        if (startDate) {
            whereConditions.actionTimestamp[sequelize_1.Op.gte] = new Date(startDate);
        }
        if (endDate) {
            whereConditions.actionTimestamp[sequelize_1.Op.lte] = new Date(endDate);
        }
    }
    // Calculate pagination
    const offset = (page - 1) * limit;
    // Fetch security logs with pagination
    const { count, rows: securityLogs } = await AuditLog_1.default.findAndCountAll({
        where: whereConditions,
        limit,
        offset,
        order: [['actionTimestamp', 'DESC']],
    });
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    return {
        securityLogs,
        pagination: {
            total: count,
            page,
            limit,
            totalPages,
        },
    };
};
exports.getSecurityLogs = getSecurityLogs;
//# sourceMappingURL=auditService.js.map