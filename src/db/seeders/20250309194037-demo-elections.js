'use strict';

const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const NaijaFaker = require('@codegrenade/naija-faker');
const { v4: uuidv4 } = require('uuid');

// Initialize Naija Faker
const naijaFaker = new NaijaFaker();

// Constants for our seed data
const SALT_ROUNDS = 10;
const MAX_VOTERS_PER_STATE = 200000;

// Nigeria states and their LGAs
const nigeriaStates = naijaFaker.states();

// Admin types
const adminTypes = ['SuperAdmin', 'ElectionManager', 'PollingOfficer', 'Observer', 'DataAnalyst'];

// Election types
const electionTypes = ['Presidential', 'Gubernatorial'];

// Observer report types
const reportTypes = ['PollingUnitOpening', 'VoterTurnout', 'Irregularity', 'PollingUnitClosing', 'VoteCounting'];

// Report statuses
const reportStatuses = ['pending', 'reviewed', 'resolved', 'rejected'];

// Vote sources
const voteSources = ['Online', 'USSD', 'PollingUnit'];

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

// Helper function to generate a random password hash
async function generatePasswordHash(password = faker.internet.password()) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Helper function to randomly distribute votes to ensure a specific winner
function distributeVotesWithWinner(totalVoters, candidateCount, winnerIndex) {
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


// Helper to generate report content based on type
function generateReportContent(reportType, pollingUnit) {
  switch (reportType) {
    case 'PollingUnitOpening':
      return `Polling unit ${pollingUnit.pollingUnitName} opened ${faker.datatype.boolean(0.8) ? 'on time' : 'with a delay of about ' + faker.number.int({ min: 15, max: 60 }) + ' minutes'}. ${faker.number.int({ min: 5, max: 20 })} voters were in queue at opening. Election officials are ${faker.datatype.boolean(0.7) ? 'present and efficient' : 'understaffed but managing'}. All materials are ${faker.datatype.boolean(0.9) ? 'complete and functional' : 'mostly available with minor issues'}.`;
    
    case 'VoterTurnout':
      return `Voter turnout at ${pollingUnit.pollingUnitName} is ${getRandomItem(['excellent', 'good', 'moderate', 'below expectations'])}. Approximately ${faker.number.int({ min: 30, max: 90 })}% of registered voters have voted so far. The atmosphere is ${getRandomItem(['calm and orderly', 'busy but organized', 'slightly tense but under control', 'enthusiastic and positive'])}.`;
    
    case 'Irregularity':
      return `${getRandomItem([
        'Minor argument between party agents quickly resolved by security.',
        'Short delay in voting due to technical issues with card reader.',
        'Complaint about inadequate lighting in the voting booth.',
        'Voter attempted to vote twice but was identified and prevented.',
        'Party supporter distributing items near polling unit was moved away by security.'
      ])} The issue was ${getRandomItem(['fully resolved', 'handled appropriately', 'addressed by officials', 'documented and contained'])}.`;
    
    case 'PollingUnitClosing':
      return `Polling unit ${pollingUnit.pollingUnitName} closed at ${faker.datatype.boolean(0.8) ? '6:00 PM as scheduled' : faker.time.recent()}. Final voter count was ${faker.number.int({ min: 100, max: pollingUnit.registeredVoters })}. Closing procedures were followed ${faker.datatype.boolean(0.7) ? 'correctly and efficiently' : 'with minor delays but properly'}. All materials have been secured. Party agents ${faker.datatype.boolean(0.9) ? 'have signed the relevant forms' : 'are in the process of reviewing the results'}.`;
    
    case 'VoteCounting':
      return `Vote counting at ${pollingUnit.pollingUnitName} ${faker.datatype.boolean(0.7) ? 'proceeded smoothly' : 'had minor delays but was conducted properly'}. All party agents were ${faker.datatype.boolean(0.9) ? 'present and witnessed the counting' : 'mostly present during the count'}. Results were recorded on the appropriate forms and ${faker.datatype.boolean(0.9) ? 'publicly announced to the satisfaction of observers' : 'documented according to regulations'}. No significant irregularities were observed during the counting process.`;
    
    default:
      return `Standard observation report for ${pollingUnit.pollingUnitName}. Everything proceeding according to electoral guidelines.`;
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('Starting database seeding...');
      
      // Create super admin first
      const superAdminId = uuidv4();
      await queryInterface.bulkInsert('admin_users', [{
        id: superAdminId,
        fullName: 'Super Administrator',
        email: 'admin@secureballot.ng',
        phoneNumber: naijaFaker.phoneNumber(),
        passwordHash: await generatePasswordHash('password123'),
        adminType: 'SuperAdmin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
      console.log('Super admin created');
      
      // Create other admins
      const adminIds = [];
      const adminRoles = [];
      const adminPermissions = [];
      
      for (let i = 0; i < 20; i++) {
        const adminId = uuidv4();
        adminIds.push(adminId);
        const adminType = getRandomItem(adminTypes);
        
        // Admin user
        adminRoles.push({
          id: uuidv4(),
          adminId: adminId,
          roleName: adminType,
          description: `Role for ${adminType}`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Admin permissions
        adminPermissions.push({
          id: uuidv4(),
          adminId: adminId,
          permissionName: `${adminType.toLowerCase()}_access`,
          resourceType: 'system',
          resourceId: null,
          actions: JSON.stringify(['read', adminType === 'SuperAdmin' ? 'write' : 'limited_write']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Create admin users with password hashes
      const adminUserPromises = adminIds.map(async (id, index) => ({
        id: id,
        fullName: `${faker.person.firstName()} ${faker.person.lastName()}`,
        email: faker.internet.email().toLowerCase(),
        phoneNumber: naijaFaker.phone.mobile(),
        passwordHash: await generatePasswordHash(),
        adminType: adminRoles[index].roleName,
        isActive: true,
        createdBy: superAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      const adminUsers = await Promise.all(adminUserPromises);
      
      await queryInterface.bulkInsert('admin_users', adminUsers);
      await queryInterface.bulkInsert('admin_roles', adminRoles);
      await queryInterface.bulkInsert('admin_permissions', adminPermissions);
      console.log(`Created ${adminIds.length} admin users with roles and permissions`);
      
      // Create elections
      const presidentialElectionId = uuidv4();
      const lagosElectionId = uuidv4();
      
      await queryInterface.bulkInsert('elections', [
        {
          id: presidentialElectionId,
          electionName: 'Nigeria Presidential Election 2023',
          electionType: 'Presidential',
          startDate: new Date('2023-02-25T08:00:00Z'),
          endDate: new Date('2023-02-25T18:00:00Z'),
          description: 'General election to elect the President of Nigeria',
          isActive: true,
          status: 'active',
          eligibilityRules: JSON.stringify({
            minimumAge: 18,
            mustHaveValidVoterCard: true,
            mustBeRegisteredVoter: true
          }),
          createdBy: superAdminId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: lagosElectionId,
          electionName: 'Lagos State Gubernatorial Election 2023',
          electionType: 'Gubernatorial',
          startDate: new Date('2023-03-18T08:00:00Z'),
          endDate: new Date('2023-03-18T18:00:00Z'),
          description: 'Election to elect the Governor of Lagos State',
          isActive: true,
          status: 'active',
          eligibilityRules: JSON.stringify({
            minimumAge: 18,
            mustHaveValidVoterCard: true,
            mustBeRegisteredVoter: true,
            stateCriteria: 'Lagos'
          }),
          createdBy: superAdminId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      
      // Create initial election stats
      await queryInterface.bulkInsert('election_stats', [
        {
          id: uuidv4(),
          electionId: presidentialElectionId,
          totalVotes: 0,
          validVotes: 0,
          invalidVotes: 0,
          turnoutPercentage: 0,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          electionId: lagosElectionId,
          totalVotes: 0,
          validVotes: 0,
          invalidVotes: 0,
          turnoutPercentage: 0,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      console.log('Elections created');
      
      // Create presidential candidates
      const presidentCandidateRecords = presidentialCandidates.map(candidate => ({
        id: uuidv4(),
        electionId: presidentialElectionId,
        fullName: candidate.fullName,
        partyCode: candidate.partyCode,
        partyName: candidate.partyName,
        bio: candidate.bio,
        photoUrl: `https://example.com/candidates/${candidate.partyCode.toLowerCase()}_candidate.jpg`,
        position: candidate.position,
        manifesto: candidate.manifesto,
        status: 'approved',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      // Create gubernatorial candidates
      const governorCandidateRecords = lagosGubernatorialCandidates.map(candidate => ({
        id: uuidv4(),
        electionId: lagosElectionId,
        fullName: candidate.fullName,
        partyCode: candidate.partyCode,
        partyName: candidate.partyName,
        bio: candidate.bio,
        photoUrl: `https://example.com/candidates/${candidate.partyCode.toLowerCase()}_candidate.jpg`,
        position: candidate.position,
        manifesto: candidate.manifesto,
        status: 'approved',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await queryInterface.bulkInsert('candidates', [...presidentCandidateRecords, ...governorCandidateRecords]);
      console.log('Candidates created');
      
      // Get candidate IDs for later use
      const presidentialCandidateIds = presidentCandidateRecords.map(candidate => ({
        id: candidate.id,
        fullName: candidate.fullName,
        partyCode: candidate.partyCode
      }));
      
      const lagosGubernCandidateIds = governorCandidateRecords.map(candidate => ({
        id: candidate.id,
        fullName: candidate.fullName,
        partyCode: candidate.partyCode
      }));
      
      // Find Peter Obi's and GRV's candidate indices
      const obiIndex = presidentialCandidateIds.findIndex(c => c.fullName === 'Peter Gregory Obi');
      const grvIndex = lagosGubernCandidateIds.findIndex(c => c.fullName === 'Gbadebo Rhodes-Vivour');
      
      // Create polling units across Nigeria
      const pollingUnits = [];
      
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
              const pollingUnitCode = `PU${state.substring(0, 3).toUpperCase()}${lga.substring(0, 3).toUpperCase()}${ward.toString().padStart(2, '0')}${i.toString().padStart(3, '0')}`;
              const pollingUnitName = `${lga} ${wardName} Polling Unit ${i}`;
              
              // Random registered voters between 500-2000
              const registeredVoters = faker.number.int({ min: 500, max: 2000 });
              
              // Random assigned officer from admin users (officer type)
              const assignedOfficer = getRandomItem(adminIds);
              
              pollingUnits.push({
                id: pollingUnitId,
                pollingUnitCode: pollingUnitCode,
                pollingUnitName: pollingUnitName,
                state: state,
                lga: lga,
                ward: wardName,
                geolocation: JSON.stringify({
                  latitude: faker.location.latitude({ max: 14, min: 4 }),
                  longitude: faker.location.longitude({ max: 15, min: 3 })
                }),
                address: naijaFaker.address(),
                registeredVoters: registeredVoters,
                assignedOfficer: assignedOfficer,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
        }
      }
      
      await queryInterface.bulkInsert('polling_units', pollingUnits);
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
      
      // Process each state for presidential election
      for (const [state, units] of Object.entries(stateUnits)) {
        // Calculate total voters for this state
        // Ensure we don't exceed MAX_VOTERS_PER_STATE
        const totalRegisteredVoters = units.reduce((sum, unit) => sum + unit.registeredVoters, 0);
        const targetVoters = Math.min(totalRegisteredVoters, MAX_VOTERS_PER_STATE);
        
        // Calculate voters per polling unit proportionally
        const voterDistribution = units.map(unit => {
          const proportion = unit.registeredVoters / totalRegisteredVoters;
          return Math.floor(proportion * targetVoters);
        });
        
        // Distribute votes to ensure Peter Obi wins
        const stateVotes = distributeVotesWithWinner(
          voterDistribution.reduce((a, b) => a + b, 0),
          presidentialCandidateIds.length,
          obiIndex
        );
        
        console.log(`State: ${state}, Total voters: ${voterDistribution.reduce((a, b) => a + b, 0)}, Votes: ${stateVotes}`);
        
        // Create voters and votes for each polling unit
        for (let i = 0; i < units.length; i++) {
          const unit = units[i];
          const votersForUnit = voterDistribution[i];
          
          if (votersForUnit <= 0) continue;
          
          // Distribute candidate votes proportionally for this unit
          const unitVotes = stateVotes.map(votes => {
            return Math.floor(votes * (votersForUnit / voterDistribution.reduce((a, b) => a + b, 0)));
          });
          
          // Create voters
          for (let j = 0; j < votersForUnit; j++) {
            // Create a voter
            const voterId = uuidv4();
            const nin = naijaFaker.finance.nin();
            const vin = `${faker.string.alphanumeric(3).toUpperCase()}${faker.number.int({ min: 1000000000, max: 9999999999 })}${faker.string.alphanumeric(6).toUpperCase()}`;
            const phoneNumber = naijaFaker.phone.mobile();
            
            // Random date of birth (18-80 years old)
            const dob = faker.date.birthdate({ min: 18, max: 80, mode: 'age' });
            
            voters.push({
              id: voterId,
              nin: nin,
              vin: vin,
              phoneNumber: phoneNumber,
              dateOfBirth: dob,
              passwordHash: await generatePasswordHash(),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            // Create voter card
            voterCards.push({
              id: uuidv4(),
              userId: voterId,
              fullName: `${faker.person.firstName()} ${faker.person.lastName()}`,
              vin: vin,
              pollingUnitCode: unit.pollingUnitCode,
              state: unit.state,
              lga: unit.lga,
              ward: unit.ward,
              issuedDate: faker.date.recent({ days: 365 }),
              isValid: true,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            // Create verification status
            verificationStatuses.push({
              id: uuidv4(),
              userId: voterId,
              isPhoneVerified: true,
              isEmailVerified: faker.datatype.boolean(0.7),
              isIdentityVerified: true,
              isAddressVerified: faker.datatype.boolean(0.6),
              isBiometricVerified: faker.datatype.boolean(0.8),
              verificationLevel: faker.number.int({ min: 1, max: 5 }),
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            // Determine if this voter should vote for a specific candidate
            let candidateIndex = -1;
            for (let k = 0; k < presidentialCandidateIds.length; k++) {
              if (unitVotes[k] > 0) {
                candidateIndex = k;
                unitVotes[k]--;
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
              userId: voterId,
              electionId: presidentialElectionId,
              candidateId: presidentialCandidateIds[candidateIndex].id,
              pollingUnitId: unit.id,
              encryptedVoteData: Buffer.from(JSON.stringify({
                voterId,
                candidateId: presidentialCandidateIds[candidateIndex].id,
                timestamp: new Date().toISOString()
              })),
              voteHash: faker.string.uuid(),
              voteTimestamp: voteTimestamp,
              voteSource: voteSource,
              isCounted: true,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            // Create audit logs for this user
            auditLogs.push({
              id: uuidv4(),
              userId: voterId,
              action: 'VOTE_CAST',
              resourceType: 'election',
              resourceId: presidentialElectionId,
              details: JSON.stringify({
                electionName: 'Nigeria Presidential Election 2023',
                pollingUnit: unit.pollingUnitCode,
                timestamp: new Date().toISOString()
              }),
              ipAddress: faker.internet.ip(),
              userAgent: faker.internet.userAgent(),
              createdAt: new Date()
            });
            
            // Create USSD session for some users
            if (faker.datatype.boolean(0.3)) {
              const sessionId = faker.string.alphanumeric(20);
              
              ussdSessions.push({
                id: uuidv4(),
                sessionId: sessionId,
                userId: voterId,
                phoneNumber: phoneNumber,
                sessionData: JSON.stringify({
                  electionId: presidentialElectionId,
                  lastStep: 'vote_confirmation'
                }),
                currentState: 'completed',
                startTime: new Date(),
                lastAccessTime: new Date(),
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              // Create USSD vote for this session
              if (faker.datatype.boolean(0.5)) {
                ussdVotes.push({
                  id: uuidv4(),
                  sessionId: sessionId,
                  userId: voterId,
                  electionId: presidentialElectionId,
                  candidateId: presidentialCandidateIds[candidateIndex].id,
                  voteTimestamp: voteTimestamp,
                  confirmationCode: faker.string.alphanumeric(6).toUpperCase(),
                  isProcessed: true,
                  processedAt: voteTimestamp,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            }
          }
        }
      }
      
      // Process Lagos state for gubernatorial election
      const lagosPollingUnits = pollingUnits.filter(unit => unit.state === 'Lagos');
      const voterIds = voters.map(voter => voter.id);
      const lagosVoterCards = voterCards.filter(card => card.state === 'Lagos');
      const existingLagosVoterIds = lagosVoterCards.map(card => card.userId);
      
      // Calculate total registered voters in Lagos
      const totalLagosRegisteredVoters = lagosPollingUnits.reduce((sum, unit) => sum + unit.registeredVoters, 0);
      const targetLagosVoters = Math.min(totalLagosRegisteredVoters, MAX_VOTERS_PER_STATE);
      
      // Calculate voters per polling unit proportionally
      const lagosVoterDistribution = lagosPollingUnits.map(unit => {
        const proportion = unit.registeredVoters / totalLagosRegisteredVoters;
        return Math.floor(proportion * targetLagosVoters);
      });
      
      // Distribute votes to ensure Gbadebo Rhodes-Vivour wins
      const lagosVotes = distributeVotesWithWinner(
        lagosVoterDistribution.reduce((a, b) => a + b, 0),
        lagosGubernCandidateIds.length,
        grvIndex
      );
      
      console.log(`Lagos Gubernatorial Election - Total voters: ${lagosVoterDistribution.reduce((a, b) => a + b, 0)}, Votes distribution: ${lagosVotes}`);
      
      // Create votes for Lagos gubernatorial election
      const lagosGubernVotes = [];
      const lagosVotersUsed = new Set();
      
      // Process each polling unit in Lagos
      for (let i = 0; i < lagosPollingUnits.length; i++) {
        const unit = lagosPollingUnits[i];
        const votersForUnit = lagosVoterDistribution[i];
        
        if (votersForUnit <= 0) continue;
        
        // Distribute candidate votes proportionally for this unit
        const unitVotes = lagosVotes.map(votes => {
          return Math.floor(votes * (votersForUnit / lagosVoterDistribution.reduce((a, b) => a + b, 0)));
        });
        
        // Get voters for this polling unit
        const pollingUnitVoters = existingLagosVoterIds.filter(id => {
          const card = lagosVoterCards.find(card => card.userId === id);
          return card.pollingUnitCode === unit.pollingUnitCode;
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
            userId: voterId,
            electionId: lagosElectionId,
            candidateId: lagosGubernCandidateIds[candidateIndex].id,
            pollingUnitId: unit.id,
            encryptedVoteData: Buffer.from(JSON.stringify({
              voterId,
              candidateId: lagosGubernCandidateIds[candidateIndex].id,
              timestamp: new Date().toISOString()
            })),
            voteHash: faker.string.uuid(),
            voteTimestamp: voteTimestamp,
            voteSource: getRandomItem(voteSources),
            isCounted: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Create audit logs for this vote
          auditLogs.push({
            id: uuidv4(),
            userId: voterId,
            action: 'VOTE_CAST',
            resourceType: 'election',
            resourceId: lagosElectionId,
            details: JSON.stringify({
              electionName: 'Lagos State Gubernatorial Election 2023',
              pollingUnit: unit.pollingUnitCode,
              timestamp: new Date().toISOString()
            }),
            ipAddress: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
            createdAt: new Date()
          });
        }
      }
      
      // Create observer reports
      const observerIds = adminIds.filter((_, index) => adminUsers[index].adminType === 'Observer');
      const observerReports = [];
      
      // Use random admins if no observers
      const reporterIds = observerIds.length > 0 ? observerIds : adminIds.slice(0, 5);
      
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
        const reviewerId = reviewed ? getRandomItem(adminIds.filter(id => id !== observerId)) : null;
        
        observerReports.push({
          id: uuidv4(),
          observerId: observerId,
          electionId: electionId,
          pollingUnitId: pollingUnit.id,
          reportType: reportType,
          reportContent: generateReportContent(reportType, pollingUnit),
          attachments: JSON.stringify([
            { type: 'image', url: 'https://example.com/reports/image1.jpg' },
            { type: 'document', url: 'https://example.com/reports/doc1.pdf' }
          ]),
          status: reviewed ? getRandomItem(reportStatuses.filter(s => s !== 'pending')) : 'pending',
          reviewedBy: reviewerId,
          reviewNotes: reviewed ? `Review completed on ${faker.date.recent({ days: 7 }).toLocaleDateString()}` : null,
          reviewedAt: reviewed ? faker.date.recent({ days: 7 }) : null,
          createdAt: new Date(),
          updatedAt: new Date()
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
          adminId: adminId,
          action: action,
          resourceType: resourceType,
          resourceId: uuidv4(),
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
            description: `Admin performed ${action} on ${resourceType}`,
            result: getRandomItem(['success', 'success', 'success', 'partial success', 'warning'])
          }),
          ipAddress: faker.internet.ip(),
          userAgent: faker.internet.userAgent(),
          createdAt: new Date()
        });
      }
      
      // Bulk insert all data
      console.log('Inserting voters data...');
      await queryInterface.bulkInsert('voters', voters);
      console.log(`Inserted ${voters.length} voters`);
      
      await queryInterface.bulkInsert('voter_cards', voterCards);
      console.log(`Inserted ${voterCards.length} voter cards`);
      
      await queryInterface.bulkInsert('verification_statuses', verificationStatuses);
      console.log(`Inserted ${verificationStatuses.length} verification statuses`);
      
      console.log('Inserting votes data...');
      await queryInterface.bulkInsert('votes', votes);
      console.log(`Inserted ${votes.length} votes for presidential election`);
      
      await queryInterface.bulkInsert('votes', lagosGubernVotes);
      console.log(`Inserted ${lagosGubernVotes.length} votes for Lagos gubernatorial election`);
      
      await queryInterface.bulkInsert('audit_logs', auditLogs);
      console.log(`Inserted ${auditLogs.length} audit logs`);
      
      await queryInterface.bulkInsert('ussd_sessions', ussdSessions);
      console.log(`Inserted ${ussdSessions.length} USSD sessions`);
      
      await queryInterface.bulkInsert('ussd_votes', ussdVotes);
      console.log(`Inserted ${ussdVotes.length} USSD votes`);
      
      await queryInterface.bulkInsert('observer_reports', observerReports);
      console.log(`Inserted ${observerReports.length} observer reports`);
      
      await queryInterface.bulkInsert('admin_logs', adminLogs);
      console.log(`Inserted ${adminLogs.length} admin logs`);
      
      // Update election statistics
      // Presidential election stats
      const presidentialVotesCount = votes.length;
      const presidentialValidVotes = votes.filter(vote => vote.isCounted).length;
      const presidentialInvalidVotes = presidentialVotesCount - presidentialValidVotes;
      
      // Calculate turnout for presidential election
      const presidentialRegisteredVoters = pollingUnits.reduce((sum, unit) => sum + unit.registeredVoters, 0);
      const presidentialTurnout = (presidentialVotesCount / presidentialRegisteredVoters * 100).toFixed(2);
      
      // Lagos election stats
      const lagosVotesCount = lagosGubernVotes.length;
      const lagosValidVotes = lagosGubernVotes.filter(vote => vote.isCounted).length;
      const lagosInvalidVotes = lagosVotesCount - lagosValidVotes;
      
      // Calculate turnout for Lagos election
      const lagosRegisteredVoters = lagosPollingUnits.reduce((sum, unit) => sum + unit.registeredVoters, 0);
      const lagosTurnout = (lagosVotesCount / lagosRegisteredVoters * 100).toFixed(2);
      
      // Update election stats
      await queryInterface.bulkUpdate('election_stats', 
        {
          totalVotes: presidentialVotesCount,
          validVotes: presidentialValidVotes,
          invalidVotes: presidentialInvalidVotes,
          turnoutPercentage: parseFloat(presidentialTurnout),
          lastUpdated: new Date(),
          updatedAt: new Date()
        },
        { electionId: presidentialElectionId }
      );
      
      await queryInterface.bulkUpdate('election_stats',
        {
          totalVotes: lagosVotesCount,
          validVotes: lagosValidVotes,
          invalidVotes: lagosInvalidVotes,
          turnoutPercentage: parseFloat(lagosTurnout),
          lastUpdated: new Date(),
          updatedAt: new Date()
        },
        { electionId: lagosElectionId }
      );
      
      console.log('Updated election statistics');
      
      // Log candidate results for presidential election
      console.log('Presidential Election Results:');
      const presidentialResults = {};
      for (const vote of votes) {
        if (!presidentialResults[vote.candidateId]) {
          presidentialResults[vote.candidateId] = 0;
        }
        presidentialResults[vote.candidateId]++;
      }
      
      for (const candidate of presidentialCandidateIds) {
        const candidateVotes = presidentialResults[candidate.id] || 0;
        const percentage = ((candidateVotes / presidentialVotesCount) * 100).toFixed(2);
        console.log(`${candidate.fullName} (${candidate.partyCode}): ${candidateVotes} votes (${percentage}%)`);
      }
      
      // Log candidate results for Lagos gubernatorial election
      console.log('Lagos Gubernatorial Election Results:');
      const lagosResults = {};
      for (const vote of lagosGubernVotes) {
        if (!lagosResults[vote.candidateId]) {
          lagosResults[vote.candidateId] = 0;
        }
        lagosResults[vote.candidateId]++;
      }
      
      for (const candidate of lagosGubernCandidateIds) {
        const candidateVotes = lagosResults[candidate.id] || 0;
        const percentage = ((candidateVotes / lagosVotesCount) * 100).toFixed(2);
        console.log(`${candidate.fullName} (${candidate.partyCode}): ${candidateVotes} votes (${percentage}%)`);
      }
      
      console.log('Database seeding completed successfully');
      
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Clear data in reverse order to avoid foreign key constraints
    await queryInterface.bulkDelete('admin_logs', null, {});
    await queryInterface.bulkDelete('observer_reports', null, {});
    await queryInterface.bulkDelete('ussd_votes', null, {});
    await queryInterface.bulkDelete('ussd_sessions', null, {});
    await queryInterface.bulkDelete('audit_logs', null, {});
    await queryInterface.bulkDelete('votes', null, {});
    await queryInterface.bulkDelete('election_stats', null, {});
    await queryInterface.bulkDelete('verification_statuses', null, {});
    await queryInterface.bulkDelete('voter_cards', null, {});
    await queryInterface.bulkDelete('voters', null, {});
    await queryInterface.bulkDelete('candidates', null, {});
    await queryInterface.bulkDelete('elections', null, {});
    await queryInterface.bulkDelete('polling_units', null, {});
    await queryInterface.bulkDelete('admin_permissions', null, {});
    await queryInterface.bulkDelete('admin_roles', null, {});
    await queryInterface.bulkDelete('admin_users', null, {});
    
    console.log('All seeded data removed');
  }
};