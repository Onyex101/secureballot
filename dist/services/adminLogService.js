"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceType = exports.AdminAction = exports.getAdminLogs = exports.createAdminLog = void 0;
const AdminLog_1 = __importDefault(require("../db/models/AdminLog"));
const logger_1 = require("../config/logger");
/**
 * Create an admin log entry
 * Used specifically for admin actions and should be used instead of audit logs for admin routes
 */
const createAdminLog = async (adminId, action, resourceType, resourceId, details, ipAddress, userAgent) => {
    try {
        return await AdminLog_1.default.create({
            adminId,
            action,
            resourceType,
            resourceId,
            details,
            ipAddress,
            userAgent,
        });
    }
    catch (error) {
        // Log the error but don't fail the main operation
        logger_1.logger.error('Failed to create admin log entry', {
            adminId,
            action,
            resourceType,
            error: error.message,
        });
        throw error;
    }
};
exports.createAdminLog = createAdminLog;
/**
 * Get admin logs with filtering and pagination
 */
const getAdminLogs = async (adminId, action, resourceType, startDate, endDate, page = 1, limit = 50) => {
    // Build filter conditions
    const whereConditions = {};
    if (adminId) {
        whereConditions.adminId = adminId;
    }
    if (action) {
        whereConditions.action = action;
    }
    if (resourceType) {
        whereConditions.resourceType = resourceType;
    }
    // Date range filter
    if (startDate || endDate) {
        whereConditions.createdAt = {};
        if (startDate) {
            whereConditions.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
            whereConditions.createdAt.lte = new Date(endDate);
        }
    }
    // Calculate pagination
    const offset = (page - 1) * limit;
    // Fetch admin logs with pagination
    const { count, rows: adminLogs } = await AdminLog_1.default.findAndCountAll({
        where: whereConditions,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
            {
                association: 'admin',
                attributes: ['id', 'fullName', 'email', 'adminType'],
            },
        ],
    });
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    return {
        adminLogs,
        pagination: {
            total: count,
            page,
            limit,
            totalPages,
        },
    };
};
exports.getAdminLogs = getAdminLogs;
/**
 * Common admin actions for consistent logging
 */
exports.AdminAction = {
    // Dashboard and overview actions
    DASHBOARD_VIEW: 'dashboard_view',
    SYSTEM_STATS_VIEW: 'system_stats_view',
    // User management
    ADMIN_USER_CREATE: 'admin_user_create',
    ADMIN_USER_UPDATE: 'admin_user_update',
    ADMIN_USER_DELETE: 'admin_user_delete',
    ADMIN_USER_LIST_VIEW: 'admin_user_list_view',
    ADMIN_USER_DETAIL_VIEW: 'admin_user_detail_view',
    ADMIN_USER_LOGIN: 'admin_user_login',
    // Election management
    ELECTION_CREATE: 'election_create',
    ELECTION_UPDATE: 'election_update',
    ELECTION_DELETE: 'election_delete',
    ELECTION_ACTIVATE: 'election_activate',
    ELECTION_DEACTIVATE: 'election_deactivate',
    ELECTION_LIST_VIEW: 'election_list_view',
    ELECTION_DETAIL_VIEW: 'election_detail_view',
    ELECTION_KEY_GENERATE: 'election_key_generate',
    // Candidate management
    CANDIDATE_CREATE: 'candidate_create',
    CANDIDATE_UPDATE: 'candidate_update',
    CANDIDATE_DELETE: 'candidate_delete',
    CANDIDATE_APPROVE: 'candidate_approve',
    CANDIDATE_REJECT: 'candidate_reject',
    CANDIDATE_LIST_VIEW: 'candidate_list_view',
    CANDIDATE_DETAIL_VIEW: 'candidate_detail_view',
    // Polling unit management
    POLLING_UNIT_CREATE: 'polling_unit_create',
    POLLING_UNIT_UPDATE: 'polling_unit_update',
    POLLING_UNIT_DELETE: 'polling_unit_delete',
    POLLING_UNIT_ASSIGN: 'polling_unit_assign',
    POLLING_UNIT_LIST_VIEW: 'polling_unit_list_view',
    // Results and verification
    RESULTS_VIEW: 'results_view',
    RESULTS_PUBLISH: 'results_publish',
    RESULT_PUBLISH: 'result_publish',
    RESULTS_VERIFY: 'results_verify',
    AUDIT_LOG_VIEW: 'audit_log_view',
    // Security and verification
    VOTER_VERIFICATION_APPROVE: 'voter_verification_approve',
    VOTER_VERIFICATION_REJECT: 'voter_verification_reject',
    SUSPICIOUS_ACTIVITY_INVESTIGATE: 'suspicious_activity_investigate',
    SUSPICIOUS_ACTIVITY_MARK_FALSE_POSITIVE: 'suspicious_activity_mark_false_positive',
    SECURITY_LOG_VIEW: 'security_log_view',
    // System administration
    SYSTEM_CONFIG_UPDATE: 'system_config_update',
    BACKUP_CREATE: 'backup_create',
    BACKUP_RESTORE: 'backup_restore',
};
/**
 * Resource types for consistent categorization
 */
exports.ResourceType = {
    ADMIN_USER: 'admin_user',
    VOTER: 'voter',
    ELECTION: 'election',
    CANDIDATE: 'candidate',
    POLLING_UNIT: 'polling_unit',
    VOTE: 'vote',
    VERIFICATION_REQUEST: 'verification_request',
    AUDIT_LOG: 'audit_log',
    SYSTEM: 'system',
    DASHBOARD: 'dashboard',
    SECURITY_DASHBOARD: 'security_dashboard',
    SECURITY_LOG: 'security_log',
};
//# sourceMappingURL=adminLogService.js.map