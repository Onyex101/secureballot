/**
 * Setup file for E2E tests
 * This file is executed before running tests to set up the test environment.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const testDataGenerator = require('./utils/testDataGenerator');
const apiClient = require('./utils/apiClient');

// Initialize global.testState if it doesn't exist
if (!global.testState) {
  global.testState = {
    authToken: null,
    userId: null,
    testData: {
      voters: [],
      elections: [],
      candidates: []
    }
  };
}

// Ensure the screenshots directory exists
if (config.testSettings.screenshots.enabled) {
  const screenshotsDir = config.testSettings.screenshots.path;
  if (!fs.existsSync(screenshotsDir)) {
    console.log(`Creating screenshots directory: ${screenshotsDir}`);
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
}

console.log(`Setting up E2E tests for environment: ${config.environment}`);
console.log(`API Base URL: ${config.apiConfig.baseURL}`);
console.log(`API Prefix: ${config.apiPrefix}`);

if (process.env.E2E_API_BASE_URL) {
  console.log(`Using API Base URL from environment variable: ${process.env.E2E_API_BASE_URL}`);
}

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
    if (!global.testState) {
      global.testState = {};
    }
    
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
    // Make sure testState is initialized
    if (!global.testState) {
      global.testState = {
        authToken: null,
        userId: null,
        testData: {
          voters: [],
          elections: [],
          candidates: []
        }
      };
    }
    
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