-- Create extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables for SecureBallot application

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fullName VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phoneNumber VARCHAR(15) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  adminType VARCHAR(50) NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  lastLogin TIMESTAMP,
  createdBy UUID,
  recoveryToken VARCHAR(255),
  recoveryTokenExpiry TIMESTAMP,
  CONSTRAINT fk_admin_users_created_by FOREIGN KEY (createdBy) REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adminId UUID NOT NULL,
  roleName VARCHAR(50) NOT NULL,
  description TEXT,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_admin_roles_admin_id FOREIGN KEY (adminId) REFERENCES admin_users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adminId UUID NOT NULL,
  permissionName VARCHAR(100) NOT NULL,
  resourceType VARCHAR(50) NOT NULL,
  resourceId VARCHAR(255),
  actions JSONB NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_admin_permissions_admin_id FOREIGN KEY (adminId) REFERENCES admin_users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adminId UUID,
  action VARCHAR(100) NOT NULL,
  resourceType VARCHAR(50) NOT NULL,
  resourceId VARCHAR(255),
  details JSONB,
  ipAddress VARCHAR(50),
  userAgent TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_admin_logs_admin_id FOREIGN KEY (adminId) REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create voters table
CREATE TABLE IF NOT EXISTS voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nin VARCHAR(11) NOT NULL UNIQUE,
  vin VARCHAR(19) NOT NULL UNIQUE,
  phoneNumber VARCHAR(15) NOT NULL,
  dateOfBirth DATE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  recoveryToken VARCHAR(255),
  recoveryTokenExpiry TIMESTAMP,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  lastLogin TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  mfaSecret VARCHAR(255),
  mfaEnabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfaBackupCodes TEXT[]
);

-- Create failed_attempts table
CREATE TABLE IF NOT EXISTS failed_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL,
  attemptType VARCHAR(50) NOT NULL,
  ipAddress VARCHAR(50),
  userAgent TEXT,
  attemptTime TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_failed_attempts_user_id FOREIGN KEY (userId) REFERENCES voters(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create polling_units table
CREATE TABLE IF NOT EXISTS polling_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pollingUnitCode VARCHAR(50) NOT NULL UNIQUE,
  pollingUnitName VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  ward VARCHAR(100) NOT NULL,
  geolocation JSONB,
  address VARCHAR(255),
  registeredVoters INTEGER NOT NULL DEFAULT 0,
  assignedOfficer UUID,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_polling_units_assigned_officer FOREIGN KEY (assignedOfficer) REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create voter_cards table
CREATE TABLE IF NOT EXISTS voter_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL,
  fullName VARCHAR(100) NOT NULL,
  vin VARCHAR(19) NOT NULL UNIQUE,
  pollingUnitCode VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  ward VARCHAR(100) NOT NULL,
  issuedDate TIMESTAMP NOT NULL DEFAULT NOW(),
  isValid BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_voter_cards_user_id FOREIGN KEY (userId) REFERENCES voters(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_voter_cards_polling_unit_code FOREIGN KEY (pollingUnitCode) REFERENCES polling_units(pollingUnitCode) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create verification_statuses table
CREATE TABLE IF NOT EXISTS verification_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL UNIQUE,
  isPhoneVerified BOOLEAN NOT NULL DEFAULT FALSE,
  isEmailVerified BOOLEAN NOT NULL DEFAULT FALSE,
  isIdentityVerified BOOLEAN NOT NULL DEFAULT FALSE,
  isAddressVerified BOOLEAN NOT NULL DEFAULT FALSE,
  isBiometricVerified BOOLEAN NOT NULL DEFAULT FALSE,
  verificationLevel INTEGER NOT NULL DEFAULT 0,
  lastVerifiedAt TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_verification_statuses_user_id FOREIGN KEY (userId) REFERENCES voters(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create elections table
CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  electionName VARCHAR(100) NOT NULL,
  electionType VARCHAR(50) NOT NULL,
  startDate TIMESTAMP NOT NULL,
  endDate TIMESTAMP NOT NULL,
  description TEXT,
  isActive BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  eligibilityRules JSONB,
  createdBy UUID NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_elections_created_by FOREIGN KEY (createdBy) REFERENCES admin_users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create election_stats table
CREATE TABLE IF NOT EXISTS election_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  electionId UUID NOT NULL UNIQUE,
  totalVotes INTEGER NOT NULL DEFAULT 0,
  validVotes INTEGER NOT NULL DEFAULT 0,
  invalidVotes INTEGER NOT NULL DEFAULT 0,
  turnoutPercentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  lastUpdated TIMESTAMP NOT NULL DEFAULT NOW(),
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_election_stats_election_id FOREIGN KEY (electionId) REFERENCES elections(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  electionId UUID NOT NULL,
  fullName VARCHAR(100) NOT NULL,
  partyCode VARCHAR(50) NOT NULL,
  partyName VARCHAR(100) NOT NULL,
  bio TEXT,
  photoUrl VARCHAR(255),
  position VARCHAR(100),
  manifesto TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_candidates_election_id FOREIGN KEY (electionId) REFERENCES elections(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uk_candidates_election_party UNIQUE (electionId, partyCode)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL,
  electionId UUID NOT NULL,
  candidateId UUID NOT NULL,
  pollingUnitId UUID NOT NULL,
  encryptedVoteData BYTEA NOT NULL,
  voteHash VARCHAR(255) NOT NULL,
  voteTimestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  voteSource VARCHAR(50) NOT NULL,
  isCounted BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_votes_user_id FOREIGN KEY (userId) REFERENCES voters(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_votes_election_id FOREIGN KEY (electionId) REFERENCES elections(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_votes_candidate_id FOREIGN KEY (candidateId) REFERENCES candidates(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_votes_polling_unit_id FOREIGN KEY (pollingUnitId) REFERENCES polling_units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uk_votes_user_election UNIQUE (userId, electionId)
);

-- Create ussd_sessions table
CREATE TABLE IF NOT EXISTS ussd_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessionId VARCHAR(100) NOT NULL UNIQUE,
  userId UUID,
  phoneNumber VARCHAR(15) NOT NULL,
  sessionData JSONB,
  currentState VARCHAR(50) NOT NULL,
  startTime TIMESTAMP NOT NULL DEFAULT NOW(),
  lastAccessTime TIMESTAMP NOT NULL DEFAULT NOW(),
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ussd_sessions_user_id FOREIGN KEY (userId) REFERENCES voters(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create ussd_votes table
CREATE TABLE IF NOT EXISTS ussd_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessionId VARCHAR(100) NOT NULL,
  userId UUID NOT NULL,
  electionId UUID NOT NULL,
  candidateId UUID NOT NULL,
  voteTimestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmationCode VARCHAR(10) NOT NULL,
  isProcessed BOOLEAN NOT NULL DEFAULT FALSE,
  processedAt TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ussd_votes_session_id FOREIGN KEY (sessionId) REFERENCES ussd_sessions(sessionId) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ussd_votes_user_id FOREIGN KEY (userId) REFERENCES voters(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ussd_votes_election_id FOREIGN KEY (electionId) REFERENCES elections(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ussd_votes_candidate_id FOREIGN KEY (candidateId) REFERENCES candidates(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create audit_logs table (updated to match AuditLog model)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID,
  actionType VARCHAR(50) NOT NULL,
  actionTimestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  ipAddress VARCHAR(255) NOT NULL,
  userAgent VARCHAR(255) NOT NULL,
  actionDetails JSONB,
  isSuspicious BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (userId) REFERENCES voters(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create observer_reports table
CREATE TABLE IF NOT EXISTS observer_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observerId UUID NOT NULL,
  electionId UUID NOT NULL,
  pollingUnitId UUID NOT NULL,
  reportType VARCHAR(50) NOT NULL,
  reportContent TEXT NOT NULL,
  attachments JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewedBy UUID,
  reviewNotes TEXT,
  reviewedAt TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_observer_reports_observer_id FOREIGN KEY (observerId) REFERENCES admin_users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_observer_reports_election_id FOREIGN KEY (electionId) REFERENCES elections(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_observer_reports_polling_unit_id FOREIGN KEY (pollingUnitId) REFERENCES polling_units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_observer_reports_reviewed_by FOREIGN KEY (reviewedBy) REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_voters_phone_number ON voters(phoneNumber);
CREATE INDEX idx_elections_type ON elections(electionType);
CREATE INDEX idx_elections_dates ON elections(startDate, endDate);
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_elections_is_active ON elections(isActive);
CREATE INDEX idx_candidates_election_id ON candidates(electionId);
CREATE INDEX idx_candidates_party_code ON candidates(partyCode);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_is_active ON candidates(isActive);
CREATE INDEX idx_votes_election_id ON votes(electionId);
CREATE INDEX idx_votes_candidate_id ON votes(candidateId);
CREATE INDEX idx_votes_polling_unit_id ON votes(pollingUnitId);
CREATE INDEX idx_votes_timestamp ON votes(voteTimestamp);
CREATE INDEX idx_votes_source ON votes(voteSource);
CREATE INDEX idx_votes_is_counted ON votes(isCounted);
CREATE INDEX idx_polling_units_location ON polling_units(state, lga, ward);
CREATE INDEX idx_polling_units_assigned_officer ON polling_units(assignedOfficer);
CREATE INDEX idx_polling_units_is_active ON polling_units(isActive);
CREATE INDEX idx_voter_cards_location ON voter_cards(state, lga, ward);
CREATE INDEX idx_admin_users_admin_type ON admin_users(adminType);
CREATE INDEX idx_admin_users_is_active ON admin_users(isActive);
CREATE INDEX idx_ussd_sessions_phone_number ON ussd_sessions(phoneNumber);
CREATE INDEX idx_ussd_sessions_is_active ON ussd_sessions(isActive);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(userId);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(actionType);
CREATE INDEX idx_audit_logs_action_timestamp ON audit_logs(actionTimestamp);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ipAddress);
CREATE INDEX idx_audit_logs_is_suspicious ON audit_logs(isSuspicious); 