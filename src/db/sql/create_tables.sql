-- Create extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables for SecureBallot application

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone_number VARCHAR(15) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  admin_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login TIMESTAMP,
  created_by UUID,
  recovery_token VARCHAR(255),
  recovery_token_expiry TIMESTAMP,
  mfa_secret VARCHAR(255),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_backup_codes TEXT[],
  CONSTRAINT fk_admin_users_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  role_name VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_admin_roles_admin_id FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  permission_name VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  actions JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_admin_permissions_admin_id FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_admin_logs_admin_id FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create voters table
CREATE TABLE IF NOT EXISTS voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nin VARCHAR(11) NOT NULL UNIQUE,
  vin VARCHAR(19) NOT NULL UNIQUE,
  phone_number VARCHAR(15) NOT NULL,
  date_of_birth DATE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  recovery_token VARCHAR(255),
  recovery_token_expiry TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  mfa_secret VARCHAR(255),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_backup_codes TEXT[]
);

-- Create failed_attempts table
CREATE TABLE IF NOT EXISTS failed_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  attempt_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  attempt_time TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_failed_attempts_user_id FOREIGN KEY (user_id) REFERENCES voters(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create polling_units table
CREATE TABLE IF NOT EXISTS polling_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polling_unit_code VARCHAR(50) NOT NULL UNIQUE,
  polling_unit_name VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  ward VARCHAR(100) NOT NULL,
  geolocation JSONB,
  address VARCHAR(255),
  registered_voters INTEGER NOT NULL DEFAULT 0,
  assigned_officer UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_polling_units_assigned_officer FOREIGN KEY (assigned_officer) REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create voter_cards table
CREATE TABLE IF NOT EXISTS voter_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  vin VARCHAR(19) NOT NULL UNIQUE,
  polling_unit_code VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  ward VARCHAR(100) NOT NULL,
  issued_date TIMESTAMP NOT NULL DEFAULT NOW(),
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_voter_cards_user_id FOREIGN KEY (user_id) REFERENCES voters(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_voter_cards_polling_unit_code FOREIGN KEY (polling_unit_code) REFERENCES polling_units(polling_unit_code) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create verification_statuses table
CREATE TABLE IF NOT EXISTS verification_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_address_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_biometric_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_level INTEGER NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_verification_statuses_user_id FOREIGN KEY (user_id) REFERENCES voters(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create elections table
CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_name VARCHAR(100) NOT NULL,
  election_type VARCHAR(50) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  eligibility_rules JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_elections_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create election_stats table
CREATE TABLE IF NOT EXISTS election_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL UNIQUE,
  total_votes INTEGER NOT NULL DEFAULT 0,
  valid_votes INTEGER NOT NULL DEFAULT 0,
  invalid_votes INTEGER NOT NULL DEFAULT 0,
  turnout_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_election_stats_election_id FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  party_code VARCHAR(50) NOT NULL,
  party_name VARCHAR(100) NOT NULL,
  bio TEXT,
  photo_url TEXT,
  position VARCHAR(100),
  manifesto TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_candidates_election_id FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uk_candidates_election_party UNIQUE (election_id, party_code)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  election_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  polling_unit_id UUID NOT NULL,
  encrypted_vote_data BYTEA NOT NULL,
  vote_hash VARCHAR(255) NOT NULL,
  vote_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  vote_source VARCHAR(50) NOT NULL,
  is_counted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_votes_user_id FOREIGN KEY (user_id) REFERENCES voters(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_votes_election_id FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_votes_candidate_id FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_votes_polling_unit_id FOREIGN KEY (polling_unit_id) REFERENCES polling_units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uk_votes_user_election UNIQUE (user_id, election_id)
);

-- Create ussd_sessions table
CREATE TABLE IF NOT EXISTS ussd_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL UNIQUE,
  user_id UUID,
  phone_number VARCHAR(15) NOT NULL,
  session_data JSONB,
  current_state VARCHAR(50) NOT NULL,
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  last_access_time TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ussd_sessions_user_id FOREIGN KEY (user_id) REFERENCES voters(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create ussd_votes table
CREATE TABLE IF NOT EXISTS ussd_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL,
  election_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  vote_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmation_code VARCHAR(10) NOT NULL,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ussd_votes_session_id FOREIGN KEY (session_id) REFERENCES ussd_sessions(session_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ussd_votes_user_id FOREIGN KEY (user_id) REFERENCES voters(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ussd_votes_election_id FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ussd_votes_candidate_id FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create audit_logs table (updated to match AuditLog model)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type VARCHAR(50) NOT NULL,
  action_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NOT NULL,
  action_details JSONB,
  is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES voters(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create observer_reports table
CREATE TABLE IF NOT EXISTS observer_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_id UUID NOT NULL,
  election_id UUID NOT NULL,
  polling_unit_id UUID NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  report_content TEXT NOT NULL,
  attachments JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  review_notes TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_observer_reports_observer_id FOREIGN KEY (observer_id) REFERENCES admin_users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_observer_reports_election_id FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_observer_reports_polling_unit_id FOREIGN KEY (polling_unit_id) REFERENCES polling_units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_observer_reports_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_voters_phone_number ON voters(phone_number);
CREATE INDEX idx_elections_type ON elections(election_type);
CREATE INDEX idx_elections_dates ON elections(start_date, end_date);
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_elections_is_active ON elections(is_active);
CREATE INDEX idx_candidates_election_id ON candidates(election_id);
CREATE INDEX idx_candidates_party_code ON candidates(party_code);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_is_active ON candidates(is_active);
CREATE INDEX idx_votes_election_id ON votes(election_id);
CREATE INDEX idx_votes_candidate_id ON votes(candidate_id);
CREATE INDEX idx_votes_polling_unit_id ON votes(polling_unit_id);
CREATE INDEX idx_votes_timestamp ON votes(vote_timestamp);
CREATE INDEX idx_votes_source ON votes(vote_source);
CREATE INDEX idx_votes_is_counted ON votes(is_counted);
CREATE INDEX idx_polling_units_location ON polling_units(state, lga, ward);
CREATE INDEX idx_polling_units_assigned_officer ON polling_units(assigned_officer);
CREATE INDEX idx_polling_units_is_active ON polling_units(is_active);
CREATE INDEX idx_voter_cards_location ON voter_cards(state, lga, ward);
CREATE INDEX idx_admin_users_admin_type ON admin_users(admin_type);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX idx_ussd_sessions_phone_number ON ussd_sessions(phone_number);
CREATE INDEX idx_ussd_sessions_is_active ON ussd_sessions(is_active);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_action_timestamp ON audit_logs(action_timestamp);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_is_suspicious ON audit_logs(is_suspicious); 