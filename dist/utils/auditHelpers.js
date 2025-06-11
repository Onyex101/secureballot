"use strict";
/**
 * Utility functions for audit logging
 */
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
exports.createAdminLog = exports.createContextualAuditLog = exports.getUserIdFromRequest = exports.getSafeUserIdForAudit = void 0;
const services_1 = require("../services");
const adminLogService = __importStar(require("../services/adminLogService"));
/**
 * Safely get user ID for audit logging
 * Returns null if userId is not a valid UUID to avoid validation errors
 * @param userId - The user ID to validate
 * @returns Valid UUID string or null
 */
const getSafeUserIdForAudit = (userId) => {
    if (!userId) {
        return null;
    }
    // Check if it's a valid UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(userId)) {
        return userId;
    }
    // If not a valid UUID, return null to avoid validation errors
    return null;
};
exports.getSafeUserIdForAudit = getSafeUserIdForAudit;
/**
 * Get user ID from request for audit logging
 * Safely handles both authenticated and unauthenticated requests
 * @param req - Express request object with optional user
 * @returns Valid UUID string or null
 */
const getUserIdFromRequest = (req) => {
    return (0, exports.getSafeUserIdForAudit)(req.user?.id);
};
exports.getUserIdFromRequest = getUserIdFromRequest;
/**
 * Create audit log entry that automatically detects admin vs voter user
 * Uses the appropriate audit service function based on user type
 * @param req - Express request object with authentication info
 * @param actionType - Type of action being logged
 * @param actionDetails - Additional details about the action
 * @param isSuspicious - Whether this action is suspicious (optional)
 * @returns Promise that resolves when audit log is created
 */
const createContextualAuditLog = (req, actionType, actionDetails, isSuspicious) => {
    const ipAddress = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const userId = req.user?.id;
    // If user type is admin, use admin audit logging
    if (req.userType === 'admin') {
        return services_1.auditService.createAdminAuditLog((0, exports.getSafeUserIdForAudit)(userId), actionType, ipAddress, userAgent, {
            ...actionDetails,
            userType: 'admin',
            ...(isSuspicious !== undefined && { isSuspicious }),
        });
    }
    // For voters or unknown user types, use regular audit logging
    return services_1.auditService.createAuditLog((0, exports.getSafeUserIdForAudit)(userId), actionType, ipAddress, userAgent, {
        ...actionDetails,
        userType: req.userType || 'unknown',
        ...(isSuspicious !== undefined && { isSuspicious }),
    });
};
exports.createContextualAuditLog = createContextualAuditLog;
/**
 * Create admin log entry for admin-specific actions
 * This should be used for all admin routes instead of audit logs
 * @param req - Express request object with authentication info
 * @param action - Admin action being performed
 * @param resourceType - Type of resource being acted upon
 * @param resourceId - ID of the specific resource (optional)
 * @param details - Additional details about the action
 * @returns Promise that resolves when admin log is created
 */
const createAdminLog = (req, action, resourceType, resourceId, details) => {
    const ipAddress = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const adminId = (0, exports.getSafeUserIdForAudit)(req.user?.id);
    return adminLogService.createAdminLog(adminId, action, resourceType, resourceId, details, ipAddress, userAgent);
};
exports.createAdminLog = createAdminLog;
//# sourceMappingURL=auditHelpers.js.map