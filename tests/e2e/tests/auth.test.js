/**
 * E2E Tests for Authentication Flow
 */

const apiClient = require('../utils/apiClient');
const testDataGenerator = require('../utils/testDataGenerator');
const config = require('../config');
const endpoints = require('../data/api-endpoints.json');

// Test variables
let authToken = null;
let userId = null;
let testVoter = null;

describe('Authentication Flow', () => {
  beforeAll(async () => {
    // Create a unique test voter
    testVoter = {
      nin: testDataGenerator.generateNIN(),
      vin: testDataGenerator.generateVIN(),
      phoneNumber: testDataGenerator.generatePhoneNumber(),
      dateOfBirth: testDataGenerator.generateBirthDate(),
      password: 'SecurePassword123!'
    };
  });
  
  test('Register new voter', async () => {
    const endpointInfo = endpoints.authRoutes['/api/v1/auth/register'];
    
    try {
      const response = await apiClient.post(
        '/api/v1/auth/register',
        {
          ...endpointInfo.requestBody,
          ...testVoter
        }
      );
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('userId');
      
      // Store user ID for later tests
      userId = response.data.userId;
      global.testState.userId = userId;
      
      console.log(`Successfully registered voter with ID: ${userId}`);
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  });
  
  test('Login with registered voter', async () => {
    const endpointInfo = endpoints.authRoutes['/api/v1/auth/login'];
    
    try {
      const response = await apiClient.post(
        '/api/v1/auth/login',
        {
          identifier: testVoter.nin,
          password: testVoter.password
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('mfaRequired');
      
      if (response.data.mfaRequired) {
        console.log('MFA verification required, would need to handle in production test');
      } else {
        // Store auth token for other tests
        authToken = response.data.token;
        apiClient.setAuthToken(authToken);
        global.testState.authToken = authToken;
        
        console.log('Successfully logged in and obtained auth token');
      }
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  });
  
  test('Get voter profile using token', async () => {
    if (!authToken) {
      console.warn('Skipping profile test because auth token is not available');
      return;
    }
    
    const endpointInfo = endpoints.voterRoutes['/api/v1/voter/profile'];
    
    try {
      const response = await apiClient.get('/api/v1/voter/profile');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('voter');
      expect(response.data.voter).toHaveProperty('nin');
      expect(response.data.voter.nin).toBe(testVoter.nin);
      
      console.log('Successfully retrieved voter profile');
    } catch (error) {
      console.error('Error fetching voter profile:', error);
      throw error;
    }
  });
  
  test('Update voter profile', async () => {
    if (!authToken) {
      console.warn('Skipping profile update test because auth token is not available');
      return;
    }
    
    const endpointInfo = endpoints.voterRoutes['/api/v1/voter/profile'];
    const newPhoneNumber = testDataGenerator.generatePhoneNumber();
    
    try {
      const response = await apiClient.put(
        '/api/v1/voter/profile',
        {
          phoneNumber: newPhoneNumber
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('voter');
      expect(response.data.voter.phoneNumber).toBe(newPhoneNumber);
      
      console.log('Successfully updated voter profile');
      
      // Update test voter data
      testVoter.phoneNumber = newPhoneNumber;
    } catch (error) {
      console.error('Error updating voter profile:', error);
      throw error;
    }
  });
  
  test('Change password', async () => {
    if (!authToken) {
      console.warn('Skipping password change test because auth token is not available');
      return;
    }
    
    const endpointInfo = endpoints.voterRoutes['/api/v1/voter/change-password'];
    const newPassword = 'NewSecurePassword456!';
    
    try {
      const response = await apiClient.put(
        '/api/v1/voter/change-password',
        {
          currentPassword: testVoter.password,
          newPassword: newPassword
        }
      );
      
      expect(response.status).toBe(200);
      
      console.log('Successfully changed password');
      
      // Update test voter data
      testVoter.password = newPassword;
      
      // Verify the new password works
      await testLoginWithNewPassword(newPassword);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  });
  
  // Helper to verify login with new password
  async function testLoginWithNewPassword(newPassword) {
    try {
      // Clear the existing token
      apiClient.clearAuthToken();
      
      const response = await apiClient.post(
        '/api/v1/auth/login',
        {
          identifier: testVoter.nin,
          password: newPassword
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      
      // Update auth token
      authToken = response.data.token;
      apiClient.setAuthToken(authToken);
      global.testState.authToken = authToken;
      
      console.log('Successfully verified login with new password');
    } catch (error) {
      console.error('Error verifying new password:', error);
      throw error;
    }
  }
});

afterAll(async () => {
  // Clean up
  apiClient.clearAuthToken();
}); 