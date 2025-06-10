"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditActionType = void 0;
const sequelize_1 = require("sequelize");
// Audit action types
var AuditActionType;
(function (AuditActionType) {
    AuditActionType["LOGIN"] = "login";
    AuditActionType["LOGOUT"] = "logout";
    AuditActionType["REGISTRATION"] = "registration";
    AuditActionType["VERIFICATION"] = "verification";
    AuditActionType["VERIFICATION_HISTORY_VIEW"] = "verification_history_view";
    AuditActionType["PASSWORD_RESET"] = "password_reset";
    AuditActionType["PASSWORD_CHANGE"] = "password_change";
    AuditActionType["VOTE_CAST"] = "vote_cast";
    AuditActionType["MOBILE_VOTE_CAST"] = "mobile_vote_cast";
    AuditActionType["VOTE_RECEIPT_VIEW"] = "vote_receipt_view";
    AuditActionType["PROFILE_UPDATE"] = "profile_update";
    AuditActionType["ELECTION_VIEW"] = "election_view";
    AuditActionType["MFA_SETUP"] = "mfa_setup";
    AuditActionType["MFA_VERIFY"] = "mfa_verify";
    AuditActionType["USSD_SESSION"] = "ussd_session";
    AuditActionType["USSD_SESSION_START"] = "ussd_session_start";
    AuditActionType["USSD_SESSION_END"] = "ussd_session_end";
    AuditActionType["USSD_MENU_NAVIGATION"] = "ussd_menu_navigation";
    AuditActionType["TOKEN_REFRESH"] = "token_refresh";
    AuditActionType["MFA_ENABLED"] = "mfa_enabled";
    AuditActionType["MFA_DISABLED"] = "mfa_disabled";
    AuditActionType["BACKUP_CODES_GENERATED"] = "backup_codes_generated";
    AuditActionType["BACKUP_CODE_VERIFY"] = "backup_code_verify";
    AuditActionType["ADMIN_LOGIN"] = "admin_login";
    AuditActionType["ADMIN_USER_LIST_VIEW"] = "admin_user_list_view";
    AuditActionType["ADMIN_USER_CREATE"] = "admin_user_create";
    AuditActionType["REGION_POLLING_UNITS_VIEW"] = "region_polling_units_view";
    AuditActionType["POLLING_UNIT_CREATE"] = "polling_unit_create";
    AuditActionType["POLLING_UNIT_UPDATE"] = "polling_unit_update";
    AuditActionType["REGION_STATS_VIEW"] = "region_statistics_view";
    AuditActionType["ELECTION_CREATE"] = "election_create";
    AuditActionType["ELECTION_KEY_GENERATE"] = "election_key_generate";
    AuditActionType["RESULT_PUBLISH"] = "result_publish";
    AuditActionType["RESULT_VERIFICATION"] = "result_verification";
    AuditActionType["SECURITY_LOG_VIEW"] = "security_log_view";
    AuditActionType["AUDIT_LOG_VIEW"] = "audit_log_view";
    AuditActionType["CANDIDATE_LIST_VIEW"] = "candidate_list_view";
    AuditActionType["CANDIDATE_VIEW"] = "candidate_view";
    AuditActionType["CANDIDATE_CREATE"] = "candidate_create";
    AuditActionType["CANDIDATE_UPDATE"] = "candidate_update";
    AuditActionType["CANDIDATE_DELETE"] = "candidate_delete";
    AuditActionType["VOTE_VERIFY"] = "vote_verify";
    AuditActionType["VOTE_HISTORY_VIEW"] = "vote_history_view";
    AuditActionType["VOTE_ISSUE_REPORT"] = "vote_issue_report";
    AuditActionType["VOTE_STATUS_CHECK"] = "vote_status_check";
    AuditActionType["OFFLINE_PACKAGE_GENERATE"] = "offline_package_generate";
    AuditActionType["OFFLINE_VOTE_SUBMIT"] = "offline_vote_submit";
    AuditActionType["OFFLINE_VOTE_VERIFY"] = "offline_vote_verify";
    AuditActionType["MOBILE_LOGIN"] = "mobile_login";
    AuditActionType["DEVICE_VERIFY"] = "device_verify";
    AuditActionType["MOBILE_NEARBY_PU_SEARCH"] = "mobile_nearby_pu_search";
    AuditActionType["USER_ASSIGNED_PU_VIEW"] = "user_assigned_pu_view";
    AuditActionType["MOBILE_DATA_SYNC"] = "mobile_data_sync";
    AuditActionType["MOBILE_SYNC_ELECTION_DETAILS"] = "mobile_sync_election_details";
    AuditActionType["MOBILE_SYNC_OFFLINE_VOTES"] = "mobile_sync_offline_votes";
    AuditActionType["RESULTS_VIEW_LIVE"] = "results_view_live";
    AuditActionType["RESULTS_VIEW_REGION"] = "results_view_region";
    AuditActionType["RESULTS_VIEW_STATS"] = "results_view_stats";
    AuditActionType["ELECTION_RESULTS_VIEW"] = "election_results_view";
    AuditActionType["REAL_TIME_STATS_VIEW"] = "real_time_stats_view";
    AuditActionType["ELECTION_STATISTICS_VIEW"] = "election_statistics_view";
    AuditActionType["REAL_TIME_UPDATES_VIEW"] = "real_time_updates_view";
    AuditActionType["VOTER_ELIGIBILITY_CHECK"] = "voter_eligibility_check";
    AuditActionType["VOTER_VERIFICATION_REQUEST"] = "voter_verification_request";
})(AuditActionType = exports.AuditActionType || (exports.AuditActionType = {}));
class AuditLog extends sequelize_1.Model {
    id;
    userId;
    adminId;
    actionType;
    actionTimestamp;
    ipAddress;
    userAgent;
    actionDetails;
    isSuspicious;
    createdAt;
    updatedAt;
    // Timestamps
    static createdAt = 'createdAt';
    static updatedAt = 'updatedAt';
    // Model associations
    static associate(models) {
        AuditLog.belongsTo(models.Voter, {
            foreignKey: 'user_id',
            as: 'voter',
            constraints: false,
        });
        AuditLog.belongsTo(models.AdminUser, {
            foreignKey: 'admin_id',
            as: 'admin',
            constraints: false,
        });
    }
    static initialize(sequelize) {
        return AuditLog.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                field: 'user_id',
                allowNull: true,
                validate: {
                    isUUID: {
                        msg: 'Invalid UUID format for user_id',
                        args: 4,
                    },
                },
            },
            adminId: {
                type: sequelize_1.DataTypes.UUID,
                field: 'admin_id',
                allowNull: true,
                validate: {
                    isUUID: {
                        msg: 'Invalid UUID format for admin_id',
                        args: 4,
                    },
                },
            },
            actionType: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                field: 'action_type',
                validate: {
                    notEmpty: true,
                },
            },
            actionTimestamp: {
                type: sequelize_1.DataTypes.DATE,
                field: 'action_timestamp',
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                field: 'ip_address',
                validate: {
                    notEmpty: true,
                },
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                field: 'user_agent',
                validate: {
                    notEmpty: true,
                },
            },
            actionDetails: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
                field: 'action_details',
            },
            isSuspicious: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'is_suspicious',
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'created_at',
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                field: 'updated_at',
            },
        }, {
            sequelize,
            modelName: 'AuditLog',
            tableName: 'audit_logs',
            underscored: true,
            timestamps: true,
            indexes: [
                { fields: ['user_id'] },
                { fields: ['action_type'] },
                { fields: ['action_timestamp'] },
                { fields: ['ip_address'] },
                { fields: ['is_suspicious'] },
            ],
        });
    }
}
exports.default = AuditLog;
//# sourceMappingURL=AuditLog.js.map