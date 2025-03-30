/**
 * Test Data Generator for SecureBallot E2E Tests
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Try to use the faker libraries if available
let faker, naijaFaker;
try {
  faker = require('@faker-js/faker').faker;
} catch (error) {
  console.warn('Faker library not available. Using fallback random data generation.');
  faker = null;
}

try {
  naijaFaker = require('@codegrenade/naija-faker');
} catch (error) {
  console.warn('NaijaFaker library not available. Using fallback Nigerian data generation.');
  naijaFaker = null;
}

// Ensure output directory exists
const outputDir = config.testDataSettings.outputDir;
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Generate a unique NIN (National Identification Number)
 * Format: 11 digits
 */
function generateNIN() {
  if (faker) {
    return faker.string.numeric(11);
  }
  return `${Date.now()}`.substring(0, 11).padStart(11, '0');
}

/**
 * Generate a unique VIN (Voter Identification Number)
 * Format: 19 digits
 */
function generateVIN() {
  if (faker) {
    return faker.string.numeric(19);
  }
  return `${Date.now()}${Math.floor(Math.random() * 1000000)}`.substring(0, 19).padStart(19, '0');
}

/**
 * Generate a Nigerian phone number
 */
function generatePhoneNumber() {
  if (naijaFaker) {
    return naijaFaker.phoneNumber();
  }
  return `+234${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
}

/**
 * Generate a random election type
 */
function generateElectionType() {
  const types = ['presidential', 'gubernatorial', 'senatorial', 'house_of_reps', 'local_government'];
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Generate a random election status
 */
function generateElectionStatus() {
  const statuses = ['scheduled', 'ongoing', 'completed', 'cancelled'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

/**
 * Generate a date in the future
 */
function generateFutureDate(daysOffset = 30) {
  if (faker) {
    return faker.date.future().toISOString().split('T')[0];
  }
  
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysOffset));
  return date.toISOString().split('T')[0];
}

/**
 * Generate a birth date for someone of voting age
 */
function generateBirthDate() {
  if (faker) {
    return faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString().split('T')[0];
  }
  
  const date = new Date();
  // Random age between 18 and 80
  const years = Math.floor(Math.random() * 62) + 18;
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().split('T')[0];
}

/**
 * Generate voter registration data
 * @param {number} count - Number of voters to generate
 */
function generateVoters(count = 10) {
  const voters = [];
  
  // Nigerian states and LGAs (fallback if naijafaker not available)
  const fallbackStates = ['Lagos', 'Abuja FCT', 'Kano', 'Rivers', 'Kaduna', 'Imo'];
  const fallbackLGAs = ['Ikeja', 'Abuja Municipal', 'Kano Municipal', 'Port Harcourt', 'Kaduna North', 'Owerri'];
  
  for (let i = 0; i < count; i++) {
    let fullName, address, state, lga, phone;
    
    if (naijaFaker) {
      const person = naijaFaker.person();
      const allStates = naijaFaker.states();
      const allLGAs = naijaFaker.lgas();
      
      fullName = person.fullName;
      address = person.address;
      state = allStates[Math.floor(Math.random() * allStates.length)];
      lga = allLGAs[Math.floor(Math.random() * allLGAs.length)];
      phone = person.phone;
    } else {
      if (faker) {
        fullName = faker.person.fullName();
        address = faker.location.streetAddress();
      } else {
        fullName = `Test Voter ${i}`;
        address = `Test Address ${i}`;
      }
      
      state = fallbackStates[Math.floor(Math.random() * fallbackStates.length)];
      lga = fallbackLGAs[Math.floor(Math.random() * fallbackLGAs.length)];
      phone = generatePhoneNumber();
    }
    
    voters.push({
      nin: generateNIN(),
      vin: generateVIN(),
      phoneNumber: phone,
      dateOfBirth: generateBirthDate(),
      password: 'Password123!',
      fullName: fullName,
      address: address,
      state: state,
      lga: lga
    });
  }
  
  saveToFile('voters.json', voters);
  
  return voters;
}

/**
 * Generate election data
 * @param {number} count - Number of elections to generate
 */
function generateElections(count = 5) {
  const elections = [];
  
  // Nigerian states (fallback if naijafaker not available)
  const fallbackStates = ['Lagos', 'Abuja FCT', 'Kano', 'Rivers', 'Kaduna', 'Imo'];
  
  for (let i = 0; i < count; i++) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30)); // Next 30 days
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    
    const type = generateElectionType();
    const year = new Date().getFullYear();
    let title = `${type.replace('_', ' ')} Election ${year}`;
    let isNational = true;
    
    // For gubernatorial elections, specify the state
    if (type === 'gubernatorial') {
      let state;
      
      if (naijaFaker) {
        const allStates = naijaFaker.states();
        state = allStates[Math.floor(Math.random() * allStates.length)];
      } else {
        state = fallbackStates[Math.floor(Math.random() * fallbackStates.length)];
      }
      
      title = `${state} State Gubernatorial Election ${year}`;
      isNational = false;
    }
    
    let description;
    if (faker) {
      description = faker.lorem.paragraph();
    } else {
      description = `This is a test election for ${title}`;
    }
    
    elections.push({
      id: uuidv4(),
      title: title,
      type: type,
      status: generateElectionStatus(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      description: description,
      isNational: isNational
    });
  }
  
  saveToFile('elections.json', elections);
  
  return elections;
}

/**
 * Generate candidate data for elections
 * @param {Array} elections - List of elections
 * @param {number} perElection - Candidates per election
 */
function generateCandidates(elections, perElection = 5) {
  const candidates = [];
  const nigerianParties = [
    { name: 'All Progressives Congress', acronym: 'APC' },
    { name: 'Peoples Democratic Party', acronym: 'PDP' },
    { name: 'Labour Party', acronym: 'LP' },
    { name: 'New Nigeria Peoples Party', acronym: 'NNPP' },
    { name: 'Young Progressive Party', acronym: 'YPP' },
    { name: 'African Action Congress', acronym: 'AAC' },
    { name: 'Social Democratic Party', acronym: 'SDP' },
    { name: 'Action Democratic Party', acronym: 'ADP' },
    { name: 'Zenith Labour Party', acronym: 'ZLP' },
    { name: 'Action Alliance', acronym: 'AA' }
  ];
  
  elections.forEach(election => {
    // Shuffle parties for this election
    const shuffledParties = [...nigerianParties].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < perElection; i++) {
      const party = shuffledParties[i % shuffledParties.length];
      let fullName;
      
      if (naijaFaker) {
        fullName = naijaFaker.name();
      } else if (faker) {
        fullName = faker.person.fullName();
      } else {
        fullName = `Candidate ${i + 1} for ${election.title}`;
      }
      
      let bio, manifesto, imageUrl;
      if (faker) {
        bio = faker.lorem.paragraph();
        manifesto = faker.lorem.paragraphs(3);
        imageUrl = faker.image.avatar();
      } else {
        bio = `Biography for ${fullName}`;
        manifesto = `Election manifesto for ${fullName}, candidate of ${party.name}`;
        imageUrl = `/assets/candidates/${i}.jpg`;
      }
      
      candidates.push({
        id: uuidv4(),
        electionId: election.id,
        name: fullName,
        party: party.name,
        partyAcronym: party.acronym,
        biography: bio,
        manifesto: manifesto,
        imageUrl: imageUrl
      });
    }
  });
  
  saveToFile('candidates.json', candidates);
  
  return candidates;
}

/**
 * Save data to a JSON file
 * @param {string} filename - The filename to save to
 * @param {object} data - The data to save
 */
function saveToFile(filename, data) {
  try {
    fs.writeFileSync(
      path.join(outputDir, filename),
      JSON.stringify(data, null, 2)
    );
    console.log(`Generated data saved to ${path.join(outputDir, filename)}`);
  } catch (error) {
    console.error(`Error saving ${filename}:`, error.message);
  }
}

/**
 * Generate a complete test dataset
 */
function generateCompleteDataset(options = {}) {
  const {
    voterCount = 10,
    electionCount = 5,
    candidatesPerElection = 5
  } = options;
  
  console.log('Generating complete E2E test dataset...');
  
  // Generate core data sets
  const voters = generateVoters(voterCount);
  const elections = generateElections(electionCount);
  const candidates = generateCandidates(elections, candidatesPerElection);
  
  // Create a combined data set with references
  const combinedData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      voterCount: voters.length,
      electionCount: elections.length,
      candidateCount: candidates.length
    },
    voters,
    elections,
    candidates
  };
  
  saveToFile('e2e-test-data.json', combinedData);
  
  return combinedData;
}

// Clean up generated test data
function cleanup() {
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(outputDir, file));
      }
    });
    console.log('Test data cleanup completed');
  }
}

module.exports = {
  generateNIN,
  generateVIN,
  generatePhoneNumber,
  generateElectionType,
  generateElectionStatus,
  generateFutureDate,
  generateBirthDate,
  generateVoters,
  generateElections,
  generateCandidates,
  generateCompleteDataset,
  cleanup
}; 