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
// Default max voters per state if not provided in CONFIG
const DEFAULT_MAX_VOTERS_PER_STATE = 10000;
// We'll set this value from run-optimized-seeder.js
let MAX_VOTERS_PER_STATE = DEFAULT_MAX_VOTERS_PER_STATE;
// Batch size for bulk inserts to prevent memory issues
const BATCH_SIZE = 5000;
// Use a single password hash for all test users to avoid bcrypt overhead
const DEFAULT_PASSWORD_HASH = '$2b$10$1XpzUYu8FuvuJj.PoUMvZOFFWGYoR0jbJ6qZmHX5.G9qujpJjEKyy'; // hash for 'password123'

// Nigeria states
const nigeriaStates = naijaFaker.states();

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
const presidentialCandidates = [
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

// Add this function near the top of the file, after other utility functions
const formatPhoneNumber = (phoneNumber) => {
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Ensure it starts with +234 (Nigeria's country code)
  if (digitsOnly.startsWith('234')) {
    return '+' + digitsOnly.substring(0, 14); // +234 + 10 digits = 14 chars
  } else if (digitsOnly.startsWith('0')) {
    // Convert 0 prefix to +234
    return '+234' + digitsOnly.substring(1, 11); // +234 + 10 digits = 14 chars
  } else {
    // Just ensure it's not longer than 15 chars
    return '+' + digitsOnly.substring(0, 14);
  }
};

// Helper function to generate a random password hash
// Only use this for specific cases where unique passwords are required
async function generatePasswordHash(password = faker.internet.password()) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Helper function to insert data in batches to prevent memory issues
async function batchInsert(queryInterface, tableName, data, batchSize = BATCH_SIZE) {
  console.log(`Batch inserting ${data.length} records into ${tableName}...`);
  
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  
  console.log(`Split into ${batches.length} batches of max ${batchSize} records each`);
  
  let insertedCount = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await queryInterface.bulkInsert(tableName, batch);
      insertedCount += batch.length;
      console.log(`Inserted batch ${i + 1}/${batches.length} (${insertedCount}/${data.length} records)`);
    } catch (error) {
      console.error(`Error inserting batch ${i + 1} into ${tableName}:`, error.message);
      throw error;
    }
  }
  
  return insertedCount;
}

// Helper function to randomly distribute votes to ensure a specific winner
function distributeVotesWithWinner(totalVoters, candidateCount, winnerIndex) {
  // Ensure we don't exceed MAX_VOTERS_PER_STATE
  totalVoters = Math.min(totalVoters, MAX_VOTERS_PER_STATE);
  
  const votes = new Array(candidateCount).fill(0);
  // Allocate at least 51% to the winner to ensure victory
  const winnerVotes = Math.ceil(totalVoters * 0.51);
  votes[winnerIndex] = winnerVotes;
  
  // Distribute remaining votes
  const remainingVotes = totalVoters - winnerVotes;
  let allocated = 0;
  
  for (let i = 0; i < candidateCount; i++) {
    if (i !== winnerIndex) {
      // Distribute remaining proportionally but randomly
      const share = i === candidateCount - 1 
        ? remainingVotes - allocated 
        : Math.floor(Math.random() * (remainingVotes - allocated) / (candidateCount - i - 1));
      
      votes[i] = share;
      allocated += share;
    }
  }
  
  return votes;
}

// Helper function to get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Add this function near the top of the file, after other utility functions
const generateUniqueNIN = (usedNINs) => {
  let nin;
  do {
    nin = faker.string.numeric(11);
  } while (usedNINs.has(nin));
  usedNINs.add(nin);
  return nin;
};

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
      
      return `Polling unit ${pollingUnit.polling_unit_name} closed at ${faker.datatype.boolean(0.8) ? '6:00 PM as scheduled' : formattedTime + ' PM'}. Final voter count was ${faker.number.int({ min: 100, max: pollingUnit.registered_voters })}. Closing procedures were followed ${faker.datatype.boolean(0.7) ? 'correctly and efficiently' : 'with minor delays but properly'}. All materials have been secured. Party agents ${faker.datatype.boolean(0.9) ? 'have signed the relevant forms' : 'are in the process of reviewing the results'}.`;
    
    case 'VoteCounting':
      return `Vote counting at ${pollingUnit.polling_unit_name} ${faker.datatype.boolean(0.7) ? 'proceeded smoothly' : 'had minor delays but was conducted properly'}. All party agents were ${faker.datatype.boolean(0.9) ? 'present and witnessed the counting' : 'mostly present during the count'}. Results were recorded on the appropriate forms and ${faker.datatype.boolean(0.9) ? 'publicly announced to the satisfaction of observers' : 'documented according to regulations'}. No significant irregularities were observed during the counting process.`;
    
    default:
      return `Standard observation report for ${pollingUnit.polling_unit_name}. Everything proceeding according to electoral guidelines.`;
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('Starting database seeding...');
      
      // Check if super admin already exists
      const [existingAdmin] = await queryInterface.sequelize.query(
        `SELECT id FROM admin_users WHERE email = 'admin@secureballot.ng'`
      );
      
      let superAdminId;
      
      if (existingAdmin && existingAdmin.length > 0) {
        console.log('Super admin already exists, skipping creation');
        superAdminId = existingAdmin[0].id;
      } else {
        // Create super admin
        superAdminId = uuidv4();
        console.log('Creating new super admin');
        await queryInterface.bulkInsert('admin_users', [{
          id: superAdminId,
          full_name: 'Super Administrator',
          email: 'admin@secureballot.ng',
          phone_number: formatPhoneNumber(naijaFaker.phoneNumber()),
          password_hash: await generatePasswordHash('password123'),
          admin_type: 'SystemAdministrator',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]);
      }
      
      // Create super admin role
      await queryInterface.bulkInsert('admin_roles', [{
        id: uuidv4(),
        admin_id: superAdminId,
        role_name: 'SystemAdministrator',
        description: 'System Administrator with full access',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      
      // Create super admin permissions
      const superAdminPermissions = rolePermissionsMap['SystemAdministrator'].map(permission => ({
        id: uuidv4(),
        admin_id: superAdminId,
        permission_name: permission,
        resource_type: 'system',
        resource_id: null,
        actions: JSON.stringify(['read', 'write']),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      await queryInterface.bulkInsert('admin_permissions', superAdminPermissions);
      console.log('Super admin role and permissions created');
      
      // Create other admins
      const adminIds = [];
      const adminRoles = [];
      const adminPermissions = [];
      const adminsByType = {}; // Store admin IDs by type
      
      for (let i = 0; i < 20; i++) {
        const adminId = uuidv4();
        adminIds.push(adminId);
        const adminType = getRandomItem(adminTypes);
        
        // Store admin ID by type for later reference
        if (!adminsByType[adminType]) {
          adminsByType[adminType] = [];
        }
        adminsByType[adminType].push(adminId);
        
        // Admin user
        adminRoles.push({
          id: uuidv4(),
          admin_id: adminId,
          role_name: adminType,
          description: `Role for ${adminType}`,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        // Admin permissions - create one entry per permission for this role
        const permissions = rolePermissionsMap[adminType] || [];
        permissions.forEach(permission => {
          adminPermissions.push({
            id: uuidv4(),
            admin_id: adminId,
            permission_name: permission,
            resource_type: 'system',
            resource_id: null,
            actions: JSON.stringify(['read', 'write']),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          });
        });
      }
      
      // Create admin users with pre-computed password hash for better performance
      const adminUsers = adminIds.map((id, index) => {
        const person = naijaFaker.person();
        return {
          id: id,
          full_name: person.fullName,
          email: person.email.toLowerCase(),
          phone_number: formatPhoneNumber(person.phone),
          password_hash: DEFAULT_PASSWORD_HASH, // Use pre-computed hash instead of generating
          admin_type: adminRoles[index].role_name,
          is_active: true,
          created_by: superAdminId,
          created_at: new Date(),
          updated_at: new Date()
        };
      });
      
      await queryInterface.bulkInsert('admin_users', adminUsers);
      await queryInterface.bulkInsert('admin_roles', adminRoles);
      await queryInterface.bulkInsert('admin_permissions', adminPermissions);
      console.log(`Created ${adminIds.length} admin users with roles and permissions`);
      
      // Create elections
      const presidentialElectionId = uuidv4();
      const lagosElectionId = uuidv4();
      
      // Use an ElectoralCommissioner as the creator if available, otherwise use the super admin
      const electionCreatorId = adminsByType['ElectoralCommissioner'] && adminsByType['ElectoralCommissioner'].length > 0
        ? getRandomItem(adminsByType['ElectoralCommissioner'])
        : superAdminId;
      
      await queryInterface.bulkInsert('elections', [
        {
          id: presidentialElectionId,
          election_name: 'Nigeria Presidential Election 2023',
          election_type: electionTypes[0], // Presidential
          start_date: new Date('2023-02-25T08:00:00Z'),
          end_date: new Date('2023-02-25T18:00:00Z'),
          description: 'General election to elect the President of Nigeria',
          is_active: true,
          status: electionStatuses.ACTIVE,
          eligibility_rules: JSON.stringify({
            minimum_age: 18,
            must_have_valid_voter_card: true,
            must_be_registered_voter: true
          }),
          created_by: electionCreatorId,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: lagosElectionId,
          election_name: 'Lagos State Gubernatorial Election 2023',
          election_type: electionTypes[1], // Gubernatorial
          start_date: new Date('2023-03-18T08:00:00Z'),
          end_date: new Date('2023-03-18T18:00:00Z'),
          description: 'Election to elect the Governor of Lagos State',
          is_active: true,
          status: electionStatuses.ACTIVE,
          eligibility_rules: JSON.stringify({
            minimum_age: 18,
            must_have_valid_voter_card: true,
            must_be_registered_voter: true,
            state_criteria: 'Lagos'
          }),
          created_by: electionCreatorId,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
      
      // Create additional elections using other election types
      const additionalElections = [];
      const additionalElectionStats = [];
      
      // Use the remaining election types (starting from index 2)
      for (let i = 2; i < electionTypes.length; i++) {
        const electionId = uuidv4();
        const electionType = electionTypes[i];
        const state = getRandomItem(Object.keys(nigeriaStates));
        
        // Create election
        additionalElections.push({
          id: electionId,
          election_name: `${state} ${electionType} Election 2023`,
          election_type: electionType,
          start_date: faker.date.between({ from: '2023-02-01', to: '2023-06-30' }),
          end_date: faker.date.between({ from: '2023-07-01', to: '2023-12-31' }),
          description: `Election for ${electionType} positions in ${state}`,
          is_active: faker.datatype.boolean(0.3), // 30% chance of being active
          status: getRandomItem([
            electionStatuses.DRAFT,
            electionStatuses.SCHEDULED,
            electionStatuses.COMPLETED
          ]),
          eligibility_rules: JSON.stringify({
            minimum_age: 18,
            must_have_valid_voter_card: true,
            must_be_registered_voter: true,
            state_criteria: electionType === 'Senatorial' || electionType === 'HouseOfReps' || 
                          electionType === 'StateAssembly' || electionType === 'LocalGovernment' ? state : null
          }),
          created_by: electionCreatorId,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        // Create election stats
        additionalElectionStats.push({
          id: uuidv4(),
          election_id: electionId,
          total_votes: 0,
          valid_votes: 0,
          invalid_votes: 0,
          turnout_percentage: 0,
          last_updated: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      
      // Insert additional elections and stats if any were created
      if (additionalElections.length > 0) {
        await queryInterface.bulkInsert('elections', additionalElections);
        await queryInterface.bulkInsert('election_stats', additionalElectionStats);
        console.log(`Created ${additionalElections.length} additional elections`);
      }
      
      // Create initial election stats
      await queryInterface.bulkInsert('election_stats', [
        {
          id: uuidv4(),
          election_id: presidentialElectionId,
          total_votes: 0,
          valid_votes: 0,
          invalid_votes: 0,
          turnout_percentage: 0,
          last_updated: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          election_id: lagosElectionId,
          total_votes: 0,
          valid_votes: 0,
          invalid_votes: 0,
          turnout_percentage: 0,
          last_updated: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
      console.log('Elections created');
      
      // Create presidential candidates
      const presidentCandidateRecords = presidentialCandidates.map(candidate => ({
        id: uuidv4(),
        election_id: presidentialElectionId,
        full_name: candidate.fullName,
        party_code: candidate.partyCode,
        party_name: candidate.partyName,
        bio: candidate.bio,
        photo_url: `https://example.com/candidates/${candidate.partyCode.toLowerCase()}_candidate.jpg`,
        position: candidate.position,
        manifesto: candidate.manifesto,
        status: candidateStatuses.APPROVED,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      // Create gubernatorial candidates
      const governorCandidateRecords = lagosGubernatorialCandidates.map(candidate => ({
        id: uuidv4(),
        election_id: lagosElectionId,
        full_name: candidate.fullName,
        party_code: candidate.partyCode,
        party_name: candidate.partyName,
        bio: candidate.bio,
        photo_url: `https://example.com/candidates/${candidate.partyCode.toLowerCase()}_candidate.jpg`,
        position: candidate.position,
        manifesto: candidate.manifesto,
        status: candidateStatuses.APPROVED,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      await queryInterface.bulkInsert('candidates', [...presidentCandidateRecords, ...governorCandidateRecords]);
      console.log('Candidates created');
      
      // Get candidate IDs for later use
      const presidentialCandidateIds = presidentCandidateRecords.map(candidate => ({
        id: candidate.id,
        full_name: candidate.full_name,
        party_code: candidate.party_code
      }));
      
      const lagosGubernCandidateIds = governorCandidateRecords.map(candidate => ({
        id: candidate.id,
        full_name: candidate.full_name,
        party_code: candidate.party_code
      }));
      
      // Find Peter Obi's and GRV's candidate indices
      const obiIndex = presidentialCandidateIds.findIndex(c => c.full_name === 'Peter Gregory Obi');
      const grvIndex = lagosGubernCandidateIds.findIndex(c => c.full_name === 'Gbadebo Rhodes-Vivour');
      
      // Create polling units across Nigeria
      const pollingUnits = [];
      const usedPollingUnitCodes = new Set(); // Track used codes
      
      for (const state of nigeriaStates) {
        // Get LGAs for the state
        const lgas = naijaFaker.lgas().filter(lga => {
          // Filter LGAs based on state (this is a simplification as naija-faker doesn't provide direct state-to-LGA mapping)
          // In a real implementation, you would need a proper mapping of LGAs to states
          return true; // For now, we'll use all LGAs for demonstration
        }).slice(0, faker.number.int({ min: 5, max: 15 })); // Take a random subset of LGAs
        
        // For each LGA, create random number of wards (3-8)
        for (const lga of lgas) {
          const numWards = faker.number.int({ min: 3, max: 8 });
          
          for (let ward = 1; ward <= numWards; ward++) {
            const wardName = `Ward ${ward}`;
            
            // For each ward, create random number of polling units (5-15)
            const numPollingUnits = faker.number.int({ min: 5, max: 15 });
            
            for (let i = 1; i <= numPollingUnits; i++) {
              const pollingUnitId = uuidv4();
              // Add timestamp to ensure uniqueness
              const timestamp = Date.now().toString().slice(-6);
              const pollingUnitCode = `PU${state.substring(0, 3).toUpperCase()}${lga.substring(0, 3).toUpperCase()}${ward.toString().padStart(2, '0')}${i.toString().padStart(3, '0')}${timestamp}`;
              
              // Ensure code is unique
              if (usedPollingUnitCodes.has(pollingUnitCode)) {
                continue; // Skip this one and try again
              }
              usedPollingUnitCodes.add(pollingUnitCode);
              
              const pollingUnitName = `${lga} ${wardName} Polling Unit ${i}`;
              
              // Random registered voters between 500-2000
              const registeredVoters = faker.number.int({ min: 500, max: 2000 });
              
              // Assign a PollingUnitOfficer if available, otherwise use any admin
              const assignedOfficer = adminsByType['PollingUnitOfficer'] && adminsByType['PollingUnitOfficer'].length > 0
                ? getRandomItem(adminsByType['PollingUnitOfficer'])
                : getRandomItem(adminIds);
              
              pollingUnits.push({
                id: pollingUnitId,
                polling_unit_code: pollingUnitCode,
                polling_unit_name: pollingUnitName,
                state: state,
                lga: lga,
                ward: wardName,
                geolocation: JSON.stringify({
                  latitude: faker.location.latitude({ max: 14, min: 4 }),
                  longitude: faker.location.longitude({ max: 15, min: 3 })
                }),
                address: naijaFaker.address(),
                registered_voters: registeredVoters,
                assigned_officer: assignedOfficer,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
              });
            }
          }
        }
      }
      
      // Use batch insert for polling units if the array is large
      if (pollingUnits.length > BATCH_SIZE) {
        await batchInsert(queryInterface, 'polling_units', pollingUnits);
      } else {
        await queryInterface.bulkInsert('polling_units', pollingUnits);
      }
      console.log(`Created ${pollingUnits.length} polling units`);
      
      // Group polling units by state
      const stateUnits = {};
      for (const unit of pollingUnits) {
        if (!stateUnits[unit.state]) {
          stateUnits[unit.state] = [];
        }
        stateUnits[unit.state].push(unit);
      }
      
      // Create voters, voter cards, verification statuses and votes for presidential election
      const voters = [];
      const voterCards = [];
      const verificationStatuses = [];
      const votes = [];
      const auditLogs = [];
      const ussdSessions = [];
      const ussdVotes = [];
      
      // Store voter IDs for later use when creating votes
      const createdVoterIds = [];
      
      // Create a Set to track used NINs
      const usedNINs = new Set();

      // Check if there are existing voters in the database
      const existingVoters = await queryInterface.sequelize.query(
        'SELECT nin FROM voters',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      // Add existing NINs to the Set
      existingVoters.forEach(voter => {
        usedNINs.add(voter.nin);
      });
      
      // Process each state for presidential election
      for (const [state, units] of Object.entries(stateUnits)) {
        // Calculate total voters for this state
        const totalRegisteredVoters = units.reduce((sum, unit) => sum + unit.registered_voters, 0);
        
        // Strictly enforce MAX_VOTERS_PER_STATE limit
        const targetVoters = Math.min(totalRegisteredVoters, MAX_VOTERS_PER_STATE);
        
        console.log(`State: ${state}, Total registered voters: ${totalRegisteredVoters}, Target voters: ${targetVoters}`);
        
        // Calculate voters per polling unit proportionally
        const voterDistribution = units.map(unit => {
          const proportion = unit.registered_voters / totalRegisteredVoters;
          return Math.floor(proportion * targetVoters);
        });
        
        // Ensure the total doesn't exceed MAX_VOTERS_PER_STATE by adjusting the last unit if needed
        let totalDistributedVoters = voterDistribution.reduce((a, b) => a + b, 0);
        if (totalDistributedVoters > MAX_VOTERS_PER_STATE) {
          // Adjust the last unit to ensure we don't exceed the limit
          const excess = totalDistributedVoters - MAX_VOTERS_PER_STATE;
          voterDistribution[voterDistribution.length - 1] -= excess;
          totalDistributedVoters = MAX_VOTERS_PER_STATE;
        }
        
        // Distribute votes to ensure Peter Obi wins
        const stateVotes = distributeVotesWithWinner(
          totalDistributedVoters,
          presidentialCandidateIds.length,
          obiIndex
        );
        
        // Double-check that total votes don't exceed MAX_VOTERS_PER_STATE
        const totalStateVotes = stateVotes.reduce((a, b) => a + b, 0);
        console.log(`State: ${state}, Total voters: ${totalDistributedVoters}, Total votes: ${totalStateVotes}, Votes distribution: ${stateVotes}`);
        
        // Ensure we don't create more voters than MAX_VOTERS_PER_STATE
        const maxVotersToCreate = Math.min(totalDistributedVoters, MAX_VOTERS_PER_STATE);
        
        // Create voters and votes for each polling unit
        let totalVotersCreated = 0;
        for (let i = 0; i < units.length && totalVotersCreated < maxVotersToCreate; i++) {
          const unit = units[i];
          // Adjust voters for this unit to respect the overall limit
          const votersForUnit = Math.min(voterDistribution[i], maxVotersToCreate - totalVotersCreated);
          
          if (votersForUnit <= 0) continue;
          
          totalVotersCreated += votersForUnit;
          
          // Distribute candidate votes proportionally for this unit
          const unitVotes = stateVotes.map(votes => {
            return Math.floor(votes * (votersForUnit / totalStateVotes));
          });
          
          // Create voters
          // Generate a batch of Nigerian people data
          const nigerianPeople = naijaFaker.people(votersForUnit);
          
          // Store unit voter IDs and their assigned candidate index for later vote creation
          const unitVoterData = [];
          
          for (let j = 0; j < votersForUnit; j++) {
            // Create a voter using the generated Nigerian person data
            const person = nigerianPeople[j];
            const voterId = uuidv4();
            // Store voter ID for later use
            createdVoterIds.push({
              voterId,
              unit,
              candidateVotes: [...unitVotes] // Clone the array to avoid reference issues
            });
            
            // Generate 11-digit NIN using faker
            const nin = generateUniqueNIN(usedNINs);
            const vin = `${faker.string.alphanumeric(3).toUpperCase()}${faker.number.int({ min: 1000000000, max: 9999999999 })}${faker.string.alphanumeric(6).toUpperCase()}`;
            const phoneNumber = formatPhoneNumber(person.phone);
            
            // Random date of birth (18-80 years old)
            const dob = faker.date.birthdate({ min: 18, max: 80, mode: 'age' });
            
            voters.push({
              id: voterId,
              nin: nin,
              vin: vin,
              phone_number: phoneNumber,
              date_of_birth: dob,
              password_hash: DEFAULT_PASSWORD_HASH, // Use pre-computed hash
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            });
            
            // Create voter card with more realistic Nigerian data
            voterCards.push({
              id: uuidv4(),
              user_id: voterId,
              full_name: person.fullName,
              vin: vin,
              polling_unit_code: unit.polling_unit_code,
              state: unit.state,
              lga: unit.lga,
              ward: unit.ward,
              issued_date: faker.date.recent({ days: 365 }),
              is_valid: true,
              created_at: new Date(),
              updated_at: new Date()
            });
            
            // Create verification status with more realistic Nigerian data
            verificationStatuses.push({
              id: uuidv4(),
              user_id: voterId,
              is_phone_verified: person.phone ? true : faker.datatype.boolean(0.9),
              is_email_verified: person.email ? true : faker.datatype.boolean(0.7),
              is_identity_verified: true,
              is_address_verified: person.address ? true : faker.datatype.boolean(0.6),
              is_biometric_verified: faker.datatype.boolean(0.8),
              verification_level: faker.number.int({ min: 1, max: 5 }),
              last_verified_at: faker.date.recent({ days: 30 }),
              created_at: new Date(),
              updated_at: new Date()
            });
          }
          
          // Insert voters in batches if arrays get too large
          if (voters.length >= BATCH_SIZE) {
            await batchInsert(queryInterface, 'voters', voters);
            voters.length = 0; // Clear array after batch insert
          }
          
          if (voterCards.length >= BATCH_SIZE) {
            await batchInsert(queryInterface, 'voter_cards', voterCards);
            voterCards.length = 0;
          }
          
          if (verificationStatuses.length >= BATCH_SIZE) {
            await batchInsert(queryInterface, 'verification_statuses', verificationStatuses);
            verificationStatuses.length = 0;
          }
        }
      }
      
      // Insert any remaining voters, voter cards, and verification statuses
      if (voters.length > 0) {
        await batchInsert(queryInterface, 'voters', voters);
        voters.length = 0;
      }
      
      if (voterCards.length > 0) {
        await batchInsert(queryInterface, 'voter_cards', voterCards);
        voterCards.length = 0;
      }
      
      if (verificationStatuses.length > 0) {
        await batchInsert(queryInterface, 'verification_statuses', verificationStatuses);
        verificationStatuses.length = 0;
      }
      
      console.log('All voters inserted. Now creating votes...');
      
      // Now create votes using the stored voter IDs
      for (const voterData of createdVoterIds) {
        const { voterId, unit, candidateVotes } = voterData;
        
        // Determine if this voter should vote for a specific candidate
        let candidateIndex = -1;
        for (let k = 0; k < presidentialCandidateIds.length; k++) {
          if (candidateVotes[k] > 0) {
            candidateIndex = k;
            candidateVotes[k]--;
            break;
          }
        }
        
        // If no specific candidate assigned, skip creating a vote
        if (candidateIndex === -1) continue;
        
        // Create vote
        const voteTimestamp = faker.date.between({ from: '2023-02-25T08:00:00Z', to: '2023-02-25T18:00:00Z' });
        const voteSource = getRandomItem(voteSources);
        
        votes.push({
          id: uuidv4(),
          user_id: voterId,
          election_id: presidentialElectionId,
          candidate_id: presidentialCandidateIds[candidateIndex].id,
          polling_unit_id: unit.id,
          encrypted_vote_data: Buffer.from(JSON.stringify({
            voterId,
            candidateId: presidentialCandidateIds[candidateIndex].id,
            timestamp: new Date().toISOString()
          })),
          vote_hash: faker.string.uuid(),
          vote_timestamp: voteTimestamp,
          vote_source: voteSource,
          is_counted: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        // Create audit logs for this user
        auditLogs.push({
          id: uuidv4(),
          user_id: voterId,
          action_type: 'VOTE_CAST',
          action_timestamp: new Date(),
          action_details: JSON.stringify({
            resourceType: 'election',
            resourceId: presidentialElectionId,
            electionName: 'Nigeria Presidential Election 2023',
            polling_unit: unit.polling_unit_code,
            timestamp: new Date().toISOString()
          }),
          ip_address: faker.internet.ip(),
          user_agent: faker.internet.userAgent(),
          is_suspicious: false,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        // Create USSD session for some users
        if (faker.datatype.boolean(0.3)) {
          // Store the actual session_id from the ussd_sessions table, not just a random string
          const sessionId = faker.string.alphanumeric(20);
          
          ussdSessions.push({
            id: uuidv4(),
            session_id: sessionId,
            user_id: voterId,
            phone_number: formatPhoneNumber(faker.phone.number()),
            session_data: JSON.stringify({
              electionId: presidentialElectionId,
              lastStep: 'vote_confirmation'
            }),
            current_state: 'completed',
            start_time: new Date(),
            last_access_time: new Date(),
            is_active: false,
            created_at: new Date(),
            updated_at: new Date()
          });
          
          // We'll create USSD votes separately after all sessions are inserted
          // This ensures that all session_ids exist in the database
        }
        
        // Modify the batch insert logic to ensure all ussd_sessions are inserted BEFORE any ussd_votes
        // This is critical to maintain referential integrity
        if (votes.length >= BATCH_SIZE) {
          await batchInsert(queryInterface, 'votes', votes);
          votes.length = 0;
        }
        
        if (auditLogs.length >= BATCH_SIZE) {
          await batchInsert(queryInterface, 'audit_logs', auditLogs);
          auditLogs.length = 0;
        }
      }
      
      // Completely separate the USSD votes creation from the session creation
      // This ensures that we only create votes for sessions that actually exist
      // Insert all USSD sessions first
      if (ussdSessions.length > 0) {
        await batchInsert(queryInterface, 'ussd_sessions', ussdSessions);
        console.log(`Inserted ${ussdSessions.length} USSD sessions`);
      }
      
      // Now query the database to get all valid session IDs
      const [validSessions] = await queryInterface.sequelize.query(
        `SELECT session_id, user_id FROM ussd_sessions`
      );
      
      console.log(`Found ${validSessions.length} valid USSD sessions`);
      
      // Create USSD votes only for valid sessions
      const ussdVotesForValidSessions = [];
      for (let i = 0; i < Math.min(validSessions.length, 1000); i++) {
        // Only create votes for some sessions (not all)
        if (faker.datatype.boolean(0.7)) {
          const session = validSessions[i];
          const sessionId = session.session_id;
          const userId = session.user_id;
          
          // Randomly select a presidential candidate
          const candidateIndex = faker.number.int({ min: 0, max: presidentialCandidateIds.length - 1 });
          const voteTimestamp = faker.date.between({ from: '2023-02-25T08:00:00Z', to: '2023-02-25T18:00:00Z' });
          
          ussdVotesForValidSessions.push({
            id: uuidv4(),
            session_id: sessionId,
            user_id: userId,
            election_id: presidentialElectionId,
            candidate_id: presidentialCandidateIds[candidateIndex].id,
            vote_timestamp: voteTimestamp,
            confirmation_code: faker.string.alphanumeric(6).toUpperCase(),
            is_processed: true,
            processed_at: voteTimestamp,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
      
      // Insert the USSD votes for valid sessions
      if (ussdVotesForValidSessions.length > 0) {
        await batchInsert(queryInterface, 'ussd_votes', ussdVotesForValidSessions);
        console.log(`Inserted ${ussdVotesForValidSessions.length} USSD votes`);
      }
      
      // Clear the arrays to free memory
      ussdSessions.length = 0;
      
      // Process Lagos state for gubernatorial election
      const lagosPollingUnits = pollingUnits.filter(unit => unit.state === 'Lagos');
      const lagosVoterCards = voterCards.filter(card => card.state === 'Lagos');
      const existingLagosVoterIds = lagosVoterCards.map(card => card.user_id);
      
      // Calculate total registered voters in Lagos
      const totalLagosRegisteredVoters = lagosPollingUnits.reduce((sum, unit) => sum + unit.registered_voters, 0);
      
      // Strictly enforce MAX_VOTERS_PER_STATE limit for Lagos
      const targetLagosVoters = Math.min(totalLagosRegisteredVoters, MAX_VOTERS_PER_STATE);
      
      console.log(`Lagos Gubernatorial Election - Total registered voters: ${totalLagosRegisteredVoters}, Target voters: ${targetLagosVoters}`);
      
      // Calculate voters per polling unit proportionally
      const lagosVoterDistribution = lagosPollingUnits.map(unit => {
        const proportion = unit.registered_voters / totalLagosRegisteredVoters;
        return Math.floor(proportion * targetLagosVoters);
      });
      
      // Ensure the total doesn't exceed MAX_VOTERS_PER_STATE by adjusting the last unit if needed
      let totalLagosDistributedVoters = lagosVoterDistribution.reduce((a, b) => a + b, 0);
      if (totalLagosDistributedVoters > MAX_VOTERS_PER_STATE) {
        // Adjust the last unit to ensure we don't exceed the limit
        const excess = totalLagosDistributedVoters - MAX_VOTERS_PER_STATE;
        lagosVoterDistribution[lagosVoterDistribution.length - 1] -= excess;
        totalLagosDistributedVoters = MAX_VOTERS_PER_STATE;
      }
      
      // Distribute votes to ensure Gbadebo Rhodes-Vivour wins
      const lagosVotes = distributeVotesWithWinner(
        totalLagosDistributedVoters,
        lagosGubernCandidateIds.length,
        grvIndex
      );
      
      // Double-check that total votes don't exceed MAX_VOTERS_PER_STATE
      const totalLagosVotes = lagosVotes.reduce((a, b) => a + b, 0);
      console.log(`Lagos Gubernatorial Election - Total voters: ${totalLagosDistributedVoters}, Total votes: ${totalLagosVotes}, Votes distribution: ${lagosVotes}`);
      
      // Ensure we don't create more votes than MAX_VOTERS_PER_STATE
      const maxLagosVotersToCreate = Math.min(totalLagosDistributedVoters, MAX_VOTERS_PER_STATE);
      
      // Create votes for Lagos gubernatorial election
      const lagosGubernVotes = [];
      const lagosVotersUsed = new Set();
      
      // Process each polling unit in Lagos
      let totalLagosVotersCreated = 0;
      for (let i = 0; i < lagosPollingUnits.length && totalLagosVotersCreated < maxLagosVotersToCreate; i++) {
        const unit = lagosPollingUnits[i];
        // Adjust voters for this unit to respect the overall limit
        const votersForUnit = Math.min(lagosVoterDistribution[i], maxLagosVotersToCreate - totalLagosVotersCreated);
        
        if (votersForUnit <= 0) continue;
        
        totalLagosVotersCreated += votersForUnit;
        
        // Distribute candidate votes proportionally for this unit
        const unitVotes = lagosVotes.map(votes => {
          return Math.floor(votes * (votersForUnit / totalLagosVotes));
        });
        
        // Get voters for this polling unit
        const pollingUnitVoters = existingLagosVoterIds.filter(id => {
          const card = lagosVoterCards.find(card => card.user_id === id);
          return card.polling_unit_code === unit.polling_unit_code;
        });
        
        let voterPointer = 0;
        
        // Create votes for Lagos election
        for (let j = 0; j < votersForUnit; j++) {
          let voterId;
          
          // Use existing Lagos voter if available
          if (voterPointer < pollingUnitVoters.length) {
            voterId = pollingUnitVoters[voterPointer++];
          } else if (existingLagosVoterIds.length > 0) {
            // Use any Lagos voter if no specific polling unit voter available
            voterId = existingLagosVoterIds.shift();
          } else {
            // Skip if no Lagos voters left
            continue;
          }
          
          // Skip if voter already used for gubernatorial election
          if (lagosVotersUsed.has(voterId)) continue;
          lagosVotersUsed.add(voterId);
          
          // Determine if this voter should vote for a specific candidate
          let candidateIndex = -1;
          for (let k = 0; k < lagosGubernCandidateIds.length; k++) {
            if (unitVotes[k] > 0) {
              candidateIndex = k;
              unitVotes[k]--;
              break;
            }
          }
          
          // If no specific candidate assigned, skip creating a vote
          if (candidateIndex === -1) continue;
          
          // Create vote for Lagos gubernatorial election
          const voteTimestamp = faker.date.between({ from: '2023-03-18T08:00:00Z', to: '2023-03-18T18:00:00Z' });
          
          lagosGubernVotes.push({
            id: uuidv4(),
            user_id: voterId,
            election_id: lagosElectionId,
            candidate_id: lagosGubernCandidateIds[candidateIndex].id,
            polling_unit_id: unit.id,
            encrypted_vote_data: Buffer.from(JSON.stringify({
              voterId,
              candidateId: lagosGubernCandidateIds[candidateIndex].id,
              timestamp: new Date().toISOString()
            })),
            vote_hash: faker.string.uuid(),
            vote_timestamp: voteTimestamp,
            vote_source: getRandomItem(voteSources),
            is_counted: true,
            created_at: new Date(),
            updated_at: new Date()
          });
          
          // Create audit logs for this vote
          auditLogs.push({
            id: uuidv4(),
            user_id: voterId,
            action_type: 'VOTE_CAST',
            action_timestamp: new Date(),
            action_details: JSON.stringify({
              resourceType: 'election',
              resourceId: lagosElectionId,
              electionName: 'Lagos State Gubernatorial Election 2023',
              polling_unit: unit.polling_unit_code,
              timestamp: new Date().toISOString()
            }),
            ip_address: faker.internet.ip(),
            user_agent: faker.internet.userAgent(),
            is_suspicious: false,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
      
      // Create observer reports
      const observerReports = [];
      
      // Use Observer admins if available, otherwise use random admins
      const reporterIds = adminsByType['Observer'] && adminsByType['Observer'].length > 0
        ? adminsByType['Observer']
        : adminIds.slice(0, 5);
      
      // Create 100 random observer reports
      for (let i = 0; i < 100; i++) {
        const isPresidential = faker.datatype.boolean(0.7);
        const electionId = isPresidential ? presidentialElectionId : lagosElectionId;
        
        // Filter polling units if Lagos election
        const eligibleUnits = isPresidential 
          ? pollingUnits 
          : pollingUnits.filter(unit => unit.state === 'Lagos');
        
        if (eligibleUnits.length === 0) continue;
        
        const pollingUnit = getRandomItem(eligibleUnits);
        const reportType = getRandomItem(reportTypes);
        const observerId = getRandomItem(reporterIds);
        
        // 60% have been reviewed
        const reviewed = faker.datatype.boolean(0.6);
        
        // Use ElectoralCommissioner or SystemAuditor for reviews if available
        const reviewerTypes = ['ElectoralCommissioner', 'SystemAuditor'];
        let potentialReviewers = [];
        
        for (const type of reviewerTypes) {
          if (adminsByType[type] && adminsByType[type].length > 0) {
            potentialReviewers = potentialReviewers.concat(adminsByType[type]);
          }
        }
        
        // If no appropriate reviewers, use any admin except the observer
        if (potentialReviewers.length === 0) {
          potentialReviewers = adminIds.filter(id => id !== observerId);
        }
        
        const reviewerId = reviewed ? getRandomItem(potentialReviewers) : null;
        
        observerReports.push({
          id: uuidv4(),
          observer_id: observerId,
          election_id: electionId,
          polling_unit_id: pollingUnit.id,
          report_type: reportType,
          report_content: generateReportContent(reportType, pollingUnit),
          attachments: JSON.stringify([
            { type: 'image', url: 'https://example.com/reports/image1.jpg' },
            { type: 'document', url: 'https://example.com/reports/doc1.pdf' }
          ]),
          status: reviewed ? getRandomItem(reportStatuses.filter(s => s !== 'pending')) : 'pending',
          reviewed_by: reviewerId,
          review_notes: reviewed ? `Review completed on ${faker.date.recent({ days: 7 }).toLocaleDateString()}` : null,
          reviewed_at: reviewed ? faker.date.recent({ days: 7 }) : null,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      
      // Create admin logs
      const adminLogs = [];
      const adminActions = [
        'ADMIN_LOGIN', 'ELECTION_CREATE', 'ELECTION_UPDATE', 'CANDIDATE_ADD',
        'POLLING_UNIT_UPDATE', 'REPORT_REVIEW', 'USER_MANAGEMENT', 'SYSTEM_CONFIG'
      ];
      
      const resourceTypes = [
        'system', 'election', 'candidate', 'polling_unit', 'report', 'user'
      ];
      
      // Create 50 random admin logs
      for (let i = 0; i < 50; i++) {
        const adminId = getRandomItem(adminIds);
        const action = getRandomItem(adminActions);
        const resourceType = getRandomItem(resourceTypes);
        
        adminLogs.push({
          id: uuidv4(),
          admin_id: adminId,
          action: action,
          resource_type: resourceType,
          resource_id: uuidv4(),
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
            description: `Admin performed ${action} on ${resourceType}`,
            result: getRandomItem(['success', 'success', 'success', 'partial success', 'warning'])
          }),
          ip_address: faker.internet.ip(),
          user_agent: faker.internet.userAgent(),
          created_at: new Date()
        });
      }
      
      // Insert any remaining data
      if (votes.length > 0) {
        await batchInsert(queryInterface, 'votes', votes);
        votes.length = 0;
      }
      
      if (lagosGubernVotes.length > 0) {
        await batchInsert(queryInterface, 'votes', lagosGubernVotes);
      }
      
      if (auditLogs.length > 0) {
        await batchInsert(queryInterface, 'audit_logs', auditLogs);
      }
      
      if (observerReports.length > 0) {
        await batchInsert(queryInterface, 'observer_reports', observerReports);
      }
      
      if (adminLogs.length > 0) {
        await batchInsert(queryInterface, 'admin_logs', adminLogs);
      }
      
      // Update election statistics
      // Presidential election stats
      const presidentialVotesCount = votes.length;
      const presidentialValidVotes = votes.filter(vote => vote.is_counted).length;
      const presidentialInvalidVotes = presidentialVotesCount - presidentialValidVotes;
      
      // Calculate turnout for presidential election
      const presidentialRegisteredVoters = pollingUnits.reduce((sum, unit) => sum + unit.registered_voters, 0);
      const presidentialTurnout = (presidentialVotesCount / presidentialRegisteredVoters * 100).toFixed(2);
      
      // Lagos election stats
      const lagosVotesCount = lagosGubernVotes.length;
      const lagosValidVotes = lagosGubernVotes.filter(vote => vote.is_counted).length;
      const lagosInvalidVotes = lagosVotesCount - lagosValidVotes;
      
      // Calculate turnout for Lagos election
      const lagosRegisteredVoters = lagosPollingUnits.reduce((sum, unit) => sum + unit.registered_voters, 0);
      const lagosTurnout = (lagosVotesCount / lagosRegisteredVoters * 100).toFixed(2);
      
      // Update election stats
      await queryInterface.bulkUpdate('election_stats', 
        {
          total_votes: presidentialVotesCount,
          valid_votes: presidentialValidVotes,
          invalid_votes: presidentialInvalidVotes,
          turnout_percentage: parseFloat(presidentialTurnout),
          last_updated: new Date(),
          updated_at: new Date()
        },
        { election_id: presidentialElectionId }
      );
      
      await queryInterface.bulkUpdate('election_stats',
        {
          total_votes: lagosVotesCount,
          valid_votes: lagosValidVotes,
          invalid_votes: lagosInvalidVotes,
          turnout_percentage: parseFloat(lagosTurnout),
          last_updated: new Date(),
          updated_at: new Date()
        },
        { election_id: lagosElectionId }
      );
      
      console.log('Updated election statistics');
      
      // Log candidate results for presidential election
      console.log('Presidential Election Results:');
      const presidentialResults = {};
      for (const vote of votes) {
        if (!presidentialResults[vote.candidate_id]) {
          presidentialResults[vote.candidate_id] = 0;
        }
        presidentialResults[vote.candidate_id]++;
      }
      
      for (const candidate of presidentialCandidateIds) {
        const candidateVotes = presidentialResults[candidate.id] || 0;
        const percentage = ((candidateVotes / presidentialVotesCount) * 100).toFixed(2);
        console.log(`${candidate.full_name} (${candidate.party_code}): ${candidateVotes} votes (${percentage}%)`);
      }
      
      // Log candidate results for Lagos gubernatorial election
      console.log('Lagos Gubernatorial Election Results:');
      const lagosResults = {};
      for (const vote of lagosGubernVotes) {
        if (!lagosResults[vote.candidate_id]) {
          lagosResults[vote.candidate_id] = 0;
        }
        lagosResults[vote.candidate_id]++;
      }
      
      for (const candidate of lagosGubernCandidateIds) {
        const candidateVotes = lagosResults[candidate.id] || 0;
        const percentage = ((candidateVotes / lagosVotesCount) * 100).toFixed(2);
        console.log(`${candidate.full_name} (${candidate.party_code}): ${candidateVotes} votes (${percentage}%)`);
      }
      
      console.log('Database seeding completed successfully');
      
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Clear data in reverse order to avoid foreign key constraints
    // Use transaction to ensure all operations succeed or fail together
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
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

  // Export these values for configuration
  DEFAULT_MAX_VOTERS_PER_STATE,
  get MAX_VOTERS_PER_STATE() { return MAX_VOTERS_PER_STATE; },
  set MAX_VOTERS_PER_STATE(value) { 
    MAX_VOTERS_PER_STATE = value || DEFAULT_MAX_VOTERS_PER_STATE;
    console.log(`MAX_VOTERS_PER_STATE set to: ${MAX_VOTERS_PER_STATE}`);
  }
};