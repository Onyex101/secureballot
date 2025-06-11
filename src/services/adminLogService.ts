import AdminLog from '../db/models/AdminLog';
import { logger } from '../config/logger';

/**
 * Create an admin log entry
 * Used specifically for admin actions and should be used instead of audit logs for admin routes
 */
export const createAdminLog = async (
  adminId: string | null,
  action: string,
  resourceType: string,
  resourceId?: string | null,
  details?: any,
  ipAddress?: string,
  userAgent?: string,
) => {
  try {
    return await AdminLog.create({
      adminId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    // Log the error but don't fail the main operation
    logger.error('Failed to create admin log entry', {
      adminId,
      action,
      resourceType,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get admin logs with filtering and pagination
 */
export const getAdminLogs = async (
  adminId?: string,
  action?: string,
  resourceType?: string,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  limit: number = 50,
) => {
  // Build filter conditions
  const whereConditions: any = {};

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
  const { count, rows: adminLogs } = await AdminLog.findAndCountAll({
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

/**
 * Common admin actions for consistent logging
 */
export const AdminAction = {
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
  RESULT_PUBLISH: 'result_publish', // Legacy support
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
} as const;

/**
 * Resource types for consistent categorization
 */
export const ResourceType = {
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
} as const;
