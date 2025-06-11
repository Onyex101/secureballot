import AdminLog from '../db/models/AdminLog';
/**
 * Create an admin log entry
 * Used specifically for admin actions and should be used instead of audit logs for admin routes
 */
export declare const createAdminLog: (adminId: string | null, action: string, resourceType: string, resourceId?: string | null, details?: any, ipAddress?: string, userAgent?: string) => Promise<AdminLog>;
/**
 * Get admin logs with filtering and pagination
 */
export declare const getAdminLogs: (adminId?: string, action?: string, resourceType?: string, startDate?: string, endDate?: string, page?: number, limit?: number) => Promise<{
    adminLogs: AdminLog[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
/**
 * Common admin actions for consistent logging
 */
export declare const AdminAction: {
    readonly DASHBOARD_VIEW: "dashboard_view";
    readonly SYSTEM_STATS_VIEW: "system_stats_view";
    readonly ADMIN_USER_CREATE: "admin_user_create";
    readonly ADMIN_USER_UPDATE: "admin_user_update";
    readonly ADMIN_USER_DELETE: "admin_user_delete";
    readonly ADMIN_USER_LIST_VIEW: "admin_user_list_view";
    readonly ADMIN_USER_DETAIL_VIEW: "admin_user_detail_view";
    readonly ADMIN_USER_LOGIN: "admin_user_login";
    readonly ELECTION_CREATE: "election_create";
    readonly ELECTION_UPDATE: "election_update";
    readonly ELECTION_DELETE: "election_delete";
    readonly ELECTION_ACTIVATE: "election_activate";
    readonly ELECTION_DEACTIVATE: "election_deactivate";
    readonly ELECTION_LIST_VIEW: "election_list_view";
    readonly ELECTION_DETAIL_VIEW: "election_detail_view";
    readonly ELECTION_KEY_GENERATE: "election_key_generate";
    readonly CANDIDATE_CREATE: "candidate_create";
    readonly CANDIDATE_UPDATE: "candidate_update";
    readonly CANDIDATE_DELETE: "candidate_delete";
    readonly CANDIDATE_APPROVE: "candidate_approve";
    readonly CANDIDATE_REJECT: "candidate_reject";
    readonly CANDIDATE_LIST_VIEW: "candidate_list_view";
    readonly CANDIDATE_DETAIL_VIEW: "candidate_detail_view";
    readonly POLLING_UNIT_CREATE: "polling_unit_create";
    readonly POLLING_UNIT_UPDATE: "polling_unit_update";
    readonly POLLING_UNIT_DELETE: "polling_unit_delete";
    readonly POLLING_UNIT_ASSIGN: "polling_unit_assign";
    readonly POLLING_UNIT_LIST_VIEW: "polling_unit_list_view";
    readonly RESULTS_VIEW: "results_view";
    readonly RESULTS_PUBLISH: "results_publish";
    readonly RESULT_PUBLISH: "result_publish";
    readonly RESULTS_VERIFY: "results_verify";
    readonly AUDIT_LOG_VIEW: "audit_log_view";
    readonly VOTER_VERIFICATION_APPROVE: "voter_verification_approve";
    readonly VOTER_VERIFICATION_REJECT: "voter_verification_reject";
    readonly SUSPICIOUS_ACTIVITY_INVESTIGATE: "suspicious_activity_investigate";
    readonly SUSPICIOUS_ACTIVITY_MARK_FALSE_POSITIVE: "suspicious_activity_mark_false_positive";
    readonly SECURITY_LOG_VIEW: "security_log_view";
    readonly SYSTEM_CONFIG_UPDATE: "system_config_update";
    readonly BACKUP_CREATE: "backup_create";
    readonly BACKUP_RESTORE: "backup_restore";
};
/**
 * Resource types for consistent categorization
 */
export declare const ResourceType: {
    readonly ADMIN_USER: "admin_user";
    readonly VOTER: "voter";
    readonly ELECTION: "election";
    readonly CANDIDATE: "candidate";
    readonly POLLING_UNIT: "polling_unit";
    readonly VOTE: "vote";
    readonly VERIFICATION_REQUEST: "verification_request";
    readonly AUDIT_LOG: "audit_log";
    readonly SYSTEM: "system";
    readonly DASHBOARD: "dashboard";
    readonly SECURITY_DASHBOARD: "security_dashboard";
    readonly SECURITY_LOG: "security_log";
};
