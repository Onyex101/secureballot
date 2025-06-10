"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = exports.UserRole = void 0;
// User roles
var UserRole;
(function (UserRole) {
    UserRole["SYSTEM_ADMIN"] = "SystemAdministrator";
    UserRole["ELECTORAL_COMMISSIONER"] = "ElectoralCommissioner";
    UserRole["SECURITY_OFFICER"] = "SecurityOfficer";
    UserRole["SYSTEM_AUDITOR"] = "SystemAuditor";
    UserRole["REGIONAL_OFFICER"] = "RegionalElectoralOfficer";
    UserRole["ELECTION_MANAGER"] = "ElectionManager";
    UserRole["RESULT_VERIFICATION_OFFICER"] = "ResultVerificationOfficer";
    UserRole["POLLING_UNIT_OFFICER"] = "PollingUnitOfficer";
    UserRole["VOTER_REGISTRATION_OFFICER"] = "VoterRegistrationOfficer";
    UserRole["CANDIDATE_REGISTRATION_OFFICER"] = "CandidateRegistrationOfficer";
    UserRole["OBSERVER"] = "Observer";
    UserRole["VOTER"] = "Voter";
})(UserRole = exports.UserRole || (exports.UserRole = {}));
// Permission constants
var Permission;
(function (Permission) {
    // System permissions
    Permission["MANAGE_USERS"] = "manage_users";
    Permission["MANAGE_ROLES"] = "manage_roles";
    Permission["MANAGE_SYSTEM_SETTINGS"] = "manage_system_settings";
    Permission["VIEW_AUDIT_LOGS"] = "view_audit_logs";
    Permission["GENERATE_REPORTS"] = "generate_reports";
    // Election permissions
    Permission["CREATE_ELECTION"] = "create_election";
    Permission["EDIT_ELECTION"] = "edit_election";
    Permission["DELETE_ELECTION"] = "delete_election";
    Permission["MANAGE_CANDIDATES"] = "manage_candidates";
    Permission["PUBLISH_RESULTS"] = "publish_results";
    // Voter permissions
    Permission["REGISTER_VOTERS"] = "register_voters";
    Permission["VERIFY_VOTERS"] = "verify_voters";
    Permission["RESET_VOTER_PASSWORD"] = "reset_voter_password";
    // Polling unit permissions
    Permission["MANAGE_POLLING_UNITS"] = "manage_polling_units";
    Permission["ASSIGN_OFFICERS"] = "assign_officers";
    // Security permissions
    Permission["MANAGE_SECURITY_SETTINGS"] = "manage_security_settings";
    Permission["MANAGE_ENCRYPTION_KEYS"] = "manage_encryption_keys";
    Permission["VIEW_SECURITY_LOGS"] = "view_security_logs";
    // Result permissions
    Permission["VIEW_RESULTS"] = "view_results";
    Permission["VERIFY_RESULTS"] = "verify_results";
    Permission["EXPORT_RESULTS"] = "export_results";
    // Voting permissions
    Permission["CAST_VOTE"] = "cast_vote";
    Permission["VIEW_ELECTIONS"] = "view_elections";
})(Permission = exports.Permission || (exports.Permission = {}));
//# sourceMappingURL=auth.js.map