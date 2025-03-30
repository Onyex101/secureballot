/**
 * E2E Tests for Mobile App Flow
 */

const apiClient = require('../utils/apiClient');
const testDataGenerator = require('../utils/testDataGenerator');
const config = require('../config');
const endpoints = require('../data/api-endpoints.json');

// Test variables
let authToken = null;
let testVoter = null;
let deviceInfo = null;
let electionId = null;

describe('Mobile App Flow', () => {
  beforeAll(async () => {
    // Create a unique test voter for mobile testing
    testVoter = {
      nin: testDataGenerator.generateNIN(),
      vin: testDataGenerator.generateVIN(),
      phoneNumber: testDataGenerator.generatePhoneNumber(),
      password: 'MobileApp123!'
    };
    
    // Create mock device info
    deviceInfo = {
      deviceId: `test-device-${Date.now()}`,
      deviceModel: 'Test Phone Model',
      osVersion: 'Android 12.0',
      appVersion: '1.0.0'
    };
    
    // Try to register the test voter first
    try {
      await registerTestVoter();
    } catch (error) {
      console.error('Error registering test voter:', error);
    }
    
    // Try to get an election ID if one was set in a previous test
    if (global.testState && global.testState.testData && 
        global.testState.testData.elections && global.testState.testData.elections.length > 0) {
      electionId = global.testState.testData.elections[0].id;
    }
  });
  
  // Helper to register the test voter
  async function registerTestVoter() {
    const endpointInfo = endpoints.authRoutes['/api/v1/auth/register'];
    
    try {
      const response = await apiClient.post(
        '/api/v1/auth/register',
        {
          ...endpointInfo.requestBody,
          ...testVoter
        }
      );
      
      console.log(`Test voter registered for mobile tests with ID: ${response.data.userId}`);
      return response.data.userId;
    } catch (error) {
      if (error.response && error.response.status === 400 && 
          error.response.data.error && error.response.data.error.includes('already exists')) {
        console.log('Test voter already exists, continuing with tests');
      } else {
        throw error;
      }
    }
  }
  
  test('Login via mobile app', async () => {
    const endpointInfo = endpoints.mobileRoutes['/api/v1/mobile/auth/login'];
    
    try {
      const response = await apiClient.post(
        '/api/v1/mobile/auth/login',
        {
          nin: testVoter.nin,
          vin: testVoter.vin,
          password: testVoter.password,
          deviceInfo: deviceInfo
        }
      );
      
      expect(response.status).toBe(200);
      
      if (response.data.token) {
        authToken = response.data.token;
        apiClient.setAuthToken(authToken);
        console.log('Successfully logged in via mobile app and received token');
      } else if (response.data.verificationRequired) {
        console.log('Device verification required before login can complete');
      }
    } catch (error) {
      console.error('Error logging in via mobile app:', error);
      throw error;
    }
  });
  
  test('Verify mobile device', async () => {
    if (!deviceInfo) {
      console.warn('Skipping device verification test as no device info is available');
      return;
    }
    
    const endpointInfo = endpoints.mobileRoutes['/api/v1/mobile/auth/verify-device'];
    const verificationCode = '123456'; // This would be received via SMS in a real scenario
    
    try {
      const response = await apiClient.post(
        '/api/v1/mobile/auth/verify-device',
        {
          deviceId: deviceInfo.deviceId,
          verificationCode: verificationCode
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      
      if (response.data.token) {
        authToken = response.data.token;
        apiClient.setAuthToken(authToken);
        console.log('Device verification successful, received auth token');
      } else {
        console.log('Device verification successful, but no token received');
      }
    } catch (error) {
      console.error('Error verifying mobile device:', error);
      throw error;
    }
  });
  
  test('Download offline voting package', async () => {
    if (!authToken || !electionId) {
      console.warn('Skipping offline package test as auth token or election ID is not available');
      return;
    }
    
    const endpointInfo = endpoints.mobileRoutes['/api/v1/mobile/vote/offline-package'];
    
    try {
      const response = await apiClient.get(
        '/api/v1/mobile/vote/offline-package',
        {
          electionId: electionId
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('offlinePackage');
      
      console.log('Successfully downloaded offline voting package');
    } catch (error) {
      console.error('Error downloading offline voting package:', error);
      throw error;
    }
  });
  
  test('Get voter profile via mobile app', async () => {
    if (!authToken) {
      console.warn('Skipping profile test as auth token is not available');
      return;
    }
    
    try {
      const response = await apiClient.get('/api/v1/voter/profile');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('voter');
      expect(response.data.voter.nin).toBe(testVoter.nin);
      
      console.log('Successfully retrieved voter profile via mobile app');
    } catch (error) {
      console.error('Error fetching voter profile via mobile app:', error);
      throw error;
    }
  });
  
  test('Get active elections via mobile app', async () => {
    if (!authToken) {
      console.warn('Skipping elections test as auth token is not available');
      return;
    }
    
    try {
      const response = await apiClient.get(
        '/api/v1/elections',
        {
          status: 'active',
          page: 1,
          limit: 10
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elections');
      
      if (response.data.elections && response.data.elections.length > 0) {
        console.log(`Found ${response.data.elections.length} active elections in mobile app`);
        
        // Update electionId if we didn't have one before
        if (!electionId && response.data.elections.length > 0) {
          electionId = response.data.elections[0].id;
          console.log(`Selected election ID for mobile tests: ${electionId}`);
        }
      } else {
        console.log('No active elections found in mobile app');
      }
    } catch (error) {
      console.error('Error fetching elections via mobile app:', error);
      throw error;
    }
  });
});

afterAll(async () => {
  // Clean up
  apiClient.clearAuthToken();
}); 