/**
 * Setup file for E2E tests
 * This file is executed before running tests to set up the test environment.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const testDataGenerator = require('./utils/testDataGenerator');
const apiClient = require('./utils/apiClient');

// Ensure the screenshots directory exists
if (config.testSettings.screenshots.enabled) {
  const screenshotsDir = config.testSettings.screenshots.path;
  if (!fs.existsSync(screenshotsDir)) {
    console.log(`Creating screenshots directory: ${screenshotsDir}`);
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
}

// Setup global test state
global.testState = {
  // Store test state across tests
  authToken: null,
  userId: null,
  testData: {
    // Will be populated during setup
    voters: [],
    elections: [],
    candidates: []
  }
};

console.log(`Setting up E2E tests for environment: ${config.environment}`);
console.log(`API Base URL: ${config.environments[config.environment].apiBaseURL}`);

// Generate test data if needed
async function setupTestData() {
  console.log('Generating test data for E2E tests...');
  
  try {
    // Generate a small dataset for testing
    const testData = testDataGenerator.generateCompleteDataset({
      voterCount: 5,
      electionCount: 3,
      candidatesPerElection: 3
    });
    
    // Store in global state for tests to use
    global.testState.testData = testData;
    
    console.log(`Generated ${testData.voters.length} voters, ${testData.elections.length} elections, and ${testData.candidates.length} candidates.`);
  } catch (error) {
    console.error('Error generating test data:', error);
    throw error;
  }
}

// Main setup function
async function setup() {
  try {
    // Set up test data
    await setupTestData();
    
    console.log('E2E test setup complete!');
  } catch (error) {
    console.error('Error during E2E test setup:', error);
    throw error;
  }
}

// Cleanup function
async function cleanup() {
  console.log('Cleaning up after E2E tests...');
  
  // Clear any auth tokens
  apiClient.clearAuthToken();
  
  // Clean up test data if configured to do so
  if (config.testDataSettings.cleanupAfterTests) {
    try {
      testDataGenerator.cleanup();
    } catch (error) {
      console.error('Error during test data cleanup:', error);
    }
  }
}

// Only run setup when this file is executed directly
if (require.main === module) {
  setup().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = {
  setup,
  cleanup
}; 