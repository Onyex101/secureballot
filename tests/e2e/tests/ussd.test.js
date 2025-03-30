/**
 * E2E Tests for USSD Flow
 */

const apiClient = require('../utils/apiClient');
const testDataGenerator = require('../utils/testDataGenerator');
const config = require('../config');
const endpoints = require('../data/api-endpoints.json');

// Test variables
let sessionCode = null;
let electionId = null;
let candidateId = null;
let testVoter = null;

describe('USSD Flow', () => {
  beforeAll(async () => {
    // Create a unique test voter for USSD testing
    testVoter = {
      nin: testDataGenerator.generateNIN(),
      vin: testDataGenerator.generateVIN(),
      phoneNumber: testDataGenerator.generatePhoneNumber()
    };
    
    // Try to get an election ID if one was set in a previous test
    if (global.testState && global.testState.testData && 
        global.testState.testData.elections && global.testState.testData.elections.length > 0) {
      electionId = global.testState.testData.elections[0].id;
    }
    
    // Try to get a candidate ID if one was set in a previous test
    if (global.testState && global.testState.testData && 
        global.testState.testData.candidates && global.testState.testData.candidates.length > 0) {
      candidateId = global.testState.testData.candidates[0].id;
    }
  });
  
  test('Initiate USSD session', async () => {
    const endpointInfo = endpoints.ussdRoutes['/api/v1/ussd/start'];
    
    try {
      const response = await apiClient.post(
        '/api/v1/ussd/start',
        {
          ...testVoter
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('sessionCode');
      
      // Store session code for subsequent tests
      sessionCode = response.data.sessionCode;
      console.log(`USSD session initiated with code: ${sessionCode}`);
    } catch (error) {
      console.error('Error initiating USSD session:', error);
      throw error;
    }
  });
  
  test('Check USSD session status', async () => {
    if (!sessionCode) {
      console.warn('Skipping session status test as no session code is available');
      return;
    }
    
    const endpointInfo = endpoints.ussdRoutes['/api/v1/ussd/session-status'];
    
    try {
      const response = await apiClient.get('/api/v1/ussd/session-status', {
        sessionCode: sessionCode
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      
      console.log(`USSD session status: ${response.data.status}`);
    } catch (error) {
      console.error('Error checking USSD session status:', error);
      throw error;
    }
  });
  
  test('Cast vote via USSD', async () => {
    if (!sessionCode || !electionId || !candidateId) {
      console.warn('Skipping USSD voting test as required data is not available');
      return;
    }
    
    const endpointInfo = endpoints.ussdRoutes['/api/v1/ussd/vote'];
    
    try {
      const response = await apiClient.post(
        '/api/v1/ussd/vote',
        {
          sessionCode: sessionCode,
          electionId: electionId,
          candidateId: candidateId
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      
      if (response.data.success) {
        console.log('Successfully cast vote via USSD');
      } else {
        console.log(`Failed to cast vote via USSD: ${response.data.message}`);
      }
    } catch (error) {
      // If the voter already voted, we might get an error
      if (error.response && error.response.status === 400 && 
          error.response.data.error && error.response.data.error.includes('already voted')) {
        console.log('Already voted in this election via USSD');
      } else {
        console.error('Error casting vote via USSD:', error);
        throw error;
      }
    }
  });
  
  test('Authenticate via USSD', async () => {
    const endpointInfo = endpoints.authRoutes['/api/v1/auth/ussd/authenticate'];
    
    try {
      const response = await apiClient.post(
        '/api/v1/auth/ussd/authenticate',
        {
          ...testVoter
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      
      if (response.data.success && response.data.sessionCode) {
        sessionCode = response.data.sessionCode;
        console.log(`USSD authentication successful, session code: ${sessionCode}`);
      }
    } catch (error) {
      console.error('Error authenticating via USSD:', error);
      throw error;
    }
  });
  
  test('Verify USSD session and get token', async () => {
    if (!sessionCode) {
      console.warn('Skipping USSD verification test as no session code is available');
      return;
    }
    
    const endpointInfo = endpoints.authRoutes['/api/v1/auth/ussd/verify-session'];
    
    try {
      const response = await apiClient.post(
        '/api/v1/auth/ussd/verify-session',
        {
          sessionCode: sessionCode
        }
      );
      
      expect(response.status).toBe(200);
      
      if (response.data.token) {
        console.log('USSD verification successful, received auth token');
        apiClient.setAuthToken(response.data.token);
      } else {
        console.log('USSD verification successful, but no token received');
      }
    } catch (error) {
      console.error('Error verifying USSD session:', error);
      throw error;
    }
  });
});

afterAll(async () => {
  // Clean up
  apiClient.clearAuthToken();
}); 