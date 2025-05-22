'use strict';

/**
 * Seeder for SecureBallot application
 * 
 * This seeder creates test data for the application in the following order:
 * 1. Admin users (including super admin)
 * 2. Admin roles and permissions
 * 3. Elections
 * 4. Election stats
 * 5. Candidates
 * 6. Polling units
 * 7. Voters
 * 8. Voter cards
 * 9. Verification statuses
 * 10. Votes
 * 11. Audit logs
 * 12. USSD sessions and votes
 * 13. Observer reports
 * 14. Admin logs
 * 
 * The order is important to maintain referential integrity and prevent foreign key constraint errors.
 * Relationships between tables are carefully managed to ensure data consistency.
 */

const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const naijaFaker = require('@codegrenade/naija-faker');
const { v4: uuidv4 } = require('uuid');

// Constants for our seed data
const SALT_ROUNDS = 10;

// Read configuration from environment variables or use defaults
// Maximum voters per state - acts as a safety limit that overrides VOTERS_PER_POLLING_UNIT when needed
let MAX_VOTERS_PER_STATE = process.env.SEED_MAX_VOTERS_PER_STATE ? 
  parseInt(process.env.SEED_MAX_VOTERS_PER_STATE, 10) : 2000;

// Batch size for bulk inserts to prevent memory issues
const BATCH_SIZE = process.env.SEED_BATCH_SIZE ? 
  parseInt(process.env.SEED_BATCH_SIZE, 10) : 200;

// Configuration for scaling data generation
const POLLING_UNITS_PER_STATE = 1;
const VOTERS_PER_POLLING_UNIT = 5;

// Default values if not set
const DEFAULT_MAX_VOTERS_PER_STATE = 400;

// Use a single password hash for all test users to avoid bcrypt overhead
const DEFAULT_PASSWORD_HASH = '$2b$10$1XpzUYu8FuvuJj.PoUMvZOFFWGYoR0jbJ6qZmHX5.G9qujpJjEKyy'; // hash for 'password123'
// Sets to track unique identifiers
const allVoterIds = new Set();
// Set to track voter-election combinations to prevent duplicate votes
const voterElectionVotes = new Set();
// Set to log all previously used voter IDs from database
const existingVoterIds = new Set();

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
  { name: 'Zamfara', code: 'ZA' }
];

// Admin types (aligned with UserRole enum in src/types/auth.ts)
const adminTypes = [
  'SystemAdministrator',
  'ElectoralCommissioner',
  'SecurityOfficer',
  'SystemAuditor',
  'RegionalElectoralOfficer',
  'ElectionManager',
  'ResultVerificationOfficer',
  'PollingUnitOfficer',
  'VoterRegistrationOfficer',
  'CandidateRegistrationOfficer',
  'Observer',
  'Voter'
];

// Role hierarchy (aligned with UserRole enum)
const roleHierarchy = {
  SystemAdministrator: 100,
  ElectoralCommissioner: 90,
  SecurityOfficer: 85,
  SystemAuditor: 80,
  RegionalElectoralOfficer: 70,
  ElectionManager: 65,
  ResultVerificationOfficer: 60,
  PollingUnitOfficer: 50,
  VoterRegistrationOfficer: 45,
  CandidateRegistrationOfficer: 40,
  Observer: 20,
  Voter: 10
};

// Permission mapping based on roles (aligned with Permission enum in src/types/auth.ts)
const rolePermissionsMap = {
  'SystemAdministrator': [
    'manage_users',
    'manage_roles',
    'manage_system_settings',
    'view_audit_logs',
    'generate_reports',
    'manage_security_settings',
    'manage_encryption_keys',
    'view_security_logs'
  ],
  'ElectoralCommissioner': [
    'create_election',
    'edit_election',
    'delete_election',
    'manage_candidates',
    'publish_results',
    'generate_reports',
    'view_results',
    'export_results'
  ],
  'SecurityOfficer': [
    'manage_security_settings',
    'manage_encryption_keys',
    'view_security_logs',
    'view_audit_logs'
  ],
  'SystemAuditor': [
    'view_audit_logs',
    'generate_reports',
    'view_security_logs'
  ],
  'RegionalElectoralOfficer': [
    'manage_polling_units',
    'assign_officers',
    'view_results'
  ],
  'ElectionManager': [
    'edit_election',
    'manage_candidates',
    'view_results',
    'generate_reports'
  ],
  'ResultVerificationOfficer': [
    'view_results',
    'verify_results',
    'export_results'
  ],
  'PollingUnitOfficer': [
    'verify_voters'
  ],
  'VoterRegistrationOfficer': [
    'register_voters',
    'verify_voters',
    'reset_voter_password'
  ],
  'CandidateRegistrationOfficer': [
    'manage_candidates'
  ],
  'Observer': [
    'view_elections',
    'view_results'
  ]
};

// Election types (aligned with ElectionType enum in src/db/models/Election.ts)
const electionTypes = [
  'Presidential',
  'Gubernatorial',
  'Senatorial',
  'HouseOfReps',
  'StateAssembly',
  'LocalGovernment'
];

// Election statuses (aligned with ElectionStatus enum in src/db/models/Election.ts)
const electionStatuses = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Candidate statuses (aligned with CandidateStatus enum in src/db/models/Candidate.ts)
const candidateStatuses = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DISQUALIFIED: 'disqualified'
};

// Observer report types
const reportTypes = ['PollingUnitOpening', 'VoterTurnout', 'Irregularity', 'PollingUnitClosing', 'VoteCounting'];

// Report statuses
const reportStatuses = ['pending', 'reviewed', 'resolved', 'rejected'];

// Vote sources (aligned with VoteSource enum in src/db/models/Vote.ts)
const voteSources = ['web', 'mobile', 'ussd', 'offline'];

// Presidential candidates
const PRESIDENTIAL_CANDIDATES = [
  {
    fullName: 'Peter Gregory Obi',
    partyCode: 'LP',
    partyName: 'Labour Party',
    bio: 'Former Governor of Anambra State and businessman',
    position: 'Presidential Candidate',
    manifesto: 'Economic recovery and security for all Nigerians'
  },
  {
    fullName: 'Atiku Abubakar',
    partyCode: 'PDP',
    partyName: 'Peoples Democratic Party',
    bio: 'Former Vice President of Nigeria and businessman',
    position: 'Presidential Candidate',
    manifesto: 'Unity, restructuring and development'
  },
  {
    fullName: 'Bola Ahmed Tinubu',
    partyCode: 'APC',
    partyName: 'All Progressives Congress',
    bio: 'Former Governor of Lagos State and national leader',
    position: 'Presidential Candidate',
    manifesto: 'Renewed hope agenda for Nigeria'
  }
];

// Gubernatorial candidates for Lagos
const lagosGubernatorialCandidates = [
  {
    fullName: 'Babajide Sanwo-Olu',
    partyCode: 'APC',
    partyName: 'All Progressives Congress',
    bio: 'Incumbent Governor of Lagos State',
    position: 'Gubernatorial Candidate',
    manifesto: 'Continuing the development of Lagos State'
  },
  {
    fullName: 'Gbadebo Rhodes-Vivour',
    partyCode: 'LP',
    partyName: 'Labour Party',
    bio: 'Architect and social activist',
    position: 'Gubernatorial Candidate',
    manifesto: 'A new direction for Lagos State'
  },
  {
    fullName: 'Abdul-Azeez Olajide Adediran',
    partyCode: 'PDP',
    partyName: 'Peoples Democratic Party',
    bio: 'Businessman and philanthropist',
    position: 'Gubernatorial Candidate',
    manifesto: 'Wealth creation and infrastructural development'
  }
];

// Helper function to generate a random password hash
// Only use this for specific cases where unique passwords are required
async function generatePasswordHash(password = faker.internet.password()) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Helper function to validate voter records before insertion
function validateVoterRecord(record) {
  const validationIssues = [];
  
  // Check required fields
  if (!record.id) validationIssues.push('Missing id');
  if (!record.nin) validationIssues.push('Missing nin');
  if (!record.vin) validationIssues.push('Missing vin');
  if (!record.phone_number) validationIssues.push('Missing phone_number');
  if (!record.date_of_birth) validationIssues.push('Missing date_of_birth');
  if (!record.password_hash) validationIssues.push('Missing password_hash');
  if (record.mfa_enabled === undefined) validationIssues.push('Missing mfa_enabled');
  
  // Return immediately if any required field is missing
  if (validationIssues.length > 0) {
    return { valid: false, issues: validationIssues };
  }
  
  // Check NIN is exactly 11 characters
  if (typeof record.nin !== 'string' || record.nin.length !== 11) {
    validationIssues.push(`NIN must be exactly 11 characters, got ${record.nin.length}`);
  }
  
  // Check VIN is exactly 19 characters
  if (typeof record.vin !== 'string' || record.vin.length !== 19) {
    validationIssues.push(`VIN must be exactly 19 characters, got ${record.vin.length}`);
  }
  
  // Check phone number format (Nigeria format: +234...)
  if (typeof record.phone_number !== 'string' || !record.phone_number.startsWith('+234')) {
    validationIssues.push('Phone number must be in Nigeria format (+234...)');
  }
  
  // Return validation result
  return { 
    valid: validationIssues.length === 0,
    issues: validationIssues
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
      )`
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
      `SELECT 1 FROM ${tableName} WHERE ${pkColumn} = '${pkValue}'`
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
      
      // Check if the foreign key exists in the target table
      const exists = await checkRecordExists(
        queryInterface, 
        relation.table, 
        relation.column, 
        fkValue
      );
      
      if (!exists) {
        console.log(`Foreign key constraint violation: ${fkField}=${fkValue} does not exist in ${relation.table}.${relation.column}`);
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
    invalid: invalidRecords
  };
}

// Enhanced batch insert with foreign key validation
async function enhancedBatchInsert(queryInterface, tableName, data, relationMap = {}, batchSize = BATCH_SIZE) {
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
    'elections': {
      'created_by': { table: 'admin_users', column: 'id', onDelete: 'RESTRICT' }
    },
    'candidates': {
      'election_id': { table: 'elections', column: 'id', onDelete: 'CASCADE' }
    },
    'voter_cards': {
      'user_id': { table: 'voters', column: 'id', onDelete: 'CASCADE' },
      'polling_unit_code': { table: 'polling_units', column: 'polling_unit_code', onDelete: 'RESTRICT' }
    },
    'votes': {
      'user_id': { table: 'voters', column: 'id', onDelete: 'RESTRICT' },
      'election_id': { table: 'elections', column: 'id', onDelete: 'RESTRICT' },
      'candidate_id': { table: 'candidates', column: 'id', onDelete: 'RESTRICT' },
      'polling_unit_id': { table: 'polling_units', column: 'id', onDelete: 'RESTRICT' }
    },
    'verification_statuses': {
      'user_id': { table: 'voters', column: 'id', onDelete: 'CASCADE' }
    },
    'ussd_votes': {
      'user_id': { table: 'voters', column: 'id', onDelete: 'RESTRICT' },
      'election_id': { table: 'elections', column: 'id', onDelete: 'RESTRICT' },
      'candidate_id': { table: 'candidates', column: 'id', onDelete: 'RESTRICT' },
      'session_code': { table: 'ussd_sessions', column: 'session_code', onDelete: 'CASCADE' }
    },
    'observer_reports': {
      'observer_id': { table: 'admin_users', column: 'id', onDelete: 'SET NULL' },
      'election_id': { table: 'elections', column: 'id', onDelete: 'CASCADE' },
      'polling_unit_id': { table: 'polling_units', column: 'id', onDelete: 'CASCADE' },
      'reviewed_by': { table: 'admin_users', column: 'id', onDelete: 'SET NULL' }
    }
  };
  
  // Merge passed relationMap with the predefined table relationships
  const effectiveRelationMap = {
    ...(tableRelationships[tableName] || {}),
    ...relationMap
  };
  
  // For tables with foreign keys, validate all foreign keys first
  if (Object.keys(effectiveRelationMap).length > 0) {
    console.log(`Validating foreign keys for ${tableName} against ${Object.keys(effectiveRelationMap).length} related tables...`);
    const { valid, invalid } = await validateForeignKeys(queryInterface, data, effectiveRelationMap);
    
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

// Helper function to insert data in batches to prevent memory issues
async function batchInsert(queryInterface, tableName, data, batchSize = BATCH_SIZE) {
  console.log(`Batch inserting ${data.length} records into ${tableName}...`);
  
  // Early return for empty data
  if (!data || data.length === 0) {
    console.log(`No data to insert into ${tableName}`);
    return 0;
  }
  
  // For voter records, pre-validate and filter out invalid ones and duplicates
  if (tableName === 'voters') {
    // Track IDs to detect duplicates within this batch
    const batchIds = new Set();
    
    // Validate each record and check for duplicate IDs
    const validRecords = data.filter(record => {
      // First validate the record
      const validation = validateVoterRecord(record);
      if (!validation.valid) {
        // Skip invalid records
        return false;
      }
      
      // Then check for duplicate IDs
      if (batchIds.has(record.id)) {
        // Skip duplicate IDs within this batch
        return false;
      }
      
      // Also check if this ID already exists in the database
      if (existingVoterIds.has(record.id)) {
        // Skip records where the ID already exists in the database
        return false;
      }
      
      // If passed all checks, add to the set of batch IDs and keep this record
      batchIds.add(record.id);
      return true;
    });
    
    const skippedCount = data.length - validRecords.length;
    if (skippedCount > 0) {
      // Calculate stats on why records were filtered
      const invalidRecords = data.filter(record => !validateVoterRecord(record).valid).length;
      const duplicatesInBatch = new Set(data.map(r => r.id)).size !== data.length ? 
                                data.length - new Set(data.map(r => r.id)).size : 0;
      const duplicatesInDb = data.filter(record => existingVoterIds.has(record.id)).length;
      
      console.log(`Filtered out ${skippedCount} voter records before insertion:`);
      console.log(`- Invalid records: ${invalidRecords}`);
      console.log(`- Duplicates within batch: ${duplicatesInBatch}`);
      console.log(`- Duplicates with database: ${duplicatesInDb}`);
    }
    
    // Only process and use valid records
    data = validRecords;
    
    // Early return if all data was filtered out
    if (data.length === 0) {
      console.log(`No valid voter records to insert after filtering`);
      return 0;
    }
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
      // Debug info - log the fields in the first record of voter batch
      if (tableName === 'voters' && i === 0) {
        const sampleRecord = { ...batch[0] };
        if (sampleRecord.password_hash) {
          // Truncate password hash for cleaner logs
          sampleRecord.password_hash = sampleRecord.password_hash.substring(0, 20) + '...';
        }
        console.log('Sample record structure:', JSON.stringify(sampleRecord, null, 2));
      }
      
      // Try to insert the batch
      await queryInterface.bulkInsert(tableName, batch);
      
      // If we get here, the insertion succeeded
      insertedCount += batch.length;
      console.log(`Inserted batch ${i+1}/${batches.length} (${insertedCount}/${data.length} records)`);
      
      // For voter records, update the tracking sets
      if (tableName === 'voters') {
        batch.forEach(record => {
          existingVoterIds.add(record.id);
          
          // Track NIns and VINs too
          if (record.nin) usedNINs.add(record.nin);
          if (record.vin) usedVINs.add(record.vin);
        });
      }
    } catch (error) {
      console.error(`Error inserting batch ${i+1} into ${tableName}: ${error.message}`);
      
      // Special handling for foreign key constraint violations
      if (error.message.includes('foreign key constraint')) {
        console.log('Foreign key constraint violation - skipping this batch');
        
        // Log the first few foreign keys that might be causing issues
        if (tableName === 'voter_cards' || tableName === 'verification_statuses' || 
            tableName === 'votes' || tableName === 'audit_logs') {
          const sampleUserIds = batch.slice(0, 5).map(r => r.user_id);
          console.log(`Sample foreign key (user_id) values: ${sampleUserIds.join(', ')}`);
          
          // Check if these IDs exist in the voter table
          const existingIds = sampleUserIds.filter(id => existingVoterIds.has(id));
          console.log(`Of these, ${existingIds.length} exist in our tracking set`);
          
          // If we're in a development environment, try to query the database to double-check
          try {
            const [results] = await queryInterface.sequelize.query(
              `SELECT id FROM voters WHERE id IN (${sampleUserIds.map(id => `'${id}'`).join(',')})`
            );
            console.log(`Database check shows ${results.length} of these IDs exist in voters table`);
          } catch (dbError) {
            console.error('Error checking voter IDs in database:', dbError.message);
          }
        }
        
        // For batches with FK constraints, try smaller batches or individual inserts
        if (batch.length > 1 && ['voter_cards', 'verification_statuses', 'votes', 'audit_logs'].includes(tableName)) {
          console.log(`Attempting individual insertion of ${batch.length} records...`);
          
          let individualSuccesses = 0;
          let individualFailures = 0;
          const maxIndividualAttempts = Math.min(batch.length, 50); // Limit individual attempts to 50 max
          const errorSamples = [];
          
          for (let j = 0; j < maxIndividualAttempts; j++) {
            try {
              const record = batch[j];
              
              // For foreign key relations, first verify the foreign key exists
              if (record.user_id) {
                const [userExists] = await queryInterface.sequelize.query(
                  `SELECT 1 FROM voters WHERE id = '${record.user_id}'`
                );
                
                if (userExists.length === 0) {
                  console.log(`Foreign key check: User ID ${record.user_id} does not exist - skipping record ${j+1}/${maxIndividualAttempts}`);
                  individualFailures++;
                  continue;
                }
              }
              
              await queryInterface.bulkInsert(tableName, [record]);
              individualSuccesses++;
              
              // Log progress every 10 successful insertions
              if (individualSuccesses % 10 === 0) {
                console.log(`Progress: ${individualSuccesses} records successfully inserted`);
              }
            } catch (indivError) {
              individualFailures++;
              
              // Collect sample errors (up to 3) for later analysis
              if (errorSamples.length < 3) {
                errorSamples.push({
                  index: j,
                  message: indivError.message.substring(0, 150) // Truncate message
                });
              }
              
              // Log progress every 10 failures
              if (individualFailures % 10 === 0) {
                console.log(`Progress: ${individualFailures} individual insertions failed`);
              }
            }
          }
          
          // Provide detailed report after individual insertions
          console.log(`Individual insertion results:`);
          console.log(`- Successful: ${individualSuccesses}/${maxIndividualAttempts}`);
          console.log(`- Failed: ${individualFailures}/${maxIndividualAttempts}`);
          
          if (errorSamples.length > 0) {
            console.log(`Sample error messages from failed insertions:`);
            errorSamples.forEach((sample, idx) => {
              console.log(`  ${idx+1}. Record #${sample.index}: ${sample.message}`);
            });
          }
          
          if (individualSuccesses > 0) {
            console.log(`Added ${individualSuccesses} records through individual insertion`);
            insertedCount += individualSuccesses;
          } else if (batch.length > maxIndividualAttempts) {
            console.log(`Limited individual insertion attempts to ${maxIndividualAttempts} out of ${batch.length} records`);
          } else {
            console.log(`Failed to insert any records individually`);
          }
        }
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
  
  console.log(`Vote distribution: Winner (${winnerIndex}) gets ${votes[winnerIndex]} out of ${adjustedTotal} total votes`);
  
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
        'Party supporter distributing items near polling unit was moved away by security.'
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

const generateObserverReport = (observerId, electionId, pollingUnitId, reportType, content, status = 'pending', reviewerId = null) => {
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
      { type: 'document', url: 'https://example.com/reports/doc1.pdf' }
    ]),
    status,
    reported_at: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  };

  if (status !== 'pending' && reviewerId) {
    report.reviewed_by = reviewerId;
    report.official_response = `Review completed on ${faker.date.recent({ days: 7 }).toLocaleDateString()}`;
    report.reviewed_at = faker.date.recent({ days: 7 });
  }

  return report;
};

// Helper function to generate a dummy encrypted vote data
function generateEncryptedVoteData(candidateId) {
  // In a real application, this would be properly encrypted
  // For seeding, we'll create a Buffer with the candidate ID
  const dummyData = `Vote for candidate: ${candidateId}`;
  return Buffer.from(dummyData);
}

// Helper function to generate a vote hash
function generateVoteHash(userId, electionId, candidateId) {
  const data = `${userId}:${electionId}:${candidateId}:${Date.now()}`;
  return require('crypto').createHash('sha256').update(data).digest('hex');
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('Starting improved database seeding with proper relationship handling...');
      console.log(`Using MAX_VOTERS_PER_STATE: ${MAX_VOTERS_PER_STATE}`);
      
      // Calculate total potential voters and apply scaling if needed
      const allStates = nigeriaStates;
      const totalStates = allStates.length;
      const totalPotentialPollingUnits = totalStates * POLLING_UNITS_PER_STATE;
      const totalPotentialVoters = totalPotentialPollingUnits * VOTERS_PER_POLLING_UNIT;
      const totalMaxVoters = totalStates * MAX_VOTERS_PER_STATE;
      
      // Calculate scaling factor based on MAX_VOTERS_PER_STATE
      const scalingFactor = Math.min(1, totalMaxVoters / totalPotentialVoters);
      const scaledVotersPerPollingUnit = Math.floor(VOTERS_PER_POLLING_UNIT * scalingFactor);
      const pollingUnitsToUse = scaledVotersPerPollingUnit > 0 ? POLLING_UNITS_PER_STATE : 
                               Math.max(1, Math.floor(MAX_VOTERS_PER_STATE / VOTERS_PER_POLLING_UNIT));
      
      console.log(`Scaling configuration:`);
      console.log(`- Total states: ${totalStates}`);
      console.log(`- Polling units per state: ${pollingUnitsToUse} (target: ${POLLING_UNITS_PER_STATE})`);
      console.log(`- Voters per polling unit: ${scaledVotersPerPollingUnit} (target: ${VOTERS_PER_POLLING_UNIT})`);
      console.log(`- Total potential voters: ${totalPotentialVoters}`);
      console.log(`- Max voters allowed: ${totalMaxVoters}`);
      console.log(`- Scaling factor: ${scalingFactor.toFixed(2)}`);
      console.log(`- Estimated total voters to create: ${Math.min(totalPotentialVoters, totalMaxVoters)}`);
      
      // Clear tracking sets
      allVoterIds.clear();
      voterElectionVotes.clear();
      existingVoterIds.clear();
      usedNINs.clear();
      usedVINs.clear();
      
      // 1. Create a super admin
      console.log('Creating super admin user');
      const adminId = generateUniqueId();
      await queryInterface.bulkInsert('admin_users', [{
        id: adminId,
        full_name: 'Super Admin',
        email: 'admin@securevote.ng',
        phone_number: '+2348123456789',
        password_hash: DEFAULT_PASSWORD_HASH,
        admin_type: 'SUPER_ADMIN',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      
      // Create admin roles for the super admin
      await queryInterface.bulkInsert('admin_roles', [{
        id: generateUniqueId(),
        admin_id: adminId,
        role_name: 'SUPER_ADMIN',
        description: 'Full system access',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      
      // Create admin permissions for the super admin
      await queryInterface.bulkInsert('admin_permissions', [{
        id: generateUniqueId(),
        admin_id: adminId,
        permission_name: 'ALL',
        access_level: 'full',
        granted_at: new Date(),
        granted_by: null,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      
      // 2. Create elections - presidential and gubernatorial for Lagos
      console.log('Creating elections');
      
      // Presidential election for all states
      const presidentialElectionId = generateUniqueId();
      await queryInterface.bulkInsert('elections', [{
        id: presidentialElectionId,
        election_name: 'Presidential Election 2027',
        election_type: 'PRESIDENTIAL',
        start_date: new Date(2027, 1, 25, 8, 0, 0),
        end_date: new Date(2027, 1, 25, 17, 0, 0),
        description: 'Nigerian Presidential Election 2027',
        is_active: true,
        status: 'scheduled',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      
      // Gubernatorial election for Lagos State
      const lagosGubernatorialElectionId = generateUniqueId();
      await queryInterface.bulkInsert('elections', [{
        id: lagosGubernatorialElectionId,
        election_name: 'Lagos State Gubernatorial Election 2027',
        election_type: 'GUBERNATORIAL',
        start_date: new Date(2027, 2, 9, 8, 0, 0), // Two weeks after presidential
        end_date: new Date(2027, 2, 9, 17, 0, 0),
        description: 'Lagos State Gubernatorial Election 2027',
        is_active: true,
        status: 'scheduled',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      
      console.log(`Created presidential election with ID: ${presidentialElectionId}`);
      console.log(`Created Lagos gubernatorial election with ID: ${lagosGubernatorialElectionId}`);
      
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
          status: 'approved',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
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
          status: 'approved',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      
      // Use enhanced batch insert with validation for candidates
      await enhancedBatchInsert(
        queryInterface, 
        'candidates', 
        candidateData, 
        {
          election_id: { table: 'elections', column: 'id' }
        }
      );
      console.log(`Created ${presidentialCandidateIds.length} presidential candidates and ${gubernatorialCandidateIds.length} Lagos gubernatorial candidates`);
      
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
            state: state.name
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
            updated_at: new Date()
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
              console.warn(`Filtered out ${pollingUnitData.length - validPollingUnitData.length} invalid polling units`);
            }
            
            if (validPollingUnitData.length > 0) {
              await queryInterface.bulkInsert('polling_units', validPollingUnitData);
              console.log(`Inserted batch of ${validPollingUnitData.length} polling units (total so far: ${puCounter})`);
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
          console.warn(`Filtered out ${pollingUnitData.length - validPollingUnitData.length} invalid polling units`);
        }
        
        if (validPollingUnitData.length > 0) {
          await queryInterface.bulkInsert('polling_units', validPollingUnitData);
          console.log(`Inserted final batch of ${validPollingUnitData.length} polling units (total: ${puCounter})`);
        }
      }
      
      console.log(`Created ${puCounter} polling units across ${Object.keys(pollingUnitsByState).length} states`);
      
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
        voterCards: 0,
        verificationStatuses: 0,
        presidentialVotes: 0,
        lagosGubernatorial: 0
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
          
          console.log(`Creating ${votersToCreate} voters and related data for polling unit ${pollingUnit.code}`);
          
          // Create vote distribution for presidential election
          // Each polling unit will have a specific vote distribution to ensure the winner
          const presidentialVoteDistribution = distributeVotesWithWinner(
            votersToCreate, 
            presidentialCandidateIds.length, 
            presidentialWinner
          );
          
          // For Lagos, also create gubernatorial vote distribution
          let gubernatorialVoteDistribution = [];
          if (isLagos) {
            gubernatorialVoteDistribution = distributeVotesWithWinner(
              votersToCreate, 
              gubernatorialCandidateIds.length, 
              gubernatorialWinner
            );
          }
          
          // Batch data containers
          const voterBatch = [];
          const voterCardBatch = [];
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
            
            // 1. Create voter
            voterBatch.push({
              id: voterId,
              nin: nin,
              vin: vin,
              phone_number: naijaFaker.phoneNumber(),
              date_of_birth: new Date(1960 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
              full_name: naijaFaker.name(null, gender),
              polling_unit_code: pollingUnit.code,
              state: state.name,
              gender: gender,
              lga: `${state.name} Central`,
              ward: `Ward ${Math.floor(i / 20) + 1}`,
              password_hash: DEFAULT_PASSWORD_HASH,
              is_active: true,
              mfa_enabled: false,
              created_at: new Date(),
              updated_at: new Date()
            });
            
            stats.voterCards++;
            
            // 3. Create verification status
            verificationStatusBatch.push({
              id: generateUniqueId(),
              user_id: voterId,
              is_phone_verified: true,
              is_email_verified: i % 2 === 0,
              is_identity_verified: i % 3 === 0,
              is_address_verified: i % 4 === 0,
              is_biometric_verified: i % 5 === 0,
              verification_level: i % 4,
              created_at: new Date(),
              updated_at: new Date()
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
            presidentialVoteBatch.push({
              id: generateUniqueId(),
              user_id: voterId,
              election_id: presidentialElectionId,
              candidate_id: presidentialCandidateId,
              polling_unit_id: pollingUnit.id,
              encrypted_vote_data: generateEncryptedVoteData(presidentialCandidateId),
              vote_hash: generateVoteHash(voterId, presidentialElectionId, presidentialCandidateId),
              vote_timestamp: new Date(2027, 1, 25, 8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 59)),
              vote_source: i % 4 === 0 ? 'web' : i % 4 === 1 ? 'mobile' : i % 4 === 2 ? 'ussd' : 'offline',
              is_counted: true,
              receipt_code: `PRES-${stats.presidentialVotes}`,
              created_at: new Date(),
              updated_at: new Date()
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
              
              const gubernatorialCandidateId = gubernatorialCandidateIds[gubernatorialCandidateIndex];
              gubernatorialVoteBatch.push({
                id: generateUniqueId(),
                user_id: voterId,
                election_id: lagosGubernatorialElectionId,
                candidate_id: gubernatorialCandidateId,
                polling_unit_id: pollingUnit.id,
                encrypted_vote_data: generateEncryptedVoteData(gubernatorialCandidateId),
                vote_hash: generateVoteHash(voterId, lagosGubernatorialElectionId, gubernatorialCandidateId),
                vote_timestamp: new Date(2027, 2, 9, 8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 59)),
                vote_source: i % 4 === 0 ? 'web' : i % 4 === 1 ? 'mobile' : i % 4 === 2 ? 'ussd' : 'offline',
                is_counted: true,
                receipt_code: `GUB-${stats.lagosGubernatorial}`,
                created_at: new Date(),
                updated_at: new Date()
              });
              stats.lagosGubernatorial++;
            }
            
            // Insert in batches
            if (voterBatch.length >= BATCH_SIZE) {
              console.log(`Inserting batch of ${voterBatch.length} voters and related data...`);
              await insertIntegratedBatch(queryInterface, voterBatch, voterCardBatch, verificationStatusBatch, presidentialVoteBatch, gubernatorialVoteBatch);
              
              // Clear batches
              voterBatch.length = 0;
              voterCardBatch.length = 0;
              verificationStatusBatch.length = 0;
              presidentialVoteBatch.length = 0;
              gubernatorialVoteBatch.length = 0;
            }
          }
          
          // Insert any remaining data
          if (voterBatch.length > 0) {
            console.log(`Inserting final batch of ${voterBatch.length} voters and related data...`);
            await insertIntegratedBatch(queryInterface, voterBatch, voterCardBatch, verificationStatusBatch, presidentialVoteBatch, gubernatorialVoteBatch);
          }
        }
      }
      
      // Print summary statistics
      console.log(`\nData Creation Summary:`);
      console.log(`- Voters: ${stats.voters}`);
      console.log(`- Voter Cards: ${stats.voterCards}`);
      console.log(`- Verification Statuses: ${stats.verificationStatuses}`);
      console.log(`- Presidential Votes: ${stats.presidentialVotes}`);
      console.log(`- Lagos Gubernatorial Votes: ${stats.lagosGubernatorial}`);
      
      console.log('Database seeding with improved relationship handling completed!');
      
      // 6. Create observer admin users and observer reports
      console.log('Creating observer admin users and reports...');
      
      // Create 5 observer admin users
      const observerAdminIds = [];
      const observerAdmins = [];
      
      for (let i = 0; i < 5; i++) {
        const observerId = generateUniqueId();
        observerAdminIds.push(observerId);
        
        observerAdmins.push({
          id: observerId,
          full_name: `Observer ${i + 1}`,
          email: `observer${i + 1}@securevote.ng`,
          phone_number: `+2348${100000000 + i}`,
          password_hash: DEFAULT_PASSWORD_HASH,
          admin_type: 'Observer',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      
      // Insert observer admins
      await queryInterface.bulkInsert('admin_users', observerAdmins);
      
      // Create observer roles and permissions
      for (const observerId of observerAdminIds) {
        await queryInterface.bulkInsert('admin_roles', [{
          id: generateUniqueId(),
          admin_id: observerId,
          role_name: 'Observer',
          description: 'Election observer with reporting privileges',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]);
        
        // Add observer permissions
        for (const permission of rolePermissionsMap['Observer']) {
          await queryInterface.bulkInsert('admin_permissions', [{
            id: generateUniqueId(),
            admin_id: observerId,
            permission_name: permission,
            access_level: 'read',
            granted_at: new Date(),
            granted_by: adminId, // Super admin grants the permission
            created_at: new Date(),
            updated_at: new Date()
          }]);
        }
      }
      
      console.log(`Created ${observerAdminIds.length} observer admin users`);
      
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
      
      console.log(`Selected ${pollingUnitSubset.length} polling units for observer reports out of ${puCounter} total units`);
      
      // Review some reports
      const reviewerAdminId = adminId; // Super admin reviews reports
      
      for (const pollingUnit of pollingUnitSubset) {
        // For each polling unit, create reports for both presidential and gubernatorial (if Lagos)
        // For presidential election
        for (const reportType of reportTypes) {
          // Choose a random observer
          const observerId = observerAdminIds[Math.floor(Math.random() * observerAdminIds.length)];
          
          // Generate report content
          const content = generateReportContent(reportType, {
            polling_unit_name: `Polling Unit ${pollingUnit.code}`,
            registered_voters: VOTERS_PER_POLLING_UNIT
          });
          
          // Determine if this report should be reviewed (30% chance)
          const isReviewed = Math.random() < 0.3;
          const status = isReviewed ? 
                         getRandomItem(['reviewed', 'resolved', 'rejected']) : 
                         'pending';
          
          // Create the report
          const report = generateObserverReport(
            observerId,
            presidentialElectionId,
            pollingUnit.id,
            reportType,
            content,
            status,
            isReviewed ? reviewerAdminId : null
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
              isReviewed ? reviewerAdminId : null
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
      
      console.log(`Created ${reportCount} observer reports for ${pollingUnitSubset.length} polling units`);
      
      // Update stats with observer information
      stats.observerAdmins = observerAdminIds.length;
      stats.observerReports = reportCount;
      
      // 7. Create election statistics for both elections
      console.log('Generating election statistics...');
      const electionStatsData = [];
      
      // Presidential election statistics
      const totalPresidentialVotes = stats.presidentialVotes;
      const totalRegisteredVoters = stats.voters;
      const turnoutPercentage = (totalPresidentialVotes / totalRegisteredVoters * 100).toFixed(2);
      
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
        updated_at: new Date()
      });
      
      // Lagos gubernatorial election statistics
      const totalGubernatorial = stats.lagosGubernatorial;
      const lagosVoters = Math.floor(totalRegisteredVoters / nigeriaStates.length); // Approximate Lagos voters
      const lagosTurnoutPercentage = (totalGubernatorial / lagosVoters * 100).toFixed(2);
      
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
        updated_at: new Date()
      });
      
      await enhancedBatchInsert(queryInterface, 'election_stats', electionStatsData);
      console.log(`Created election statistics for Presidential and Lagos Gubernatorial elections`);
      stats.electionStats = electionStatsData.length;
      
      // 8. Generate failed authentication attempts
      console.log('Generating failed authentication attempts...');
      const failedAttempts = [];
      
      // Make sure we have voters to reference
      if (existingVoterIds.size === 0) {
        console.log('Warning: No existing voter IDs found for failed attempts. Skipping failed attempts creation.');
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
            attempt_time: timestamp
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
            attempt_time: timestamp
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
          version: '1.0.0'
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 30)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 30))
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
            'security.rate_limit': '10 attempts per minute'
          },
          reason: 'Security enhancement'
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 25)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 25))
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
          status: 'draft'
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 60)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 60))
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
          reason: 'Election date finalized'
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 45)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 45))
      });
      
      // User authentication logs
      for (let i = 0; i < 20; i++) {
        if (existingVoterIds.size > 0) {
          const voterIds = Array.from(existingVoterIds);
          const randomVoterId = voterIds[Math.floor(Math.random() * voterIds.length)];
          
          auditLogs.push({
            id: generateUniqueId(),
            action_type: getRandomItem(['login_success', 'logout', 'password_changed', 'profile_updated']),
            action_timestamp: new Date(new Date().setMinutes(new Date().getMinutes() - Math.floor(Math.random() * 10000))),
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
              device_type: getRandomItem(['desktop', 'mobile', 'tablet'])
            }),
            is_suspicious: false,
            created_at: new Date(new Date().setMinutes(new Date().getMinutes() - Math.floor(Math.random() * 10000))),
            updated_at: new Date(new Date().setMinutes(new Date().getMinutes() - Math.floor(Math.random() * 10000)))
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
            action_timestamp: new Date(2027, 1, 25, 8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 59)),
            user_id: randomVoterId,
            admin_id: null,
            ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            user_agent: getRandomItem(['Chrome', 'Firefox', 'Safari', 'Edge']),
            action_details: JSON.stringify({
              entity_type: 'vote',
              entity_id: generateUniqueId(), // Just a placeholder
              user_type: 'voter',
              election_id: Math.random() < 0.8 ? presidentialElectionId : lagosGubernatorialElectionId,
              vote_method: getRandomItem(['web', 'mobile', 'offline']),
              verification_level: getRandomItem([1, 2, 3]),
              verification_method: getRandomItem(['biometric', 'otp', 'id_card'])
            }),
            is_suspicious: false,
            created_at: new Date(2027, 1, 25, 8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 59)),
            updated_at: new Date(2027, 1, 25, 8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 59))
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
          version: '1.0.5'
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 15)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 15))
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
          scheduled: true
        }),
        is_suspicious: false,
        created_at: new Date(new Date().setDate(new Date().getDate() - 10)),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 10))
      });
      
      await enhancedBatchInsert(queryInterface, 'audit_logs', auditLogs);
      console.log(`Created ${auditLogs.length} audit logs`);
      stats.auditLogs = auditLogs.length;
      
      // 10. Create admin logs for administrative actions
      console.log('Generating admin logs...');
      const adminLogs = [];
      
      // User management actions
      adminLogs.push({
        id: generateUniqueId(),
        admin_id: adminId,
        action: 'user_created',
        resource_type: 'admin_user',
        resource_id: observerAdminIds[0], // First observer
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: JSON.stringify({
          user_type: 'Observer',
          email: `observer1@securevote.ng`,
          role: 'Observer'
        }),
        created_at: new Date(new Date().setDate(new Date().getDate() - 55))
      });
      
      adminLogs.push({
        id: generateUniqueId(),
        admin_id: adminId,
        action: 'role_assigned',
        resource_type: 'admin_user',
        resource_id: observerAdminIds[0],
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: JSON.stringify({
          role: 'Observer',
          permissions: rolePermissionsMap['Observer']
        }),
        created_at: new Date(new Date().setDate(new Date().getDate() - 55))
      });
      
      // Election management actions
      adminLogs.push({
        id: generateUniqueId(),
        admin_id: adminId,
        action: 'election_created',
        resource_type: 'election',
        resource_id: presidentialElectionId,
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: JSON.stringify({
          election_name: 'Presidential Election 2027',
          election_type: 'PRESIDENTIAL',
          start_date: '2027-02-25T08:00:00',
          end_date: '2027-02-25T17:00:00'
        }),
        created_at: new Date(new Date().setDate(new Date().getDate() - 60))
      });
      
      adminLogs.push({
        id: generateUniqueId(),
        admin_id: adminId,
        action: 'candidate_added',
        resource_type: 'candidate',
        resource_id: presidentialCandidateIds[0],
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: JSON.stringify({
          election_id: presidentialElectionId,
          full_name: PRESIDENTIAL_CANDIDATES[0].fullName,
          party_code: PRESIDENTIAL_CANDIDATES[0].partyCode,
          party_name: PRESIDENTIAL_CANDIDATES[0].partyName
        }),
        created_at: new Date(new Date().setDate(new Date().getDate() - 58))
      });
      
      // System configuration actions
      adminLogs.push({
        id: generateUniqueId(),
        admin_id: adminId,
        action: 'config_updated',
        resource_type: 'system_config',
        resource_id: "global",
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: JSON.stringify({
          config_section: 'security',
          changes: {
            'password_policy.min_length': '10',
            'password_policy.require_special_chars': 'true',
            'password_policy.max_age_days': '90'
          }
        }),
        created_at: new Date(new Date().setDate(new Date().getDate() - 40))
      });
      
      // Observer report review actions
      adminLogs.push({
        id: generateUniqueId(),
        admin_id: adminId,
        action: 'report_reviewed',
        resource_type: 'observer_report',
        resource_id: generateUniqueId(), // Just a placeholder since we don't have the actual IDs
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: JSON.stringify({
          report_type: 'Irregularity',
          status_changed: 'pending to resolved',
          resolution: 'Issue addressed by polling unit officials'
        }),
        created_at: new Date(2027, 1, 25, 10, 15)
      });
      
      // Voter data management
      adminLogs.push({
        id: generateUniqueId(),
        admin_id: adminId,
        action: 'voter_data_exported',
        resource_type: 'voter_data',
        resource_id: null,
        ip_address: '10.0.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: JSON.stringify({
          export_type: 'demographics',
          record_count: 5000,
          format: 'csv',
          filters: {
            state: 'Lagos',
            age_range: '18-35'
          },
          fields_included: ['age', 'gender', 'location', 'registration_date'],
          pii_excluded: true
        }),
        created_at: new Date(new Date().setDate(new Date().getDate() - 20))
      });
      
      await enhancedBatchInsert(queryInterface, 'admin_logs', adminLogs);
      console.log(`Created ${adminLogs.length} admin logs`);
      stats.adminLogs = adminLogs.length;
      
      // Print updated summary statistics
      console.log(`\nUpdated Data Creation Summary:`);
      console.log(`- Voters: ${stats.voters}`);
      console.log(`- Voter Cards: ${stats.voterCards}`);
      console.log(`- Verification Statuses: ${stats.verificationStatuses}`);
      console.log(`- Presidential Votes: ${stats.presidentialVotes}`);
      console.log(`- Lagos Gubernatorial Votes: ${stats.lagosGubernatorial}`);
      console.log(`- Observer Admins: ${stats.observerAdmins}`);
      console.log(`- Observer Reports: ${stats.observerReports}`);
      console.log(`- Election Stats: ${stats.electionStats}`);
      console.log(`- Failed Authentication Attempts: ${stats.failedAttempts}`);
      console.log(`- Audit Logs: ${stats.auditLogs}`);
      console.log(`- Admin Logs: ${stats.adminLogs}`);
      
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
      usedNINs.clear();
      usedVINs.clear();
      
      await queryInterface.bulkDelete('admin_logs', null, { transaction });
      await queryInterface.bulkDelete('observer_reports', null, { transaction });
      await queryInterface.bulkDelete('ussd_votes', null, { transaction });
      await queryInterface.bulkDelete('ussd_sessions', null, { transaction });
      await queryInterface.bulkDelete('audit_logs', null, { transaction });
      await queryInterface.bulkDelete('votes', null, { transaction });
      await queryInterface.bulkDelete('election_stats', null, { transaction });
      await queryInterface.bulkDelete('verification_statuses', null, { transaction });
      await queryInterface.bulkDelete('voter_cards', null, { transaction });
      await queryInterface.bulkDelete('voters', null, { transaction });
      await queryInterface.bulkDelete('candidates', null, { transaction });
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
  VOTERS_PER_POLLING_UNIT
};

// Helper function to insert all related data in a coordinated way
async function insertIntegratedBatch(queryInterface, voterBatch, voterCardBatch, verificationStatusBatch, presidentialVoteBatch, gubernatorialVoteBatch) {
  // 1. Insert voters first (now includes voter card data)
  await enhancedBatchInsert(queryInterface, 'voters', voterBatch);
  
  // Update tracking sets
  voterBatch.forEach(voter => {
    existingVoterIds.add(voter.id);
    if (voter.nin) usedNINs.add(voter.nin);
    if (voter.vin) usedVINs.add(voter.vin);
  });
  
  // 2. Insert verification statuses
  await enhancedBatchInsert(queryInterface, 'verification_statuses', verificationStatusBatch);
  
  // 3. Insert presidential votes
  await enhancedBatchInsert(queryInterface, 'votes', presidentialVoteBatch);
  
  // 4. Insert gubernatorial votes if any
  if (gubernatorialVoteBatch.length > 0) {
    await enhancedBatchInsert(queryInterface, 'votes', gubernatorialVoteBatch);
  }
  
  console.log(`Successfully inserted batch with ${voterBatch.length} integrated voter records`);
}