-- Drop tables for SecureBallot application in the correct order to avoid foreign key constraint issues

-- Drop indexes first
DROP INDEX IF EXISTS idx_voters_phone_number;
DROP INDEX IF EXISTS idx_elections_type;
DROP INDEX IF EXISTS idx_elections_dates;
DROP INDEX IF EXISTS idx_elections_status;
DROP INDEX IF EXISTS idx_elections_is_active;
DROP INDEX IF EXISTS idx_candidates_election_id;
DROP INDEX IF EXISTS idx_candidates_party_code;
DROP INDEX IF EXISTS idx_candidates_status;
DROP INDEX IF EXISTS idx_candidates_is_active;
DROP INDEX IF EXISTS idx_votes_election_id;
DROP INDEX IF EXISTS idx_votes_candidate_id;
DROP INDEX IF EXISTS idx_votes_polling_unit_id;
DROP INDEX IF EXISTS idx_votes_timestamp;
DROP INDEX IF EXISTS idx_votes_source;
DROP INDEX IF EXISTS idx_votes_is_counted;
DROP INDEX IF EXISTS idx_polling_units_location;
DROP INDEX IF EXISTS idx_polling_units_assigned_officer;
DROP INDEX IF EXISTS idx_polling_units_is_active;
DROP INDEX IF EXISTS idx_voter_cards_location;
DROP INDEX IF EXISTS idx_admin_users_admin_type;
DROP INDEX IF EXISTS idx_admin_users_is_active;
DROP INDEX IF EXISTS idx_ussd_sessions_phone_number;
DROP INDEX IF EXISTS idx_ussd_sessions_is_active;

-- Add missing audit log index drops
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_action_type;
DROP INDEX IF EXISTS idx_audit_logs_action_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_ip_address;
DROP INDEX IF EXISTS idx_audit_logs_is_suspicious;

-- Drop tables in reverse order of creation (child tables first, then parent tables)
DROP TABLE IF EXISTS observer_reports;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS ussd_votes;
DROP TABLE IF EXISTS ussd_sessions;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS election_stats;
DROP TABLE IF EXISTS elections;
DROP TABLE IF EXISTS verification_statuses;
DROP TABLE IF EXISTS voter_cards;
DROP TABLE IF EXISTS polling_units;
DROP TABLE IF EXISTS failed_attempts;
DROP TABLE IF EXISTS voters;
DROP TABLE IF EXISTS admin_logs;
DROP TABLE IF EXISTS admin_permissions;
DROP TABLE IF EXISTS admin_roles;
DROP TABLE IF EXISTS admin_users; 