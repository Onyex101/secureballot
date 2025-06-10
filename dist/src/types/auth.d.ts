export declare enum UserRole {
    SYSTEM_ADMIN = "SystemAdministrator",
    ELECTORAL_COMMISSIONER = "ElectoralCommissioner",
    SECURITY_OFFICER = "SecurityOfficer",
    SYSTEM_AUDITOR = "SystemAuditor",
    REGIONAL_OFFICER = "RegionalElectoralOfficer",
    ELECTION_MANAGER = "ElectionManager",
    RESULT_VERIFICATION_OFFICER = "ResultVerificationOfficer",
    POLLING_UNIT_OFFICER = "PollingUnitOfficer",
    VOTER_REGISTRATION_OFFICER = "VoterRegistrationOfficer",
    CANDIDATE_REGISTRATION_OFFICER = "CandidateRegistrationOfficer",
    OBSERVER = "Observer",
    VOTER = "Voter"
}
export declare enum Permission {
    MANAGE_USERS = "manage_users",
    MANAGE_ROLES = "manage_roles",
    MANAGE_SYSTEM_SETTINGS = "manage_system_settings",
    VIEW_AUDIT_LOGS = "view_audit_logs",
    GENERATE_REPORTS = "generate_reports",
    CREATE_ELECTION = "create_election",
    EDIT_ELECTION = "edit_election",
    DELETE_ELECTION = "delete_election",
    MANAGE_CANDIDATES = "manage_candidates",
    PUBLISH_RESULTS = "publish_results",
    REGISTER_VOTERS = "register_voters",
    VERIFY_VOTERS = "verify_voters",
    RESET_VOTER_PASSWORD = "reset_voter_password",
    MANAGE_POLLING_UNITS = "manage_polling_units",
    ASSIGN_OFFICERS = "assign_officers",
    MANAGE_SECURITY_SETTINGS = "manage_security_settings",
    MANAGE_ENCRYPTION_KEYS = "manage_encryption_keys",
    VIEW_SECURITY_LOGS = "view_security_logs",
    VIEW_RESULTS = "view_results",
    VERIFY_RESULTS = "verify_results",
    EXPORT_RESULTS = "export_results",
    CAST_VOTE = "cast_vote",
    VIEW_ELECTIONS = "view_elections"
}
export interface AuthenticatedUser {
    id: string;
    role: UserRole;
    permissions?: Permission[];
    region?: string;
}
