import { Model, Sequelize, Optional } from 'sequelize';
export declare enum AuditActionType {
    LOGIN = "login",
    LOGOUT = "logout",
    REGISTRATION = "registration",
    VERIFICATION = "verification",
    VERIFICATION_HISTORY_VIEW = "verification_history_view",
    PASSWORD_RESET = "password_reset",
    PASSWORD_CHANGE = "password_change",
    VOTE_CAST = "vote_cast",
    MOBILE_VOTE_CAST = "mobile_vote_cast",
    VOTE_RECEIPT_VIEW = "vote_receipt_view",
    PROFILE_UPDATE = "profile_update",
    ELECTION_VIEW = "election_view",
    MFA_SETUP = "mfa_setup",
    MFA_VERIFY = "mfa_verify",
    USSD_SESSION = "ussd_session",
    USSD_SESSION_START = "ussd_session_start",
    USSD_SESSION_END = "ussd_session_end",
    USSD_MENU_NAVIGATION = "ussd_menu_navigation",
    TOKEN_REFRESH = "token_refresh",
    MFA_ENABLED = "mfa_enabled",
    MFA_DISABLED = "mfa_disabled",
    BACKUP_CODES_GENERATED = "backup_codes_generated",
    BACKUP_CODE_VERIFY = "backup_code_verify",
    ADMIN_LOGIN = "admin_login",
    ADMIN_USER_LIST_VIEW = "admin_user_list_view",
    ADMIN_USER_CREATE = "admin_user_create",
    REGION_POLLING_UNITS_VIEW = "region_polling_units_view",
    POLLING_UNIT_CREATE = "polling_unit_create",
    POLLING_UNIT_UPDATE = "polling_unit_update",
    REGION_STATS_VIEW = "region_statistics_view",
    ELECTION_CREATE = "election_create",
    ELECTION_KEY_GENERATE = "election_key_generate",
    RESULT_PUBLISH = "result_publish",
    RESULT_VERIFICATION = "result_verification",
    SECURITY_LOG_VIEW = "security_log_view",
    AUDIT_LOG_VIEW = "audit_log_view",
    CANDIDATE_LIST_VIEW = "candidate_list_view",
    CANDIDATE_VIEW = "candidate_view",
    CANDIDATE_CREATE = "candidate_create",
    CANDIDATE_UPDATE = "candidate_update",
    CANDIDATE_DELETE = "candidate_delete",
    VOTE_VERIFY = "vote_verify",
    VOTE_HISTORY_VIEW = "vote_history_view",
    VOTE_ISSUE_REPORT = "vote_issue_report",
    VOTE_STATUS_CHECK = "vote_status_check",
    OFFLINE_PACKAGE_GENERATE = "offline_package_generate",
    OFFLINE_VOTE_SUBMIT = "offline_vote_submit",
    OFFLINE_VOTE_VERIFY = "offline_vote_verify",
    MOBILE_LOGIN = "mobile_login",
    DEVICE_VERIFY = "device_verify",
    MOBILE_NEARBY_PU_SEARCH = "mobile_nearby_pu_search",
    USER_ASSIGNED_PU_VIEW = "user_assigned_pu_view",
    MOBILE_DATA_SYNC = "mobile_data_sync",
    MOBILE_SYNC_ELECTION_DETAILS = "mobile_sync_election_details",
    MOBILE_SYNC_OFFLINE_VOTES = "mobile_sync_offline_votes",
    RESULTS_VIEW_LIVE = "results_view_live",
    RESULTS_VIEW_REGION = "results_view_region",
    RESULTS_VIEW_STATS = "results_view_stats",
    ELECTION_RESULTS_VIEW = "election_results_view",
    REAL_TIME_STATS_VIEW = "real_time_stats_view",
    ELECTION_STATISTICS_VIEW = "election_statistics_view",
    REAL_TIME_UPDATES_VIEW = "real_time_updates_view",
    VOTER_ELIGIBILITY_CHECK = "voter_eligibility_check",
    VOTER_VERIFICATION_REQUEST = "voter_verification_request",
    DASHBOARD_VIEW = "dashboard_view",
    SUSPICIOUS_ACTIVITY_VIEW = "suspicious_activity_view",
    SUSPICIOUS_ACTIVITY_INVESTIGATE = "suspicious_activity_investigate",
    SUSPICIOUS_ACTIVITY_MARK_FALSE_POSITIVE = "suspicious_activity_mark_false_positive",
    SYSTEM_STATISTICS_VIEW = "system_statistics_view",
    ADMIN_USERS_OVERVIEW = "admin_users_overview",
    POLLING_UNITS_OVERVIEW = "polling_units_overview",
    VERIFICATION_REQUESTS_VIEW = "verification_requests_view",
    VERIFICATION_REQUEST_APPROVE = "verification_request_approve",
    VERIFICATION_REQUEST_REJECT = "verification_request_reject"
}
interface AuditLogAttributes {
    id: string;
    userId: string | null;
    adminId: string | null;
    actionType: string;
    actionTimestamp: Date;
    ipAddress: string;
    userAgent: string;
    actionDetails: any | null;
    isSuspicious: boolean;
    createdAt: Date;
    updatedAt: Date;
}
interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'actionTimestamp' | 'actionDetails' | 'isSuspicious' | 'createdAt' | 'updatedAt'> {
}
declare class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
    id: string;
    userId: string | null;
    adminId: string | null;
    actionType: string;
    actionTimestamp: Date;
    ipAddress: string;
    userAgent: string;
    actionDetails: any | null;
    isSuspicious: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    static readonly createdAt = "createdAt";
    static readonly updatedAt = "updatedAt";
    static associate(models: any): void;
    static initialize(sequelize: Sequelize): typeof AuditLog;
}
export default AuditLog;
