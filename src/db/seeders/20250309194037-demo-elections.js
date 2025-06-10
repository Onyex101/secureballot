/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

/**
 * Seeder for SecureBallot application
 *
 * This seeder creates test data for the application in the following order:
 * 1. Admin users (including super admin) - Uses NIN + password authentication
 * 2. Admin roles and permissions
 * 3. Elections with encryption keys
 * 4. Candidates
 * 5. Polling units
 * 6. Voters - Uses encrypted NIN/VIN + OTP authentication (no password)
 * 7. Voter verification statuses
 * 8. Votes with hybrid encryption
 * 9. Additional admin users with diverse roles
 * 10. Observer reports
 * 11. Election statistics
 * 12. Failed authentication attempts
 * 13. Audit logs
 * 14. OTP logs
 *
 * The order is important to maintain referential integrity and prevent foreign key constraint errors.
 * Relationships between tables are carefully managed to ensure data consistency.
 *
 * AUTHENTICATION SYSTEM:
 * - Admin Users: NIN + password authentication with encrypted NIN storage
 * - Voters: Encrypted NIN/VIN + OTP authentication (password-less)
 * - OTP currently hardcoded to 723111 for POC development
 */

const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const naijaFaker = require('@codegrenade/naija-faker');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Embedded encryption functions for seeder self-sufficiency
// =======================================================

// Hash data with SHA-256
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Generate RSA key pair
function generateRsaKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  return { publicKey, privateKey };
}

// Encrypt data with RSA public key
function encryptWithPublicKey(data, publicKey) {
  const encryptedData = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    Buffer.from(data),
  );
  return encryptedData.toString('base64');
}

// Generate AES key
function generateAesKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Simple dummy encryption for seeder (just Base64 encoding)
function encryptWithAes(data, key) {
  const iv = crypto.randomBytes(16);
  const encoded = Buffer.from(data).toString('base64');

  return {
    iv: iv.toString('hex'),
    encryptedData: encoded,
  };
}

// Generate election-specific RSA key pair
function generateElectionKeys() {
  const { publicKey, privateKey } = generateRsaKeyPair();
  const publicKeyFingerprint = hashData(publicKey).substring(0, 16);

  return {
    publicKey,
    privateKey,
    publicKeyFingerprint,
  };
}

// Encrypt vote data using hybrid encryption
function encryptVote(voteData, electionPublicKey) {
  const voteJson = JSON.stringify(voteData);
  const aesKey = generateAesKey();
  const { iv, encryptedData } = encryptWithAes(voteJson, aesKey);
  const encryptedAesKey = encryptWithPublicKey(aesKey, electionPublicKey);
  const voteHash = hashData(voteJson);
  const publicKeyFingerprint = hashData(electionPublicKey).substring(0, 16);

  return {
    encryptedVoteData: Buffer.from(encryptedData, 'base64'),
    encryptedAesKey,
    iv,
    voteHash,
    publicKeyFingerprint,
  };
}

// Create vote proof/receipt
function createVoteProof(voteData, encryptedVote) {
  const proofData = {
    voterId: hashData(voteData.voterId),
    voteHash: encryptedVote.voteHash.substring(0, 8),
    timestamp: voteData.timestamp.getTime(),
  };

  const proofString = JSON.stringify(proofData);
  const proof = hashData(proofString);

  return proof.substring(0, 16).toUpperCase();
}

// Simple dummy encryption for seeder (looks like real encryption but just uses Base64)
function encryptIdentity(identity) {
  // Create a dummy "encrypted" format that looks like real encryption
  // Add timestamp to ensure uniqueness even for same input
  const timestamp = Date.now().toString();
  const uniqueInput = `${identity}-${timestamp}-${crypto.randomBytes(4).toString('hex')}`;
  const dummyIv = crypto.randomBytes(16).toString('hex');
  const encoded = Buffer.from(uniqueInput).toString('base64');
  return `${dummyIv}:${encoded}`;
}

// Embedded service objects for compatibility
const voteEncryption = {
  encryptVote: encryptVote,
  createVoteProof: createVoteProof,
};

const electionKeyService = {
  generateElectionKeyPair: async function (electionId, generatedBy) {
    // Generate the key pair
    const keys = generateElectionKeys();

    // For seeder purposes, we'll return a simplified version
    // In real app, this would involve database operations
    return {
      electionId,
      publicKey: keys.publicKey,
      publicKeyFingerprint: keys.publicKeyFingerprint,
      keyGeneratedAt: new Date(),
      keyGeneratedBy: generatedBy,
      isActive: true,
    };
  },

  getElectionPublicKey: async function (electionId) {
    // For seeder, we'll generate a new key each time
    // This is a simplified version for demo data generation
    const keys = generateElectionKeys();
    return keys.publicKey;
  },
};

// Constants for our seed data
const SALT_ROUNDS = 12;

// Default password for all admin users (voters now use OTP-based authentication)
const DEFAULT_ADMIN_PASSWORD = 'password123';

// Generate password hash using bcrypt for consistency
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, SALT_ROUNDS);

// Read configuration from environment variables or use defaults
// Maximum voters per state - acts as a safety limit that overrides VOTERS_PER_POLLING_UNIT when needed
const MAX_VOTERS_PER_STATE = process.env.SEED_MAX_VOTERS_PER_STATE
  ? parseInt(process.env.SEED_MAX_VOTERS_PER_STATE, 10)
  : 50; // Reduced for debugging

// Batch size for bulk inserts to prevent memory issues - reduced for debugging
const BATCH_SIZE = process.env.SEED_BATCH_SIZE ? parseInt(process.env.SEED_BATCH_SIZE, 10) : 10;

// Configuration for scaling data generation - reduced for debugging
const POLLING_UNITS_PER_STATE = 5;
const VOTERS_PER_POLLING_UNIT = 200;

// Default values if not set
const DEFAULT_MAX_VOTERS_PER_STATE = 1000;

// Sets to track unique identifiers
const allVoterIds = new Set();
// Set to track voter-election combinations to prevent duplicate votes
const voterElectionVotes = new Set();
// Set to log all previously used voter IDs from database (actually inserted)
const existingVoterIds = new Set();
// Set to track voter IDs that are in the current batch (about to be inserted)
const batchVoterIds = new Set();

// Nigeria states - manually defined to ensure proper structure
const nigeriaStates = [
  { name: 'Abia', code: 'AB' },
  { name: 'Adamawa', code: 'AD' },
  { name: 'Akwa Ibom', code: 'AK' },
  { name: 'Anambra', code: 'AN' },
  { name: 'Bauchi', code: 'BA' },
  { name: 'Bayelsa', code: 'BY' },
  { name: 'Benue', code: 'BE' },
  { name: 'Borno', code: 'BO' },
  { name: 'Cross River', code: 'CR' },
  { name: 'Delta', code: 'DE' },
  { name: 'Ebonyi', code: 'EB' },
  { name: 'Edo', code: 'ED' },
  { name: 'Ekiti', code: 'EK' },
  { name: 'Enugu', code: 'EN' },
  { name: 'FCT', code: 'FC' },
  { name: 'Gombe', code: 'GO' },
  { name: 'Imo', code: 'IM' },
  { name: 'Jigawa', code: 'JI' },
  { name: 'Kaduna', code: 'KD' },
  { name: 'Kano', code: 'KN' },
  { name: 'Katsina', code: 'KT' },
  { name: 'Kebbi', code: 'KE' },
  { name: 'Kogi', code: 'KO' },
  { name: 'Kwara', code: 'KW' },
  { name: 'Lagos', code: 'LA' },
  { name: 'Nasarawa', code: 'NA' },
  { name: 'Niger', code: 'NI' },
  { name: 'Ogun', code: 'OG' },
  { name: 'Ondo', code: 'ON' },
  { name: 'Osun', code: 'OS' },
  { name: 'Oyo', code: 'OY' },
  { name: 'Plateau', code: 'PL' },
  { name: 'Rivers', code: 'RI' },
  { name: 'Sokoto', code: 'SO' },
  { name: 'Taraba', code: 'TA' },
  { name: 'Yobe', code: 'YO' },
  { name: 'Zamfara', code: 'ZA' },
];

// Permission mapping based on roles (aligned with Permission enum in src/types/auth.ts)
// Using exact permission values from src/middleware/accessControl.ts
const rolePermissionsMap = {
  SystemAdministrator: [
    'manage_users',
    'manage_roles',
    'manage_system_settings',
    'view_audit_logs',
    'generate_reports',
    'manage_security_settings',
    'manage_encryption_keys',
    'view_security_logs',
  ],
  ElectoralCommissioner: [
    'create_election',
    'edit_election',
    'delete_election',
    'manage_candidates',
    'publish_results',
    'generate_reports',
    'view_results',
    'export_results',
  ],
  SecurityOfficer: [
    'manage_security_settings',
    'manage_encryption_keys',
    'view_security_logs',
    'view_audit_logs',
  ],
  SystemAuditor: ['view_audit_logs', 'generate_reports', 'view_security_logs'],
  RegionalElectoralOfficer: ['manage_polling_units', 'assign_officers', 'view_results'],
  ElectionManager: ['edit_election', 'manage_candidates', 'view_results', 'generate_reports'],
  ResultVerificationOfficer: ['view_results', 'verify_results', 'export_results'],
  PollingUnitOfficer: ['verify_voters'],
  VoterRegistrationOfficer: ['register_voters', 'verify_voters', 'reset_voter_password'],
  CandidateRegistrationOfficer: ['manage_candidates'],
  Observer: ['view_elections', 'view_results'],
  Voter: ['view_elections', 'cast_vote'],
};

// Observer report types
const reportTypes = [
  'PollingUnitOpening',
  'VoterTurnout',
  'Irregularity',
  'PollingUnitClosing',
  'VoteCounting',
];

// Presidential candidates
const PRESIDENTIAL_CANDIDATES = [
  {
    fullName: 'Peter Gregory Obi',
    partyCode: 'LP',
    partyName: 'Labour Party',
    bio: 'Former Governor of Anambra State and businessman',
    position: 'Presidential Candidate',
    manifesto: 'Economic recovery and security for all Nigerians',
  },
  {
    fullName: 'Atiku Abubakar',
    partyCode: 'PDP',
    partyName: 'Peoples Democratic Party',
    bio: 'Former Vice President of Nigeria and businessman',
    position: 'Presidential Candidate',
    manifesto: 'Unity, restructuring and development',
  },
  {
    fullName: 'Bola Ahmed Tinubu',
    partyCode: 'APC',
    partyName: 'All Progressives Congress',
    bio: 'Former Governor of Lagos State and national leader',
    position: 'Presidential Candidate',
    manifesto: 'Renewed hope agenda for Nigeria',
  },
];

// Gubernatorial candidates for Lagos
const lagosGubernatorialCandidates = [
  {
    fullName: 'Babajide Sanwo-Olu',
    partyCode: 'APC',
    partyName: 'All Progressives Congress',
    bio: 'Incumbent Governor of Lagos State',
    position: 'Gubernatorial Candidate',
    manifesto: 'Continuing the development of Lagos State',
  },
  {
    fullName: 'Gbadebo Rhodes-Vivour',
    partyCode: 'LP',
    partyName: 'Labour Party',
    bio: 'Architect and social activist',
    position: 'Gubernatorial Candidate',
    manifesto: 'A new direction for Lagos State',
  },
  {
    fullName: 'Abdul-Azeez Olajide Adediran',
    partyCode: 'PDP',
    partyName: 'Peoples Democratic Party',
    bio: 'Businessman and philanthropist',
    position: 'Gubernatorial Candidate',
    manifesto: 'Wealth creation and infrastructural development',
  },
];

// Helper function to validate voter records before insertion
function validateVoterRecord(record) {
  const validationIssues = [];

  // Check required fields (updated for encrypted fields)
  if (!record.id) validationIssues.push('Missing id');
  if (!record.nin_encrypted) validationIssues.push('Missing nin_encrypted');
  if (!record.vin_encrypted) validationIssues.push('Missing vin_encrypted');
  if (!record.phone_number) validationIssues.push('Missing phone_number');
  if (!record.date_of_birth) validationIssues.push('Missing date_of_birth');
  if (record.mfa_enabled === undefined) validationIssues.push('Missing mfa_enabled');
  if (record.otp_verified === undefined) validationIssues.push('Missing otp_verified');

  // Return immediately if any required field is missing
  if (validationIssues.length > 0) {
    return { valid: false, issues: validationIssues };
  }

  // Check encrypted fields exist (we can't validate length since they're encrypted)
  if (typeof record.nin_encrypted !== 'string' || record.nin_encrypted.length === 0) {
    validationIssues.push('NIN encrypted field must be a non-empty string');
  }

  if (typeof record.vin_encrypted !== 'string' || record.vin_encrypted.length === 0) {
    validationIssues.push('VIN encrypted field must be a non-empty string');
  }

  // Check phone number format (Nigeria format: +234...)
  if (typeof record.phone_number !== 'string' || !record.phone_number.startsWith('+234')) {
    validationIssues.push('Phone number must be in Nigeria format (+234...)');
  }

  // Return validation result
  return {
    valid: validationIssues.length === 0,
    issues: validationIssues,
  };
}

// Sets to track used identifiers
const usedNINs = new Set();
const usedVINs = new Set();

// Generate a unique ID (UUID v4)
const generateUniqueId = () => {
  return uuidv4();
};

// Generate a unique NIN (National Identification Number)
const generateUniqueNIN = () => {
  let nin;
  let attempts = 0;
  do {
    // NIN must be exactly 11 digits
    nin = faker.string.numeric(11);
    attempts++;
    // Safety valve to prevent infinite loops
    if (attempts > 10) {
      // Just generate a valid format and accept potential duplicates
      nin = faker.string.numeric(11);
      break;
    }
  } while (usedNINs.has(nin));

  // Ensure exact length of 11
  if (nin.length !== 11) {
    nin = nin.padEnd(11, '0').substring(0, 11);
  }

  usedNINs.add(nin);
  return nin;
};

// Generate a unique VIN (Voter Identification Number)
const generateUniqueVIN = (prefix = '') => {
  let vin;
  let attempts = 0;
  do {
    // Generate a VIN that is exactly 19 characters
    if (prefix) {
      // If prefix is provided, use it and pad the rest
      const remainingChars = 19 - prefix.length;
      if (remainingChars > 0) {
        // Generate alphanumeric characters to fill the remaining space
        vin = `${prefix}${faker.string.alphanumeric(remainingChars).toUpperCase()}`;
      } else {
        // If prefix is too long, truncate it
        vin = prefix.substring(0, 19);
      }
    } else {
      // Standard format: 3 alpha + 10 numeric + 6 alpha = 19 chars
      vin = `${faker.string.alpha(3).toUpperCase()}${faker.string.numeric(10)}${faker.string.alpha(6).toUpperCase()}`;
    }

    // Double-check length is exactly 19
    if (vin.length !== 19) {
      vin = vin.padEnd(19, '0').substring(0, 19);
    }

    attempts++;
    // Safety valve to prevent infinite loops
    if (attempts > 10) {
      // Just ensure the length is correct and accept potential duplicates
      if (vin.length !== 19) {
        vin = vin.padEnd(19, '0').substring(0, 19);
      }
      break;
    }
  } while (usedVINs.has(vin));

  usedVINs.add(vin);
  return vin;
};

// Check for existing data in a table before inserting
async function checkTableExists(queryInterface, tableName) {
  try {
    const result = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      )`,
    );
    return result[0][0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error.message);
    return false;
  }
}

// Check if a record exists in a table by its primary key
async function checkRecordExists(queryInterface, tableName, pkColumn, pkValue) {
  try {
    const [results] = await queryInterface.sequelize.query(
      `SELECT 1 FROM ${tableName} WHERE ${pkColumn} = '${pkValue}'`,
    );
    return results.length > 0;
  } catch (error) {
    console.error(`Error checking if record exists in ${tableName}:`, error.message);
    return false;
  }
}

// Verify all foreign keys before batch insert
async function validateForeignKeys(queryInterface, records, relationMap) {
  const validRecords = [];
  const invalidRecords = [];

  for (const record of records) {
    let isValid = true;

    // Check all foreign key relationships
    for (const [fkField, relation] of Object.entries(relationMap)) {
      const fkValue = record[fkField];

      // Skip if no foreign key value
      if (!fkValue) continue;

      let exists = false;

      // For voter table foreign keys, check our in-memory tracking first
      if (relation.table === 'voters' && relation.column === 'id') {
        // Check both existing voters and current batch voters
        exists = existingVoterIds.has(fkValue) || batchVoterIds.has(fkValue);
        
        // If not found in memory, fall back to database check
        if (!exists) {
          exists = await checkRecordExists(
            queryInterface,
            relation.table,
            relation.column,
            fkValue,
          );
          
          // Log when we have to fall back to database
          if (!exists) {
            console.log(`⚠️  Voter ID ${fkValue} not found in memory (${existingVoterIds.size} existing + ${batchVoterIds.size} batch) or database`);
          }
        }
      } else {
        // For other tables, check the database directly
        exists = await checkRecordExists(
          queryInterface,
          relation.table,
          relation.column,
          fkValue,
        );
      }

      if (!exists) {
        console.log(
          `Foreign key constraint violation: ${fkField}=${fkValue} does not exist in ${relation.table}.${relation.column}`,
        );
        isValid = false;
        break;
      }
    }

    if (isValid) {
      validRecords.push(record);
    } else {
      invalidRecords.push(record);
    }
  }

  return {
    valid: validRecords,
    invalid: invalidRecords,
  };
}

// Enhanced batch insert with foreign key validation
async function enhancedBatchInsert(
  queryInterface,
  tableName,
  data,
  relationMap = {},
  batchSize = BATCH_SIZE,
) {
  console.log(`Enhanced batch insertion for ${tableName} with ${data.length} records...`);

  // Skip if no data
  if (!data || data.length === 0) {
    console.log(`No data to insert into ${tableName}`);
    return 0;
  }

  // Check if table exists
  const tableExists = await checkTableExists(queryInterface, tableName);
  if (!tableExists) {
    console.error(`Table ${tableName} does not exist!`);
    return 0;
  }

  // Define table relationship based on model relationships
  const tableRelationships = {
    // Key tables and their foreign key relationships
    elections: {
      created_by: { table: 'admin_users', column: 'id', onDelete: 'RESTRICT' },
    },
    candidates: {
      election_id: { table: 'elections', column: 'id', onDelete: 'CASCADE' },
    },
    votes: {
      user_id: { table: 'voters', column: 'id', onDelete: 'RESTRICT' },
      election_id: { table: 'elections', column: 'id', onDelete: 'RESTRICT' },
      candidate_id: { table: 'candidates', column: 'id', onDelete: 'RESTRICT' },
      polling_unit_id: { table: 'polling_units', column: 'id', onDelete: 'RESTRICT' },
    },
    verification_statuses: {
      user_id: { table: 'voters', column: 'id', onDelete: 'CASCADE' },
    },
    ussd_votes: {
      user_id: { table: 'voters', column: 'id', onDelete: 'RESTRICT' },
      election_id: { table: 'elections', column: 'id', onDelete: 'RESTRICT' },
      candidate_id: { table: 'candidates', column: 'id', onDelete: 'RESTRICT' },
      session_code: { table: 'ussd_sessions', column: 'session_code', onDelete: 'CASCADE' },
    },
    observer_reports: {
      observer_id: { table: 'admin_users', column: 'id', onDelete: 'SET NULL' },
      election_id: { table: 'elections', column: 'id', onDelete: 'CASCADE' },
      polling_unit_id: { table: 'polling_units', column: 'id', onDelete: 'CASCADE' },
      reviewed_by: { table: 'admin_users', column: 'id', onDelete: 'SET NULL' },
    },
  };

  // Merge passed relationMap with the predefined table relationships
  const effectiveRelationMap = {
    ...(tableRelationships[tableName] || {}),
    ...relationMap,
  };

  // For tables with foreign keys, validate all foreign keys first
  if (Object.keys(effectiveRelationMap).length > 0) {
    console.log(
      `Validating foreign keys for ${tableName} against ${Object.keys(effectiveRelationMap).length} related tables...`,
    );
    const { valid, invalid } = await validateForeignKeys(
      queryInterface,
      data,
      effectiveRelationMap,
    );

    if (invalid.length > 0) {
      console.log(`Removed ${invalid.length} records with invalid foreign keys`);
      // Log some examples of invalid records to help with debugging
      if (invalid.length > 0) {
        console.log(`Examples of invalid records:`);
        const examples = invalid.slice(0, 3);
        for (const example of examples) {
          console.log(JSON.stringify(example, null, 2));
        }
      }
    }

    if (valid.length === 0) {
      console.log(`No valid records to insert after foreign key validation`);
      return 0;
    }

    // Continue with valid records only
    data = valid;
  }

  // Proceed with regular batch insert using the validated data
  return batchInsert(queryInterface, tableName, data, batchSize);
}

// Simplified batch insert function with minimal validation
async function batchInsert(queryInterface, tableName, data, batchSize = BATCH_SIZE) {
  console.log(`Batch inserting ${data.length} records into ${tableName}...`);

  // Early return for empty data
  if (!data || data.length === 0) {
    console.log(`No data to insert into ${tableName}`);
    return 0;
  }

  // Break the data into batches no larger than the batch size
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  console.log(`Split into ${batches.length} batches of max ${batchSize} records each`);

  let insertedCount = 0;

  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await queryInterface.bulkInsert(tableName, batch);
      insertedCount += batch.length;
      console.log(
        `Inserted batch ${i + 1}/${batches.length} (${insertedCount}/${data.length} records)`,
      );
    } catch (error) {
      console.error(`Error inserting batch ${i + 1} into ${tableName}: ${error.message}`);
      
      // Log sample data for debugging
      if (batch.length > 0) {
        const sampleRecord = { ...batch[0] };
        // Truncate large fields for readability
        Object.keys(sampleRecord).forEach(key => {
          if (typeof sampleRecord[key] === 'string' && sampleRecord[key].length > 50) {
            sampleRecord[key] = sampleRecord[key].substring(0, 47) + '...';
          }
        });
        console.log(`Sample record from failed batch:`, JSON.stringify(sampleRecord, null, 2));
      }
    }
  }

  if (insertedCount === 0) {
    console.log(`Failed to insert any ${tableName}`);
  } else if (insertedCount < data.length) {
    console.log(`Partially inserted ${insertedCount}/${data.length} ${tableName}`);
  } else {
    console.log(`Successfully inserted ${insertedCount} ${tableName}`);
  }

  return insertedCount;
}

// Helper function to randomly distribute votes to ensure a specific winner
function distributeVotesWithWinner(totalVoters, candidateCount, winnerIndex) {
  // Ensure we don't exceed MAX_VOTERS_PER_STATE
  totalVoters = Math.min(totalVoters, MAX_VOTERS_PER_STATE);

  // For very small numbers, ensure we have at least enough votes for a meaningful election
  // Each candidate needs at least 1 vote, and the winner needs enough to win
  const minimumVotes = Math.max(totalVoters, candidateCount * 3);

  // Use whichever is larger - the original target or our minimum
  const adjustedTotal = Math.max(minimumVotes, totalVoters);

  // Create an array to hold votes for each candidate
  const votes = new Array(candidateCount).fill(0);

  // Allocate at least 51% to the winner to ensure victory
  const winnerVotes = Math.ceil(adjustedTotal * 0.51);
  votes[winnerIndex] = winnerVotes;

  // Distribute remaining votes to ensure we use all votes
  const remainingVotes = adjustedTotal - winnerVotes;

  // First ensure each candidate gets at least 1 vote
  for (let i = 0; i < candidateCount; i++) {
    if (i !== winnerIndex) {
      if (votes[i] === 0) {
        votes[i] = 1;
      }
    }
  }

  // Calculate how many votes are still unallocated
  let allocated = votes.reduce((a, b) => a + b, 0);
  let stillRemaining = adjustedTotal - allocated;

  // Distribute remaining votes proportionally
  if (stillRemaining > 0) {
    // For each candidate other than the winner
    const otherCandidates = candidateCount - 1;

    // First approximate distribution
    for (let i = 0; i < candidateCount; i++) {
      if (i !== winnerIndex) {
        // Base share plus some randomness
        const baseShare = Math.floor(stillRemaining / otherCandidates);
        const randomFactor = Math.random() * 0.4 + 0.8; // Random between 0.8 and 1.2
        const share = Math.floor(baseShare * randomFactor);

        // Ensure we don't exceed remaining votes
        const safeShare = Math.min(share, stillRemaining);
        votes[i] += safeShare;
        stillRemaining -= safeShare;
      }
    }

    // Any remaining votes go to the first non-winner
    for (let i = 0; i < candidateCount && stillRemaining > 0; i++) {
      if (i !== winnerIndex) {
        votes[i] += stillRemaining;
        stillRemaining = 0;
        break;
      }
    }
  }

  console.log(
    `Vote distribution: Winner (${winnerIndex}) gets ${votes[winnerIndex]} out of ${adjustedTotal} total votes`,
  );

  return votes;
}

// Helper function to get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper to generate report content based on type
function generateReportContent(reportType, pollingUnit) {
  switch (reportType) {
    case 'PollingUnitOpening':
      return `Polling unit ${pollingUnit.polling_unit_name} opened ${faker.datatype.boolean(0.8) ? 'on time' : 'with a delay of about ' + faker.number.int({ min: 15, max: 60 }) + ' minutes'}. ${faker.number.int({ min: 5, max: 20 })} voters were in queue at opening. Election officials are ${faker.datatype.boolean(0.7) ? 'present and efficient' : 'understaffed but managing'}. All materials are ${faker.datatype.boolean(0.9) ? 'complete and functional' : 'mostly available with minor issues'}.`;

    case 'VoterTurnout':
      return `Voter turnout at ${pollingUnit.polling_unit_name} is ${getRandomItem(['excellent', 'good', 'moderate', 'below expectations'])}. Approximately ${faker.number.int({ min: 30, max: 90 })}% of registered voters have voted so far. The atmosphere is ${getRandomItem(['calm and orderly', 'busy but organized', 'slightly tense but under control', 'enthusiastic and positive'])}.`;

    case 'Irregularity':
      return `${getRandomItem([
        'Minor argument between party agents quickly resolved by security.',
        'Short delay in voting due to technical issues with card reader.',
        'Complaint about inadequate lighting in the voting booth.',
        'Voter attempted to vote twice but was identified and prevented.',
        'Party supporter distributing items near polling unit was moved away by security.',
      ])} The issue was ${getRandomItem(['fully resolved', 'handled appropriately', 'addressed by officials', 'documented and contained'])}.`;

    case 'PollingUnitClosing':
      // Replace faker.time.recent() with a formatted time string
      const randomHour = faker.number.int({ min: 17, max: 19 }); // 5pm to 7pm
      const randomMinute = faker.number.int({ min: 0, max: 59 });
      const formattedTime = `${randomHour}:${randomMinute.toString().padStart(2, '0')}`;

      // Ensure min value for voter count is not greater than max
      const minVoterCount = Math.min(10, pollingUnit.registered_voters);
      const maxVoterCount = Math.max(minVoterCount, pollingUnit.registered_voters);

      return `Polling unit ${pollingUnit.polling_unit_name} closed at ${faker.datatype.boolean(0.8) ? '6:00 PM as scheduled' : formattedTime + ' PM'}. Final voter count was ${faker.number.int({ min: minVoterCount, max: maxVoterCount })}. Closing procedures were followed ${faker.datatype.boolean(0.7) ? 'correctly and efficiently' : 'with minor delays but properly'}. All materials have been secured. Party agents ${faker.datatype.boolean(0.9) ? 'have signed the relevant forms' : 'are in the process of reviewing the results'}.`;

    case 'VoteCounting':
      return `Vote counting at ${pollingUnit.polling_unit_name} ${faker.datatype.boolean(0.7) ? 'proceeded smoothly' : 'had minor delays but was conducted properly'}. All party agents were ${faker.datatype.boolean(0.9) ? 'present and witnessed the counting' : 'mostly present during the count'}. Results were recorded on the appropriate forms and ${faker.datatype.boolean(0.9) ? 'publicly announced to the satisfaction of observers' : 'documented according to regulations'}. No significant irregularities were observed during the counting process.`;

    default:
      return `Standard observation report for ${pollingUnit.polling_unit_name}. Everything proceeding according to electoral guidelines.`;
  }
}

const generateObserverReport = (
  observerId,
  electionId,
  pollingUnitId,
  reportType,
  content,
  status = 'pending',
  reviewerId = null,
) => {
  const report = {
    id: uuidv4(),
    observer_id: observerId,
    election_id: electionId,
    polling_unit_id: pollingUnitId,
    report_type: reportType,
    report_details: content,
    severity: getRandomItem(['info', 'concern', 'violation', 'critical']),
    media_urls: JSON.stringify([
      { type: 'image', url: 'https://example.com/reports/image1.jpg' },
      { type: 'document', url: 'https://example.com/reports/doc1.pdf' },
    ]),
    status,
    reported_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  if (status !== 'pending' && reviewerId) {
    report.reviewed_by = reviewerId;
    report.official_response = `Review completed on ${faker.date.recent({ days: 7 }).toLocaleDateString()}`;
    report.reviewed_at = faker.date.recent({ days: 7 });
  }

  return report;
};

// Helper function to generate a dummy encrypted vote data
// Enhanced vote encryption using the same system as the production vote service
async function createEncryptedVote(
  voterId,
  electionId,
  candidateId,
  pollingUnitId,
  voteSource = 'web',
) {
  if (!voteEncryption || !electionKeyService) {
    // Fallback to dummy data if encryption services not available
    return createFallbackVote(voterId, electionId, candidateId, 'services-unavailable');
  }

  try {
    // First, verify the election key exists in the database by trying to get the public key
    let electionPublicKey;
    try {
      electionPublicKey = await electionKeyService.getElectionPublicKey(electionId);
    } catch (keyError) {
      console.log(`⚠️  No active election key found for election ${electionId}, using fallback`);
      return createFallbackVote(voterId, electionId, candidateId, 'no-election-key');
    }

    if (!electionPublicKey) {
      console.log(`⚠️  Could not retrieve public key for election ${electionId}, using fallback`);
      return createFallbackVote(voterId, electionId, candidateId, 'key-retrieval-failed');
    }

    // electionPublicKey is already retrieved and validated above

    // Prepare vote data for encryption (same structure as voteService.ts)
    const voteData = {
      voterId,
      electionId,
      candidateId,
      pollingUnitId,
      timestamp: new Date(),
      voteSource,
    };

    // Encrypt the vote using hybrid encryption
    const encryptedVote = voteEncryption.encryptVote(voteData, electionPublicKey);

    // Generate a receipt code from the vote proof
    const receiptCode = voteEncryption.createVoteProof(voteData, encryptedVote);

    // Validate the encryption result
    if (!encryptedVote.encryptedVoteData || !encryptedVote.encryptedAesKey || !encryptedVote.iv) {
      console.log(`⚠️  Encryption validation failed for voter ${voterId}, using fallback`);
      return createFallbackVote(voterId, electionId, candidateId, 'encryption-validation-failed');
    }

    return {
      encryptedVoteData: encryptedVote.encryptedVoteData,
      encryptedAesKey: encryptedVote.encryptedAesKey,
      iv: encryptedVote.iv,
      voteHash: encryptedVote.voteHash,
      publicKeyFingerprint: encryptedVote.publicKeyFingerprint,
      receiptCode,
    };
  } catch (error) {
    console.log(`⚠️  Vote encryption failed for voter ${voterId}, using fallback:`, error.message);
    return createFallbackVote(voterId, electionId, candidateId, 'encryption-error');
  }
}

// Helper function to create fallback vote data
function createFallbackVote(voterId, electionId, candidateId, reason) {
  const timestamp = Date.now();
  return {
    encryptedVoteData: Buffer.from(`FALLBACK-VOTE:${candidateId}:${timestamp}`),
    encryptedAesKey: `fallback-aes-key-${reason}`,
    iv: `fallback-iv-${timestamp.toString().slice(-8)}`,
    voteHash: crypto
      .createHash('sha256')
      .update(`${voterId}:${electionId}:${candidateId}:${timestamp}`)
      .digest('hex'),
    publicKeyFingerprint: `fallback-${reason}`,
    receiptCode: `FB-${timestamp}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  };
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('Starting improved database seeding with enhanced authentication system...');
      console.log('🔐 Authentication System:');
      console.log('  - Admins: NIN + password (encrypted NIN storage)');
      console.log('  - Voters: Encrypted NIN/VIN + OTP (password-less)');
      console.log('  - OTP: Currently hardcoded 723111 for POC');
      console.log(`📝 Admin Password: ${DEFAULT_ADMIN_PASSWORD}`);
      console.log(`🔒 Generated Hash: ${DEFAULT_PASSWORD_HASH.substring(0, 30)}...`);
      console.log(`Using MAX_VOTERS_PER_STATE: ${MAX_VOTERS_PER_STATE}`);
      console.log(`Encryption service available: ✅ Yes (embedded functions)`);

      // Calculate total potential voters and apply scaling if needed
      const allStates = nigeriaStates;
      const totalStates = allStates.length;
      const totalPotentialPollingUnits = totalStates * POLLING_UNITS_PER_STATE;
      const totalPotentialVoters = totalPotentialPollingUnits * VOTERS_PER_POLLING_UNIT;
      const totalMaxVoters = totalStates * MAX_VOTERS_PER_STATE;

      // Calculate scaling factor based on MAX_VOTERS_PER_STATE
      const scalingFactor = Math.min(1, totalMaxVoters / totalPotentialVoters);
      const scaledVotersPerPollingUnit = Math.floor(VOTERS_PER_POLLING_UNIT * scalingFactor);
      const pollingUnitsToUse =
        scaledVotersPerPollingUnit > 0
          ? POLLING_UNITS_PER_STATE
          : Math.max(1, Math.floor(MAX_VOTERS_PER_STATE / VOTERS_PER_POLLING_UNIT));

      console.log(`Scaling configuration:`);
      console.log(`- Total states: ${totalStates}`);
      console.log(
        `- Polling units per state: ${pollingUnitsToUse} (target: ${POLLING_UNITS_PER_STATE})`,
      );
      console.log(
        `- Voters per polling unit: ${scaledVotersPerPollingUnit} (target: ${VOTERS_PER_POLLING_UNIT})`,
      );
      console.log(`- Total potential voters: ${totalPotentialVoters}`);
      console.log(`- Max voters allowed: ${totalMaxVoters}`);
      console.log(`- Scaling factor: ${scalingFactor.toFixed(2)}`);
      console.log(
        `- Estimated total voters to create: ${Math.min(totalPotentialVoters, totalMaxVoters)}`,
      );

      // Clear tracking sets
      allVoterIds.clear();
      voterElectionVotes.clear();
      existingVoterIds.clear();
      batchVoterIds.clear();
      usedNINs.clear();
      usedVINs.clear();

      // 1. Create a super admin (if doesn't exist)
      console.log('Checking for existing super admin user...');
      const [existingAdmin] = await queryInterface.sequelize.query(
        "SELECT id FROM admin_users WHERE email = 'admin@securevote.ng'",
      );

      let adminId;
      if (existingAdmin.length > 0) {
        adminId = existingAdmin[0].id;
        console.log('✅ Super admin already exists, using existing ID:', adminId);
      } else {
        console.log('Creating new super admin user...');
        adminId = generateUniqueId();

        await queryInterface.bulkInsert('admin_users', [
          {
            id: adminId,
            full_name: 'System Administrator',
            email: 'admin@securevote.ng',
            phone_number: '+2348123456789',
            password_hash: DEFAULT_PASSWORD_HASH,
            admin_type: 'SystemAdministrator',
            is_active: true,
            nin_encrypted: encryptIdentity('12345678901'), // Properly encrypted using same method as voters
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
        console.log('✅ Created new super admin user with ID:', adminId);
      }

      // Create admin roles for the system administrator
      await queryInterface.bulkInsert('admin_roles', [
        {
          id: generateUniqueId(),
          admin_id: adminId,
          role_name: 'SystemAdministrator',
          description: 'Full system access and administration',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      // Create admin permissions for the system administrator
      const systemAdminPermissions = rolePermissionsMap['SystemAdministrator'];
      for (const permission of systemAdminPermissions) {
        await queryInterface.bulkInsert('admin_permissions', [
          {
            id: generateUniqueId(),
            admin_id: adminId,
            permission_name: permission,
            access_level: 'full',
            granted_at: new Date(),
            granted_by: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }

      // 2. Create elections - presidential and gubernatorial for Lagos
      console.log('Creating elections');

      // Presidential election for all states
      const presidentialElectionId = generateUniqueId();
      await queryInterface.bulkInsert('elections', [
        {
          id: presidentialElectionId,
          election_name: 'Presidential Election 2027',
          election_type: 'PRESIDENTIAL',
          start_date: new Date(2025, 1, 25, 8, 0, 0),
          end_date: new Date(2025, 1, 25, 17, 0, 0),
          description: 'Nigerian Presidential Election 2027',
          is_active: true,
          status: 'active',
          created_by: adminId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      // Gubernatorial election for Lagos State
      const lagosGubernatorialElectionId = generateUniqueId();
      await queryInterface.bulkInsert('elections', [
        {
          id: lagosGubernatorialElectionId,
          election_name: 'Lagos State Gubernatorial Election 2027',
          election_type: 'GUBERNATORIAL',
          start_date: new Date(2025, 2, 9, 8, 0, 0), // Two weeks after presidential
          end_date: new Date(2025, 2, 9, 17, 0, 0),
          description: 'Lagos State Gubernatorial Election 2027',
          is_active: true,
          status: 'active',
          created_by: adminId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      console.log(`Created presidential election with ID: ${presidentialElectionId}`);
      console.log(`Created Lagos gubernatorial election with ID: ${lagosGubernatorialElectionId}`);

      // 2.5. Generate encryption keys for both elections
      console.log('Generating encryption keys for elections...');
      let presidentialKeysGenerated = false;
      let gubernatorialKeysGenerated = false;

      if (electionKeyService) {
        try {
          // Generate keys for presidential election
          console.log('Generating keys for presidential election...');
          const presidentialKeys = await electionKeyService.generateElectionKeyPair(
            presidentialElectionId,
            adminId,
          );
          console.log(`✅ Generated encryption keys for presidential election`);
          console.log(`   - Key ID: ${presidentialKeys.id}`);
          console.log(`   - Public Key Fingerprint: ${presidentialKeys.publicKeyFingerprint}`);
          console.log(`   - Key Generated At: ${presidentialKeys.keyGeneratedAt}`);

          // Verify the key was saved to database
          const [savedPresidentialKey] = await queryInterface.sequelize.query(
            `SELECT id, public_key_fingerprint FROM election_keys WHERE election_id = '${presidentialElectionId}'`,
          );
          if (savedPresidentialKey.length > 0) {
            console.log(
              `✅ Presidential election key verified in database: ${savedPresidentialKey[0].public_key_fingerprint}`,
            );
            presidentialKeysGenerated = true;
          } else {
            console.log('❌ Presidential election key not found in database after generation');
          }

          // Generate keys for gubernatorial election
          console.log('Generating keys for Lagos gubernatorial election...');
          const gubernatorialKeys = await electionKeyService.generateElectionKeyPair(
            lagosGubernatorialElectionId,
            adminId,
          );
          console.log(`✅ Generated encryption keys for Lagos gubernatorial election`);
          console.log(`   - Key ID: ${gubernatorialKeys.id}`);
          console.log(`   - Public Key Fingerprint: ${gubernatorialKeys.publicKeyFingerprint}`);
          console.log(`   - Key Generated At: ${gubernatorialKeys.keyGeneratedAt}`);

          // Verify the key was saved to database
          const [savedGubernatorialKey] = await queryInterface.sequelize.query(
            `SELECT id, public_key_fingerprint FROM election_keys WHERE election_id = '${lagosGubernatorialElectionId}'`,
          );
          if (savedGubernatorialKey.length > 0) {
            console.log(
              `✅ Gubernatorial election key verified in database: ${savedGubernatorialKey[0].public_key_fingerprint}`,
            );
            gubernatorialKeysGenerated = true;
          } else {
            console.log('❌ Gubernatorial election key not found in database after generation');
          }
        } catch (error) {
          console.log('⚠️  Warning: Could not generate election keys:', error.message);
          console.log('   Votes will use fallback encryption');
        }
      } else {
        console.log('⚠️  Election key service not available - votes will use fallback encryption');
      }

      // Log final key generation status
      console.log('\n🔐 Election Key Generation Summary:');
      console.log(
        `   - Presidential election keys: ${presidentialKeysGenerated ? '✅ Generated & Saved' : '❌ Failed'}`,
      );
      console.log(
        `   - Gubernatorial election keys: ${gubernatorialKeysGenerated ? '✅ Generated & Saved' : '❌ Failed'}`,
      );
      console.log(
        `   - Vote encryption will use: ${presidentialKeysGenerated || gubernatorialKeysGenerated ? 'Real encryption with generated keys' : 'Fallback encryption'}\n`,
      );

      // 3. Create candidates for both elections
      console.log('Creating candidates for elections');
      const presidentialCandidateIds = [];
      const gubernatorialCandidateIds = [];
      const candidateData = [];

      // Presidential candidates
      for (let i = 0; i < 3; i++) {
        const candidateId = generateUniqueId();
        presidentialCandidateIds.push(candidateId);

        candidateData.push({
          id: candidateId,
          election_id: presidentialElectionId,
          full_name: PRESIDENTIAL_CANDIDATES[i].fullName,
          party_code: PRESIDENTIAL_CANDIDATES[i].partyCode,
          party_name: PRESIDENTIAL_CANDIDATES[i].partyName,
          manifesto: PRESIDENTIAL_CANDIDATES[i].manifesto,
          status: 'approved',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Lagos gubernatorial candidates
      for (let i = 0; i < 3; i++) {
        const candidateId = generateUniqueId();
        gubernatorialCandidateIds.push(candidateId);

        candidateData.push({
          id: candidateId,
          election_id: lagosGubernatorialElectionId,
          full_name: lagosGubernatorialCandidates[i].fullName,
          party_code: lagosGubernatorialCandidates[i].partyCode,
          party_name: lagosGubernatorialCandidates[i].partyName,
          manifesto: lagosGubernatorialCandidates[i].manifesto,
          status: 'approved',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Use enhanced batch insert with validation for candidates
      await enhancedBatchInsert(queryInterface, 'candidates', candidateData, {
        election_id: { table: 'elections', column: 'id' },
      });
      console.log(
        `Created ${presidentialCandidateIds.length} presidential candidates and ${gubernatorialCandidateIds.length} Lagos gubernatorial candidates`,
      );

      // 4. Create polling units for all states
      console.log(`Creating polling units for all ${totalStates} Nigerian states`);
      const pollingUnits = [];
      const pollingUnitData = [];

      // Track polling units by state for later use
      const pollingUnitsByState = {};

      let puCounter = 0;
      for (const state of allStates) {
        // Skip if the state name is undefined or null
        if (!state || !state.name) {
          console.warn(`Skipping invalid state record:`, state);
          continue;
        }

        pollingUnitsByState[state.name] = [];

        // Create polling units per state
        for (let i = 0; i < pollingUnitsToUse; i++) {
          const puId = generateUniqueId();
          // Use state.code if available, otherwise generate a code from state name
          const stateCode = state.code || state.name.substring(0, 3).toUpperCase();
          const puCode = `PU${stateCode}${100 + i}`;
          puCounter++;

          const pollingUnit = {
            id: puId,
            code: puCode,
            state: state.name,
          };

          pollingUnits.push(pollingUnit);
          pollingUnitsByState[state.name].push(pollingUnit);

          pollingUnitData.push({
            id: puId,
            polling_unit_code: puCode,
            polling_unit_name: `${state.name} Polling Unit ${100 + i}`,
            state: state.name,
            lga: `${state.name} Central`,
            ward: `Ward ${i + 1}`,
            registered_voters: VOTERS_PER_POLLING_UNIT,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          });

          // Insert in batches to avoid memory issues
          if (pollingUnitData.length >= BATCH_SIZE) {
            // Validate data before insertion
            const validPollingUnitData = pollingUnitData.filter(pu => {
              // Check for required fields
              if (!pu.id || !pu.polling_unit_code || !pu.state || !pu.lga || !pu.ward) {
                console.warn(`Skipping invalid polling unit:`, pu);
                return false;
              }
              return true;
            });

            if (validPollingUnitData.length !== pollingUnitData.length) {
              console.warn(
                `Filtered out ${pollingUnitData.length - validPollingUnitData.length} invalid polling units`,
              );
            }

            if (validPollingUnitData.length > 0) {
              await queryInterface.bulkInsert('polling_units', validPollingUnitData);
              console.log(
                `Inserted batch of ${validPollingUnitData.length} polling units (total so far: ${puCounter})`,
              );
            }
            pollingUnitData.length = 0;
          }
        }
      }

      // Insert any remaining polling units
      if (pollingUnitData.length > 0) {
        // Validate data before insertion
        const validPollingUnitData = pollingUnitData.filter(pu => {
          // Check for required fields
          if (!pu.id || !pu.polling_unit_code || !pu.state || !pu.lga || !pu.ward) {
            console.warn(`Skipping invalid polling unit:`, pu);
            return false;
          }
          return true;
        });

        if (validPollingUnitData.length !== pollingUnitData.length) {
          console.warn(
            `Filtered out ${pollingUnitData.length - validPollingUnitData.length} invalid polling units`,
          );
        }

        if (validPollingUnitData.length > 0) {
          await queryInterface.bulkInsert('polling_units', validPollingUnitData);
          console.log(
            `Inserted final batch of ${validPollingUnitData.length} polling units (total: ${puCounter})`,
          );
        }
      }

      console.log(
        `Created ${puCounter} polling units across ${Object.keys(pollingUnitsByState).length} states`,
      );

      // Safety check - if no polling units were created, don't proceed with creating voters
      if (puCounter === 0) {
        console.error('No polling units were created, cannot proceed with creating voters');
        console.error('Please check why the polling units creation failed and try again');
        return false;
      }

      // 5. Create voters, voter cards, verification statuses, and votes in an integrated flow
      console.log(`Creating voters, cards, and votes in an integrated approach...`);

      // Track stats for reporting
      const stats = {
        voters: 0,
        verificationStatuses: 0,
        presidentialVotes: 0,
        lagosGubernatorial: 0,
        encryptedVotes: 0,
        fallbackVotes: 0,
      };

      // Determine if we want random allocation or specific candidates to win
      const presidentialWinner = 0; // Index of candidate who should win (0 = first candidate)
      const gubernatorialWinner = 0; // Index of candidate who should win

      // Process state by state to manage memory better
      for (const state of allStates) {
        console.log(`Processing ${state.name}...`);

        // Get polling units for this state
        const statePollingUnits = pollingUnitsByState[state.name] || [];

        // Skip if no polling units for this state
        if (statePollingUnits.length === 0) {
          console.log(`No polling units found for ${state.name}, skipping`);
          continue;
        }

        console.log(`Found ${statePollingUnits.length} polling units for ${state.name}`);

        // Check if this is Lagos (for gubernatorial election)
        const isLagos = state.name === 'Lagos';
        if (isLagos) {
          console.log('This is Lagos state - will create gubernatorial votes too');
        }

        // Process each polling unit in this state
        for (const pollingUnit of statePollingUnits) {
          // Handle a specific number of voters per polling unit
          const votersToCreate = scaledVotersPerPollingUnit;

          console.log(
            `Creating ${votersToCreate} voters and related data for polling unit ${pollingUnit.code}`,
          );

          // Create vote distribution for presidential election
          // Each polling unit will have a specific vote distribution to ensure the winner
          const presidentialVoteDistribution = distributeVotesWithWinner(
            votersToCreate,
            presidentialCandidateIds.length,
            presidentialWinner,
          );

          // For Lagos, also create gubernatorial vote distribution
          let gubernatorialVoteDistribution = [];
          if (isLagos) {
            gubernatorialVoteDistribution = distributeVotesWithWinner(
              votersToCreate,
              gubernatorialCandidateIds.length,
              gubernatorialWinner,
            );
          }

          // Batch data containers
          const voterBatch = [];
          const verificationStatusBatch = [];
          const presidentialVoteBatch = [];
          const gubernatorialVoteBatch = [];

          // Create voters for this polling unit with all related data
          for (let i = 0; i < votersToCreate; i++) {
            const voterId = generateUniqueId();
            const nin = generateUniqueNIN();
            const vin = generateUniqueVIN();
            const gender = Math.random() < 0.4 ? 'female' : 'male'; // 40% female, 60% male
            stats.voters++;

            // Generate a valid Nigerian phone number that matches validation pattern
            const phoneNumber = `+234${Math.floor(Math.random() * 900000000) + 100000000}`;
            
            // Generate a valid email
            const email = `voter${i}_${state.name.toLowerCase()}@test.com`;
            
            // 1. Create voter (use virtual fields nin/vin for model hooks to encrypt)
            voterBatch.push({
              id: voterId,
              nin: nin, // Virtual field - will be encrypted by model hooks
              vin: vin, // Virtual field - will be encrypted by model hooks
              phone_number: phoneNumber, // Guaranteed to match validation pattern
              date_of_birth: new Date(
                1960 + Math.floor(Math.random() * 40),
                Math.floor(Math.random() * 12),
                1 + Math.floor(Math.random() * 28),
              ),
              full_name: naijaFaker.name(),
              polling_unit_code: pollingUnit.code,
              state: state.name,
              gender: gender,
              lga: `${state.name} Central`,
              ward: `Ward ${Math.floor(i / 20) + 1}`,
              is_active: true,
              mfa_enabled: false,
              // OTP-based authentication fields
              otp_code: null,
              otp_expires_at: null,
              otp_verified: false,
              email: email, // Valid email format
              created_at: new Date(),
              updated_at: new Date(),
            });

            // 3. Create verification status
            verificationStatusBatch.push({
              id: generateUniqueId(),
              user_id: voterId,
              is_phone_verified: true,
              is_email_verified: i % 10 < 9, // 90% verified
              is_identity_verified: i % 10 < 9, // 90% verified
              is_address_verified: i % 10 < 9, // 90% verified
              is_biometric_verified: i % 10 < 9, // 90% verified
              verification_level: i % 10 < 9 ? 3 : Math.floor(i % 3), // 90% at level 3, others 0-2
              last_verified_at: i % 10 < 9 ? new Date() : null,
              is_verified: i % 10 < 9, // 90% fully verified
              state: 'verified', // Required field
              verified_at: i % 10 < 9 ? new Date() : null,
              verification_method: 'biometric', // Required field
              verification_data: JSON.stringify({
                // Required field - must be stringified for bulk insert
                phone_verified_at: new Date().toISOString(),
                verification_type: 'standard',
                biometric_score: 0.95,
              }),
              created_at: new Date(),
              updated_at: new Date(),
            });
            stats.verificationStatuses++;

            // 4. Create presidential vote based on distribution
            // Determine which candidate this voter voted for based on the distribution
            let presidentialCandidateIndex = 0;
            let voteSlot = i;
            let sum = 0;
            for (let c = 0; c < presidentialVoteDistribution.length; c++) {
              sum += presidentialVoteDistribution[c];
              if (voteSlot < sum) {
                presidentialCandidateIndex = c;
                break;
              }
            }

            const presidentialCandidateId = presidentialCandidateIds[presidentialCandidateIndex];
            const voteSource =
              i % 4 === 0 ? 'web' : i % 4 === 1 ? 'mobile' : i % 4 === 2 ? 'ussd' : 'offline';

            // Create encrypted vote using the same encryption as the production system
            const encryptedVoteData = await createEncryptedVote(
              voterId,
              presidentialElectionId,
              presidentialCandidateId,
              pollingUnit.id,
              voteSource,
            );

            // Track encryption type
            if (
              encryptedVoteData.publicKeyFingerprint &&
              !encryptedVoteData.publicKeyFingerprint.startsWith('fallback-')
            ) {
              stats.encryptedVotes++;
            } else {
              stats.fallbackVotes++;
            }

            presidentialVoteBatch.push({
              id: generateUniqueId(),
              user_id: voterId,
              election_id: presidentialElectionId,
              candidate_id: presidentialCandidateId,
              polling_unit_id: pollingUnit.id,
              encrypted_vote_data: encryptedVoteData.encryptedVoteData,
              encrypted_aes_key: encryptedVoteData.encryptedAesKey,
              iv: encryptedVoteData.iv,
              vote_hash: encryptedVoteData.voteHash,
              public_key_fingerprint: encryptedVoteData.publicKeyFingerprint,
              vote_timestamp: new Date(
                2027,
                1,
                25,
                8 + Math.floor(Math.random() * 8),
                Math.floor(Math.random() * 59),
              ),
              vote_source: voteSource,
              is_counted: true,
              receipt_code: encryptedVoteData.receiptCode,
              created_at: new Date(),
              updated_at: new Date(),
            });
            stats.presidentialVotes++;

            // 5. For Lagos, create gubernatorial vote
            if (isLagos) {
              // Determine which candidate this voter voted for the gubernatorial election
              let gubernatorialCandidateIndex = 0;
              voteSlot = i;
              sum = 0;
              for (let c = 0; c < gubernatorialVoteDistribution.length; c++) {
                sum += gubernatorialVoteDistribution[c];
                if (voteSlot < sum) {
                  gubernatorialCandidateIndex = c;
                  break;
                }
              }

              const gubernatorialCandidateId =
                gubernatorialCandidateIds[gubernatorialCandidateIndex];

              // Create encrypted vote for gubernatorial election
              const gubEncryptedVoteData = await createEncryptedVote(
                voterId,
                lagosGubernatorialElectionId,
                gubernatorialCandidateId,
                pollingUnit.id,
                voteSource,
              );

              // Track encryption type
              if (
                gubEncryptedVoteData.publicKeyFingerprint &&
                !gubEncryptedVoteData.publicKeyFingerprint.startsWith('fallback-')
              ) {
                stats.encryptedVotes++;
              } else {
                stats.fallbackVotes++;
              }

              gubernatorialVoteBatch.push({
                id: generateUniqueId(),
                user_id: voterId,
                election_id: lagosGubernatorialElectionId,
                candidate_id: gubernatorialCandidateId,
                polling_unit_id: pollingUnit.id,
                encrypted_vote_data: gubEncryptedVoteData.encryptedVoteData,
                encrypted_aes_key: gubEncryptedVoteData.encryptedAesKey,
                iv: gubEncryptedVoteData.iv,
                vote_hash: gubEncryptedVoteData.voteHash,
                public_key_fingerprint: gubEncryptedVoteData.publicKeyFingerprint,
                vote_timestamp: new Date(
                  2027,
                  2,
                  9,
                  8 + Math.floor(Math.random() * 8),
                  Math.floor(Math.random() * 59),
                ),
                vote_source: voteSource,
                is_counted: true,
                receipt_code: gubEncryptedVoteData.receiptCode,
                created_at: new Date(),
                updated_at: new Date(),
              });
              stats.lagosGubernatorial++;
            }

            // Insert in batches
            if (voterBatch.length >= BATCH_SIZE) {
              console.log(`Inserting batch of ${voterBatch.length} voters and related data...`);
              await insertIntegratedBatch(
                queryInterface,
                voterBatch,
                verificationStatusBatch,
                presidentialVoteBatch,
                gubernatorialVoteBatch,
              );

              // Clear batches
              voterBatch.length = 0;
              verificationStatusBatch.length = 0;
              presidentialVoteBatch.length = 0;
              gubernatorialVoteBatch.length = 0;
              
              // Clear batch tracking since this batch is done
              batchVoterIds.clear();
            }
          }

          // Insert any remaining data
          if (voterBatch.length > 0) {
            console.log(`Inserting final batch of ${voterBatch.length} voters and related data...`);
            await insertIntegratedBatch(
              queryInterface,
              voterBatch,
              verificationStatusBatch,
              presidentialVoteBatch,
              gubernatorialVoteBatch,
            );
            
            // Clear batch tracking since this batch is done
            batchVoterIds.clear();
          }
        }
      }

      // Print summary statistics
      console.log(`\nData Creation Summary:`);
      console.log(`- Voters: ${stats.voters}`);
      console.log(`- Verification Statuses: ${stats.verificationStatuses}`);
      console.log(`- Presidential Votes: ${stats.presidentialVotes}`);
      console.log(`- Lagos Gubernatorial Votes: ${stats.lagosGubernatorial}`);

      console.log('Database seeding with enhanced authentication system completed!');
      console.log('✅ Authentication Summary:');
      console.log('  - Admin users: NIN + password authentication');
      console.log('  - Voters: OTP-based authentication (no passwords)');
      console.log('  - All identity data: Encrypted storage');
      console.log('✅ Vote Encryption Summary:');
      console.log(`  - Vote encryption service: ${voteEncryption ? '✅ Active' : '❌ Fallback'}`);
      console.log(`  - Election key service: ${electionKeyService ? '✅ Active' : '❌ Fallback'}`);
      console.log(`  - Votes with real encryption: ${stats.encryptedVotes || 0}`);
      console.log(`  - Votes with fallback encryption: ${stats.fallbackVotes || 0}`);
      console.log('  - All votes include receipt codes for verification');

      // 6. Create diverse admin users and observer reports
      console.log('Creating diverse admin users and reports...');

      // Create 8 admin users with different types
      const additionalAdminIds = [];
      const additionalAdmins = [];

      // Define admin types to create (excluding SystemAdministrator which is already created)
      // These types MUST match exactly with UserRole enum values in src/types/auth.ts
      const adminTypesToCreate = [
        {
          type: 'ElectoralCommissioner',
          name: 'Electoral Commissioner',
          email: 'commissioner@securevote.ng',
        },
        { type: 'SecurityOfficer', name: 'Security Officer', email: 'security@securevote.ng' },
        { type: 'SystemAuditor', name: 'System Auditor', email: 'auditor@securevote.ng' },
        {
          type: 'RegionalElectoralOfficer',
          name: 'Regional Electoral Officer',
          email: 'regional@securevote.ng',
        },
        { type: 'ElectionManager', name: 'Election Manager', email: 'manager@securevote.ng' },
        {
          type: 'ResultVerificationOfficer',
          name: 'Result Verification Officer',
          email: 'verification@securevote.ng',
        },
        {
          type: 'PollingUnitOfficer',
          name: 'Polling Unit Officer',
          email: 'pollingunit@securevote.ng',
        },
        {
          type: 'VoterRegistrationOfficer',
          name: 'Voter Registration Officer',
          email: 'registration@securevote.ng',
        },
        {
          type: 'CandidateRegistrationOfficer',
          name: 'Candidate Registration Officer',
          email: 'candidate@securevote.ng',
        },
        { type: 'Observer', name: 'Election Observer', email: 'observer@securevote.ng' },
      ];

      // Validate that all admin types exist in our permission mapping
      const validAdminTypes = Object.keys(rolePermissionsMap);
      for (const adminConfig of adminTypesToCreate) {
        if (!validAdminTypes.includes(adminConfig.type)) {
          console.error(
            `❌ Invalid admin type: ${adminConfig.type}. Valid types: ${validAdminTypes.join(', ')}`,
          );
          throw new Error(`Invalid admin type: ${adminConfig.type}`);
        }
      }

      console.log(
        `✅ Validated ${adminTypesToCreate.length} admin types against permission mappings`,
      );

      for (let i = 0; i < adminTypesToCreate.length; i++) {
        const adminConfig = adminTypesToCreate[i];
        const adminUserId = generateUniqueId();
        additionalAdminIds.push(adminUserId);

        additionalAdmins.push({
          id: adminUserId,
          full_name: adminConfig.name,
          email: adminConfig.email,
          phone_number: `+2348${100000000 + i + 1}`,
          password_hash: DEFAULT_PASSWORD_HASH,
          admin_type: adminConfig.type,
          is_active: true,
          nin_encrypted: encryptIdentity(`1234567890${i + 1}`), // Directly encrypted for seeder
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Insert additional admin users
      await queryInterface.bulkInsert('admin_users', additionalAdmins);

      // Create roles and permissions for each admin type
      for (let i = 0; i < additionalAdminIds.length; i++) {
        const adminUserId = additionalAdminIds[i];
        const adminConfig = adminTypesToCreate[i];

        // Create role
        await queryInterface.bulkInsert('admin_roles', [
          {
            id: generateUniqueId(),
            admin_id: adminUserId,
            role_name: adminConfig.type,
            description: `${adminConfig.name} with specialized privileges`,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);

        // Add permissions based on role type
        const permissions = rolePermissionsMap[adminConfig.type] || [];
        const accessLevel = adminConfig.type === 'Observer' ? 'read' : 'write';

        for (const permission of permissions) {
          await queryInterface.bulkInsert('admin_permissions', [
            {
              id: generateUniqueId(),
              admin_id: adminUserId,
              permission_name: permission,
              access_level: accessLevel,
              granted_at: new Date(),
              granted_by: adminId, // System administrator grants the permission
              created_at: new Date(),
              updated_at: new Date(),
            },
          ]);
        }
      }

      console.log(`Created ${additionalAdminIds.length} additional admin users with diverse roles`);

      // Log admin credentials for development
      console.log('\n🔐 Admin Login Information (NIN + Password):');
      console.log('System Administrator:');
      console.log('  NIN: 12345678901');
      console.log(`  Password: ${DEFAULT_ADMIN_PASSWORD}`);
      console.log('\nAdditional Admin Users:');
      for (let i = 0; i < adminTypesToCreate.length; i++) {
        const adminConfig = adminTypesToCreate[i];
        console.log(
          `  ${adminConfig.name} - NIN: 1234567890${i + 1}, Password: ${DEFAULT_ADMIN_PASSWORD}`,
        );
      }

      console.log('\n🗳️  Voter Login Information (OTP-based):');
      console.log('Voters authenticate using:');
      console.log('  - NIN + VIN combination (encrypted lookup)');
      console.log('  - OTP verification (currently hardcoded: 723111 for POC)');
      console.log('  - No password required for voters');

      // Create observer reports for polling units
      console.log('Generating observer reports for polling units...');
      const observerReports = [];
      let reportCount = 0;

      // Get a random subset of polling units to create reports for (to avoid creating too many)
      // We'll create reports for about 20% of polling units
      const pollingUnitSubset = [];
      for (const state of allStates) {
        const statePollingUnits = pollingUnitsByState[state.name] || [];
        if (statePollingUnits.length > 0) {
          // Take 20% of polling units from each state, at least 1
          const numToTake = Math.max(1, Math.ceil(statePollingUnits.length * 0.2));
          const selectedUnits = statePollingUnits.slice(0, numToTake);
          pollingUnitSubset.push(...selectedUnits);
        }
      }

      console.log(
        `Selected ${pollingUnitSubset.length} polling units for observer reports out of ${puCounter} total units`,
      );

      // Review some reports
      const reviewerAdminId = adminId; // Super admin reviews reports

      for (const pollingUnit of pollingUnitSubset) {
        // For each polling unit, create reports for both presidential and gubernatorial (if Lagos)
        // For presidential election
        for (const reportType of reportTypes) {
          // Choose a random observer (find the observer admin in our list)
          const observerAdminIndex = adminTypesToCreate.findIndex(
            admin => admin.type === 'Observer',
          );
          const observerId =
            observerAdminIndex >= 0
              ? additionalAdminIds[observerAdminIndex]
              : additionalAdminIds[0];

          // Generate report content
          const content = generateReportContent(reportType, {
            polling_unit_name: `Polling Unit ${pollingUnit.code}`,
            registered_voters: VOTERS_PER_POLLING_UNIT,
          });

          // Determine if this report should be reviewed (30% chance)
          const isReviewed = Math.random() < 0.3;
          const status = isReviewed
            ? getRandomItem(['reviewed', 'resolved', 'rejected'])
            : 'pending';

          // Create the report
          const report = generateObserverReport(
            observerId,
            presidentialElectionId,
            pollingUnit.id,
            reportType,
            content,
            status,
            isReviewed ? reviewerAdminId : null,
          );

          observerReports.push(report);
          reportCount++;

          // If this is Lagos, also create report for gubernatorial election
          if (pollingUnit.state === 'Lagos') {
            const gubReport = generateObserverReport(
              observerId,
              lagosGubernatorialElectionId,
              pollingUnit.id,
              reportType,
              content.replace('Presidential', 'Gubernatorial'),
              status,
              isReviewed ? reviewerAdminId : null,
            );

            observerReports.push(gubReport);
            reportCount++;
          }

          // Insert in batches
          if (observerReports.length >= BATCH_SIZE) {
            await enhancedBatchInsert(queryInterface, 'observer_reports', observerReports);
            observerReports.length = 0;
            console.log(`Inserted batch of observer reports (total so far: ${reportCount})`);
          }
        }
      }

      // Insert any remaining reports
      if (observerReports.length > 0) {
        await enhancedBatchInsert(queryInterface, 'observer_reports', observerReports);
        console.log(`Inserted final batch of ${observerReports.length} observer reports`);
      }

      console.log(
        `Created ${reportCount} observer reports for ${pollingUnitSubset.length} polling units`,
      );

      // Update stats with admin information
      stats.additionalAdmins = additionalAdminIds.length;
      stats.observerReports = reportCount;

      // 7. Create election statistics for both elections
      console.log('Generating election statistics...');
      const electionStatsData = [];

      // Presidential election statistics
      const totalPresidentialVotes = stats.presidentialVotes;
      const totalRegisteredVoters = stats.voters;
      const turnoutPercentage = ((totalPresidentialVotes / totalRegisteredVoters) * 100).toFixed(2);

      // Calculate votes per candidate
      const presidentialVotesByCandidate = {};
      presidentialCandidateIds.forEach((id, index) => {
        // Give the winner about 50% of votes, distribute the rest
        const percentage = index === 0 ? 50 : index === 1 ? 30 : 20;
        const votes = Math.floor(totalPresidentialVotes * (percentage / 100));
        presidentialVotesByCandidate[id] = votes;
      });

      electionStatsData.push({
        id: generateUniqueId(),
        election_id: presidentialElectionId,
        total_votes: totalPresidentialVotes,
        valid_votes: totalPresidentialVotes - Math.floor(totalPresidentialVotes * 0.01),
        invalid_votes: Math.floor(totalPresidentialVotes * 0.01), // 1% invalid votes
        turnout_percentage: parseFloat(turnoutPercentage),
        last_updated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Lagos gubernatorial election statistics
      const totalGubernatorial = stats.lagosGubernatorial;
      const lagosVoters = Math.floor(totalRegisteredVoters / nigeriaStates.length); // Approximate Lagos voters
      const lagosTurnoutPercentage = ((totalGubernatorial / lagosVoters) * 100).toFixed(2);

      // Calculate votes per candidate for gubernatorial election
      const gubernatorialVotesByCandidate = {};
      gubernatorialCandidateIds.forEach((id, index) => {
        // Give the winner about 48% of votes, distribute the rest
        const percentage = index === 0 ? 48 : index === 1 ? 32 : 20;
        const votes = Math.floor(totalGubernatorial * (percentage / 100));
        gubernatorialVotesByCandidate[id] = votes;
      });

      electionStatsData.push({
        id: generateUniqueId(),
        election_id: lagosGubernatorialElectionId,
        total_votes: totalGubernatorial,
        valid_votes: totalGubernatorial - Math.floor(totalGubernatorial * 0.015),
        invalid_votes: Math.floor(totalGubernatorial * 0.015), // 1.5% invalid votes
        turnout_percentage: parseFloat(lagosTurnoutPercentage),
        last_updated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      await enhancedBatchInsert(queryInterface, 'election_stats', electionStatsData);
      console.log(`Created election statistics for Presidential and Lagos Gubernatorial elections`);
      stats.electionStats = electionStatsData.length;

      // 8. Generate failed authentication attempts
      console.log('Generating failed authentication attempts...');
      const failedAttempts = [];

      // Make sure we have voters to reference
      if (existingVoterIds.size === 0) {
        console.log(
          'Warning: No existing voter IDs found for failed attempts. Skipping failed attempts creation.',
        );
      } else {
        // Get a list of voter IDs to use
        const voterIds = Array.from(existingVoterIds);

        // Generate 50 failed voter login attempts
        for (let i = 0; i < 50; i++) {
          // Always use a valid voter ID since it's required
          const randomIndex = Math.floor(Math.random() * voterIds.length);
          const userId = voterIds[randomIndex];
          const timestamp = new Date();
          timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 14)); // Within last 2 weeks

          failedAttempts.push({
            id: generateUniqueId(),
            user_id: userId,
            attempt_type: 'login',
            ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            user_agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 (Reason: ${getRandomItem(['invalid_password', 'account_locked', 'mfa_failed'])})`,
            attempt_time: timestamp,
          });
        }

        // Generate some admin failed logins too - also need valid user_id
        for (let i = 0; i < 10; i++) {
          // Use an existing voter ID (since we need a valid ID)
          const randomIndex = Math.floor(Math.random() * voterIds.length);
          const userId = voterIds[randomIndex];
          const timestamp = new Date();
          timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 30)); // Within last month

          failedAttempts.push({
            id: generateUniqueId(),
            user_id: userId,
            attempt_type: 'admin_login',
            ip_address: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            user_agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36 (Reason: ${getRandomItem(['invalid_password', 'account_locked', 'rate_limited', 'suspicious_location'])})`,
            attempt_time: timestamp,
          });
        }

        await enhancedBatchInsert(queryInterface, 'failed_attempts', failedAttempts);
        console.log(`Created ${failedAttempts.length} failed authentication attempts`);
        stats.failedAttempts = failedAttempts.length;
      }

      // 9. Generate audit logs
      console.log('Generating audit logs...');
      const auditLogs = [];

      // System startup and configuration audit logs
      auditLogs.push({
        id: generateUniqueId(),
        action_type: 'system_startup',
        action_timestamp: new Date(new Date().setDate(new Date().getDate() - 30)),
        ip_address: '127.0.0.1',
        user_agent: 'System',
        action_details: JSON.stringify({
          entity_type: 'system',
          entity_id: null,
          user_type: 'system',
          message: 'System initialized successfully',
          environment: 'production',
          version: '1.0.0',
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 30)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 30)),
      });

      auditLogs.push({
        id: generateUniqueId(),
        action_type: 'config_change',
        action_timestamp: new Date(new Date().setDate(new Date().getDate() - 25)),
        user_id: null,
        admin_id: adminId,
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        action_details: JSON.stringify({
          entity_type: 'system_config',
          entity_id: null,
          user_type: 'admin',
          changes: {
            'security.session_timeout': '30 minutes',
            'security.rate_limit': '10 attempts per minute',
          },
          reason: 'Security enhancement',
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 25)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 25)),
      });

      // Election creation and management
      auditLogs.push({
        id: generateUniqueId(),
        action_type: 'election_created',
        action_timestamp: new Date(new Date().setDate(new Date().getDate() - 60)),
        user_id: null,
        admin_id: adminId,
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        action_details: JSON.stringify({
          entity_type: 'election',
          entity_id: presidentialElectionId,
          user_type: 'admin',
          election_name: 'Presidential Election 2027',
          election_type: 'PRESIDENTIAL',
          status: 'draft',
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 60)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 60)),
      });

      auditLogs.push({
        id: generateUniqueId(),
        action_type: 'election_status_changed',
        action_timestamp: new Date(new Date().setDate(new Date().getDate() - 45)),
        user_id: null,
        admin_id: adminId,
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        action_details: JSON.stringify({
          entity_type: 'election',
          entity_id: presidentialElectionId,
          user_type: 'admin',
          from_status: 'draft',
          to_status: 'scheduled',
          reason: 'Election date finalized',
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 45)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 45)),
      });

      // User authentication logs
      for (let i = 0; i < 20; i++) {
        if (existingVoterIds.size > 0) {
          const voterIds = Array.from(existingVoterIds);
          const randomVoterId = voterIds[Math.floor(Math.random() * voterIds.length)];

          auditLogs.push({
            id: generateUniqueId(),
            action_type: getRandomItem([
              'login_success',
              'logout',
              'password_changed',
              'profile_updated',
            ]),
            action_timestamp: new Date(
              new Date().setMinutes(new Date().getMinutes() - Math.floor(Math.random() * 10000)),
            ),
            user_id: randomVoterId,
            admin_id: null,
            ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            user_agent: getRandomItem(['Chrome', 'Firefox', 'Safari', 'Edge']),
            action_details: JSON.stringify({
              entity_type: 'voter',
              entity_id: randomVoterId,
              user_type: 'voter',
              browser: getRandomItem(['Chrome', 'Firefox', 'Safari', 'Edge']),
              os: getRandomItem(['Windows', 'MacOS', 'Android', 'iOS']),
              device_type: getRandomItem(['desktop', 'mobile', 'tablet']),
            }),
            is_suspicious: false,
            created_at: new Date(
              new Date().setMinutes(new Date().getMinutes() - Math.floor(Math.random() * 10000)),
            ),
            updated_at: new Date(
              new Date().setMinutes(new Date().getMinutes() - Math.floor(Math.random() * 10000)),
            ),
          });
        }
      }

      // Voting process audit logs
      for (let i = 0; i < 30; i++) {
        if (existingVoterIds.size > 0) {
          const voterIds = Array.from(existingVoterIds);
          const randomVoterId = voterIds[Math.floor(Math.random() * voterIds.length)];

          auditLogs.push({
            id: generateUniqueId(),
            action_type: 'vote_cast',
            action_timestamp: new Date(
              2027,
              1,
              25,
              8 + Math.floor(Math.random() * 9),
              Math.floor(Math.random() * 59),
            ),
            user_id: randomVoterId,
            admin_id: null,
            ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            user_agent: getRandomItem(['Chrome', 'Firefox', 'Safari', 'Edge']),
            action_details: JSON.stringify({
              entity_type: 'vote',
              entity_id: generateUniqueId(), // Just a placeholder
              user_type: 'voter',
              election_id:
                Math.random() < 0.8 ? presidentialElectionId : lagosGubernatorialElectionId,
              vote_method: getRandomItem(['web', 'mobile', 'offline']),
              verification_level: getRandomItem([1, 2, 3]),
              verification_method: getRandomItem(['biometric', 'otp', 'id_card']),
            }),
            is_suspicious: false,
            created_at: new Date(
              2027,
              1,
              25,
              8 + Math.floor(Math.random() * 9),
              Math.floor(Math.random() * 59),
            ),
            updated_at: new Date(
              2027,
              1,
              25,
              8 + Math.floor(Math.random() * 9),
              Math.floor(Math.random() * 59),
            ),
          });
        }
      }

      // System security audit logs
      auditLogs.push({
        id: generateUniqueId(),
        action_type: 'security_scan',
        action_timestamp: new Date(new Date().setDate(new Date().getDate() - 15)),
        user_id: null,
        admin_id: null,
        ip_address: '127.0.0.1',
        user_agent: 'System',
        action_details: JSON.stringify({
          entity_type: 'system',
          entity_id: null,
          user_type: 'system',
          scan_type: 'vulnerability',
          threats_detected: 0,
          scan_duration_seconds: 428,
          version: '1.0.5',
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 15)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 15)),
      });

      auditLogs.push({
        id: generateUniqueId(),
        action_type: 'encryption_key_rotation',
        action_timestamp: new Date(new Date().setDate(new Date().getDate() - 10)),
        user_id: null,
        admin_id: adminId,
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        action_details: JSON.stringify({
          entity_type: 'security',
          entity_id: null,
          user_type: 'admin',
          key_type: 'AES-256',
          rotation_reason: 'Scheduled',
          scheduled: true,
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 10)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 10)),
      });

      await enhancedBatchInsert(queryInterface, 'audit_logs', auditLogs);
      console.log(`Created ${auditLogs.length} audit logs`);
      stats.auditLogs = auditLogs.length;

      // Note: admin_logs table creation skipped - no AdminLog model exists
      console.log('Skipping admin logs creation - no AdminLog model found');

      // Print updated summary statistics
      console.log(`\nUpdated Data Creation Summary:`);
      console.log(`- Voters: ${stats.voters}`);
      console.log(`- Verification Statuses: ${stats.verificationStatuses}`);
      console.log(`- Presidential Votes: ${stats.presidentialVotes}`);
      console.log(`- Lagos Gubernatorial Votes: ${stats.lagosGubernatorial}`);
      console.log(`- Votes with Real Encryption: ${stats.encryptedVotes || 0}`);
      console.log(`- Votes with Fallback Encryption: ${stats.fallbackVotes || 0}`);
      console.log(`- System Administrator: 1`);
      console.log(`- Additional Admin Users: ${stats.additionalAdmins}`);
      console.log(`- Observer Reports: ${stats.observerReports}`);
      console.log(`- Election Stats: ${stats.electionStats}`);
      console.log(`- Failed Authentication Attempts: ${stats.failedAttempts}`);
      console.log(`- Audit Logs: ${stats.auditLogs}`);
      console.log(`- OTP Logs: ${stats.otpLogs || 0}`);

      return true;
    } catch (error) {
      console.error('Error during database seeding:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Clear data in reverse order to avoid foreign key constraints
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Clear all sets
      allVoterIds.clear();
      voterElectionVotes.clear();
      existingVoterIds.clear();
      batchVoterIds.clear();
      usedNINs.clear();
      usedVINs.clear();

      await queryInterface.bulkDelete('observer_reports', null, { transaction });
      await queryInterface.bulkDelete('ussd_votes', null, { transaction });
      await queryInterface.bulkDelete('ussd_sessions', null, { transaction });
      await queryInterface.bulkDelete('audit_logs', null, { transaction });
      await queryInterface.bulkDelete('otp_logs', null, { transaction });
      await queryInterface.bulkDelete('failed_attempts', null, { transaction });
      await queryInterface.bulkDelete('votes', null, { transaction });
      await queryInterface.bulkDelete('election_stats', null, { transaction });
      await queryInterface.bulkDelete('verification_statuses', null, { transaction });
      await queryInterface.bulkDelete('voters', null, { transaction });
      await queryInterface.bulkDelete('candidates', null, { transaction });
      await queryInterface.bulkDelete('election_keys', null, { transaction });
      await queryInterface.bulkDelete('elections', null, { transaction });
      await queryInterface.bulkDelete('polling_units', null, { transaction });
      await queryInterface.bulkDelete('admin_permissions', null, { transaction });
      await queryInterface.bulkDelete('admin_roles', null, { transaction });
      await queryInterface.bulkDelete('admin_users', null, { transaction });

      await transaction.commit();
      console.log('All seeded data removed');
    } catch (error) {
      await transaction.rollback();
      console.error('Error removing seeded data:', error);
      throw error;
    }
  },

  // Export constants for use in the optimized seeder
  MAX_VOTERS_PER_STATE,
  DEFAULT_MAX_VOTERS_PER_STATE,
  BATCH_SIZE,
  POLLING_UNITS_PER_STATE,
  VOTERS_PER_POLLING_UNIT,
};

// Helper function to insert voters with proper field mapping and encryption
async function insertVotersWithCorrectMapping(queryInterface, voterBatch) {
  console.log(`Inserting ${voterBatch.length} voters with correct field mapping...`);
  
  let insertedCount = 0;
  
  try {
    // Validate and convert voter data to match the database schema exactly
    const encryptedVoterBatch = [];
    const processedNins = new Set();
    const processedVins = new Set();
    
    for (const voter of voterBatch) {
      // Skip if required fields are missing
      if (!voter.id || !voter.nin || !voter.vin || !voter.phone_number || !voter.full_name) {
        console.warn(`Skipping voter with missing required fields: ${voter.id}`);
        continue;
      }
      
      // Validate phone number format
      if (!voter.phone_number.match(/^\+?[0-9]{10,15}$/)) {
        console.warn(`Skipping voter with invalid phone number: ${voter.phone_number}`);
        continue;
      }
      
      // Validate email format if provided
      if (voter.email && !voter.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        console.warn(`Skipping voter with invalid email: ${voter.email}`);
        continue;
      }
      
      // Validate gender
      if (voter.gender && !['male', 'female'].includes(voter.gender)) {
        voter.gender = 'male'; // Default to male
      }
      
      // Generate unique encrypted values with collision detection
      let ninEncrypted, vinEncrypted;
      let attempts = 0;
      
      do {
        ninEncrypted = encryptIdentity(`${voter.nin}-${Date.now()}-${Math.random()}`);
        attempts++;
      } while (processedNins.has(ninEncrypted) && attempts < 10);
      
      if (processedNins.has(ninEncrypted)) {
        console.warn(`Could not generate unique encrypted NIN for voter: ${voter.id}`);
        continue;
      }
      
      attempts = 0;
      do {
        vinEncrypted = encryptIdentity(`${voter.vin}-${Date.now()}-${Math.random()}`);
        attempts++;
      } while (processedVins.has(vinEncrypted) && attempts < 10);
      
      if (processedVins.has(vinEncrypted)) {
        console.warn(`Could not generate unique encrypted VIN for voter: ${voter.id}`);
        continue;
      }
      
      processedNins.add(ninEncrypted);
      processedVins.add(vinEncrypted);
      
      // Create the database record with correct field mapping and validation
      const dbRecord = {
        id: voter.id,
        phone_number: voter.phone_number.substring(0, 15), // Ensure max length
        date_of_birth: voter.date_of_birth,
        full_name: voter.full_name.substring(0, 100), // Ensure max length
        polling_unit_code: voter.polling_unit_code.substring(0, 50), // Ensure max length
        state: voter.state.substring(0, 50), // Ensure max length
        gender: voter.gender || 'male',
        lga: voter.lga.substring(0, 50), // Ensure max length
        ward: voter.ward.substring(0, 100), // Ensure max length
        is_active: voter.is_active !== undefined ? voter.is_active : true,
        mfa_enabled: voter.mfa_enabled !== undefined ? voter.mfa_enabled : false,
        email: voter.email ? voter.email.substring(0, 100) : null, // Ensure max length
        otp_code: voter.otp_code ? voter.otp_code.substring(0, 6) : null, // Ensure max length
        otp_expires_at: voter.otp_expires_at || null,
        otp_verified: voter.otp_verified !== undefined ? voter.otp_verified : false,
        created_at: voter.created_at || new Date(),
        updated_at: voter.updated_at || new Date(),
        // Handle encryption with uniqueness
        nin_encrypted: ninEncrypted,
        vin_encrypted: vinEncrypted,
        // Optional fields with defaults
        recovery_token: null,
        recovery_token_expiry: null,
        last_login: null,
        mfa_secret: null,
        mfa_backup_codes: null,
        public_key: null,
      };
      
      encryptedVoterBatch.push(dbRecord);
    }
    
    if (encryptedVoterBatch.length === 0) {
      console.log('No valid voters to insert after validation');
      return 0;
    }
    
    console.log(`Validated ${encryptedVoterBatch.length}/${voterBatch.length} voters for insertion`);
    
    // Use bulk insert with the properly formatted and validated data
    await queryInterface.bulkInsert('voters', encryptedVoterBatch);
    insertedCount = encryptedVoterBatch.length;
    
    // Update tracking
    encryptedVoterBatch.forEach(voter => {
      existingVoterIds.add(voter.id);
    });
    
    console.log(`Successfully inserted ${insertedCount}/${voterBatch.length} voters with correct mapping`);
    return insertedCount;
    
  } catch (error) {
    console.error('Error inserting voters with correct mapping:', error.message);
    
    // For debugging, check if it's a specific constraint violation
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      console.error('Unique constraint violation detected - likely duplicate encrypted values');
    }
    
    // Try individual inserts for debugging
    console.log('Attempting individual voter insertions for debugging...');
    
    for (let i = 0; i < Math.min(voterBatch.length, 5); i++) {
      const voter = voterBatch[i];
      
      try {
        // Apply same validation as above but for individual records
        if (!voter.id || !voter.nin || !voter.vin || !voter.phone_number || !voter.full_name) {
          console.warn(`Skipping individual voter with missing required fields: ${voter.id}`);
          continue;
        }
        
        if (!voter.phone_number.match(/^\+?[0-9]{10,15}$/)) {
          console.warn(`Skipping individual voter with invalid phone number: ${voter.phone_number}`);
          continue;
        }
        
        const dbRecord = {
          id: voter.id,
          phone_number: voter.phone_number.substring(0, 15),
          date_of_birth: voter.date_of_birth,
          full_name: voter.full_name.substring(0, 100),
          polling_unit_code: voter.polling_unit_code.substring(0, 50),
          state: voter.state.substring(0, 50),
          gender: voter.gender || 'male',
          lga: voter.lga.substring(0, 50),
          ward: voter.ward.substring(0, 100),
          is_active: voter.is_active !== undefined ? voter.is_active : true,
          mfa_enabled: voter.mfa_enabled !== undefined ? voter.mfa_enabled : false,
          email: voter.email ? voter.email.substring(0, 100) : null,
          otp_code: voter.otp_code ? voter.otp_code.substring(0, 6) : null,
          otp_expires_at: voter.otp_expires_at || null,
          otp_verified: voter.otp_verified !== undefined ? voter.otp_verified : false,
          created_at: voter.created_at || new Date(),
          updated_at: voter.updated_at || new Date(),
          nin_encrypted: encryptIdentity(`${voter.nin}-${Date.now()}-${Math.random()}-${i}`),
          vin_encrypted: encryptIdentity(`${voter.vin}-${Date.now()}-${Math.random()}-${i}`),
          recovery_token: null,
          recovery_token_expiry: null,
          last_login: null,
          mfa_secret: null,
          mfa_backup_codes: null,
          public_key: null,
        };
        
        await queryInterface.bulkInsert('voters', [dbRecord]);
        insertedCount++;
        existingVoterIds.add(voter.id);
        
        console.log(`Successfully inserted individual voter ${i + 1}: ${voter.id}`);
        
      } catch (individualError) {
        console.error(`Failed to insert individual voter ${i + 1}: ${individualError.message}`);
      }
    }
    
    return insertedCount;
  }
}

// Helper function to insert all related data in a coordinated way with simplified error handling
async function insertIntegratedBatch(
  queryInterface,
  voterBatch,
  verificationStatusBatch,
  presidentialVoteBatch,
  gubernatorialVoteBatch,
) {
  console.log(`Processing integrated batch of ${voterBatch.length} voters and related data...`);

  // 1. Insert voters first (they're required for foreign keys)
  const insertedVoterCount = await insertVotersWithCorrectMapping(queryInterface, voterBatch);
  
  if (insertedVoterCount === 0) {
    console.log('No voters were inserted, skipping related data');
    return;
  }

  // 2. Update tracking with successfully inserted voter IDs
  voterBatch.slice(0, insertedVoterCount).forEach(voter => {
    existingVoterIds.add(voter.id);
    if (voter.nin) usedNINs.add(voter.nin);
    if (voter.vin) usedVINs.add(voter.vin);
  });

  console.log(`Updated tracking with ${insertedVoterCount} voter IDs (total tracked: ${existingVoterIds.size})`);

  // 3. Insert verification statuses (only for successfully inserted voters)
  const relevantVerificationStatuses = verificationStatusBatch.slice(0, insertedVoterCount);
  if (relevantVerificationStatuses.length > 0) {
    try {
      await queryInterface.bulkInsert('verification_statuses', relevantVerificationStatuses);
      console.log(`Inserted ${relevantVerificationStatuses.length} verification statuses`);
    } catch (error) {
      console.error('Error inserting verification statuses:', error.message);
    }
  }

  // 4. Insert presidential votes (only for successfully inserted voters)
  const relevantPresidentialVotes = presidentialVoteBatch.slice(0, insertedVoterCount);
  if (relevantPresidentialVotes.length > 0) {
    try {
      await queryInterface.bulkInsert('votes', relevantPresidentialVotes);
      console.log(`Inserted ${relevantPresidentialVotes.length} presidential votes`);
    } catch (error) {
      console.error('Error inserting presidential votes:', error.message);
    }
  }

  // 5. Insert gubernatorial votes if any (only for successfully inserted voters)
  if (gubernatorialVoteBatch.length > 0) {
    const relevantGubernatorialVotes = gubernatorialVoteBatch.slice(0, insertedVoterCount);
    if (relevantGubernatorialVotes.length > 0) {
      try {
        await queryInterface.bulkInsert('votes', relevantGubernatorialVotes);
        console.log(`Inserted ${relevantGubernatorialVotes.length} gubernatorial votes`);
      } catch (error) {
        console.error('Error inserting gubernatorial votes:', error.message);
      }
    }
  }

  console.log(`Successfully processed batch with ${insertedVoterCount} integrated voter records`);
}
