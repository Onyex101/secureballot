"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecurityLogs = exports.getAuditLogs = exports.createAdminAuditLog = exports.createAuditLog = void 0;
const AuditLog_1 = __importDefault(require("../db/models/AuditLog"));
const sequelize_1 = require("sequelize");
/**
 * Create an audit log entry
 */
const createAuditLog = (userId, actionType, ipAddress, userAgent, actionDetails) => {
    return AuditLog_1.default.create({
        userId,
        actionType,
        ipAddress,
        userAgent,
        actionDetails,
    });
};
exports.createAuditLog = createAuditLog;
/**
 * Create an audit log entry for admin actions
 */
const createAdminAuditLog = (adminId, actionType, ipAddress, userAgent, actionDetails) => {
    return AuditLog_1.default.create({
        adminId,
        actionType,
        ipAddress,
        userAgent,
        actionDetails,
    });
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