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
    // Ensure this voter is registered if USSD endpoints require pre-registration
    testVoter = {
      nin: testDataGenerator.generateNIN(),
      vin: testDataGenerator.generateVIN(),
      phoneNumber: testDataGenerator.generatePhoneNumber(),
      // Add password if registration is needed and performed here
    };

    console.log('Created USSD test voter data:', {
      nin: testVoter.nin,
      vin: testVoter.vin,
      phoneNumber: testVoter.phoneNumber,
    });

    // Attempt to get real election/candidate IDs from global state if available
    // Avoid creating mock IDs
    if (global.testState?.testData?.elections?.length > 0) {
      electionId = global.testState.testData.elections[0].id;
      console.log(`Using election ID from global test data: ${electionId}`);
    } else {
      console.warn('No election ID found in global state. USSD voting test might be skipped.');
    }

    if (global.testState?.testData?.candidates?.length > 0) {
      candidateId = global.testState.testData.candidates[0].id;
      console.log(`Using candidate ID from global test data: ${candidateId}`);
    } else {
      console.warn('No candidate ID found in global state. USSD voting test might be skipped.');
    }

    // Optional: Register the voter here if not assumed to exist
    // try { await registerTestVoter(testVoter); } catch (e) { /* handle */ }
  });

  test('Initiate USSD session', async () => {
    const endpointInfo = endpoints.ussdRoutes['/api/v1/ussd/start'];

    try {
      const response = await apiClient.post('/ussd/start', {
        // Pass appropriate identifiers based on API requirements
        identifier: testVoter.nin, // or vin, or phoneNumber
        phoneNumber: testVoter.phoneNumber, // Often required for USSD
        // ... any other required fields from testVoter
      });

      console.log('USSD session initiation response:', response.data);

      expect(response.status).toBe(200);

      sessionCode = apiClient.extractDataFromResponse(response, [
        'sessionCode',
        'data.sessionCode',
        'session.code',
        'data.session.code',
      ]);

      // Fail if session code is not received
      if (!sessionCode) {
        throw new Error('Session code not found in USSD initiation response.');
      }
      console.log(`USSD session initiated successfully with code: ${sessionCode}`);
    } catch (error) {
      console.error('Error initiating USSD session:', error.response?.data || error.message);
      // Re-throw error to fail the test
      throw error;
    }
  });

  test('Check USSD session status', async () => {
    if (!sessionCode) {
      // Cannot proceed without a session code from the previous step
      throw new Error('Session code not available. Cannot check USSD session status.');
    }

    const endpointInfo = endpoints.ussdRoutes['/api/v1/ussd/session-status'];

    try {
      const response = await apiClient.get('/ussd/session-status', {
        sessionCode: sessionCode,
      });

      console.log('USSD session status response:', response.data);

      expect(response.status).toBe(200);
      // Add more specific assertions based on expected response structure
      expect(response.data).toBeDefined();
      // e.g., expect(response.data.status).toBe('active');

      console.log(`USSD session status checked successfully for code: ${sessionCode}`);
    } catch (error) {
      console.error('Error checking USSD session status:', error.response?.data || error.message);
      throw error;
    }
  });

  test('Cast vote via USSD', async () => {
    if (!sessionCode) {
      throw new Error('Session code not available. Cannot cast vote via USSD.');
    }
    if (!electionId || !candidateId) {
      console.warn('Skipping USSD voting test as election ID or candidate ID is not available.');
      return; // Skip test if prerequisites missing
    }

    const endpointInfo = endpoints.ussdRoutes['/api/v1/ussd/vote'];

    try {
      const response = await apiClient.post('/ussd/vote', {
        sessionCode: sessionCode,
        electionId: electionId,
        candidateId: candidateId,
        // Add PIN or other auth if required by API
      });

      console.log('USSD vote response:', response.data);

      // Expect successful vote creation (2xx status)
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      console.log('Vote via USSD successful or existing vote confirmed.');
    } catch (error) {
      // Check if the error is the specific "already voted" scenario
      // Adjust status code and error code/message check based on actual API response
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data?.code === 'VOTER_ALREADY_VOTED'
      ) {
        // Example error code
        console.warn(
          'Attempted USSD vote, but voter has already voted in this election (expected in re-runs).',
        );
        // Allow the test to pass in this specific scenario
      } else {
        // For any other error, log details and re-throw
        console.error('Error casting vote via USSD:', error.response?.data || error.message);
        throw error;
      }
    }
  });

  test('Authenticate via USSD (if separate from start)', async () => {
    // This test might be redundant if /ussd/start handles authentication
    // Or it might represent a re-authentication step
    const endpointInfo = endpoints.authRoutes['/api/v1/auth/ussd/authenticate'];
    if (!endpointInfo) {
      console.warn('Skipping USSD authenticate test: Endpoint not defined in api-endpoints.json');
      return;
    }

    try {
      const response = await apiClient.post('/auth/ussd/authenticate', {
        identifier: testVoter.nin, // or vin, or phoneNumber
        phoneNumber: testVoter.phoneNumber,
        // ... any other required fields (e.g., PIN)
      });

      console.log('USSD authentication response:', response.data);

      expect(response.status).toBe(200);

      const newSessionCode = apiClient.extractDataFromResponse(response, [
        'sessionCode',
        'data.sessionCode',
        'session.code',
        'data.session.code',
      ]);

      // Expect a session code to be returned on successful authentication
      if (!newSessionCode) {
        throw new Error('Session code not found in USSD authentication response.');
      }
      sessionCode = newSessionCode; // Update session code if a new one is issued
      console.log(`USSD authentication successful, new/updated session code: ${sessionCode}`);
    } catch (error) {
      console.error('Error authenticating via USSD:', error.response?.data || error.message);
      throw error;
    }
  });

  test('Verify USSD session and get token', async () => {
    if (!sessionCode) {
      // Fail if no session code is available from initiation/authentication
      throw new Error('Session code not available. Cannot verify USSD session.');
    }

    const endpointInfo = endpoints.authRoutes['/api/v1/auth/ussd/verify-session'];
    if (!endpointInfo) {
      console.warn('Skipping USSD verify test: Endpoint not defined in api-endpoints.json');
      return;
    }

    try {
      const response = await apiClient.post('/auth/ussd/verify-session', {
        sessionCode: sessionCode,
      });

      console.log('USSD verification response:', response.data);

      expect(response.status).toBe(200);

      const token = apiClient.extractDataFromResponse(response, [
        'token',
        'data.token',
        'accessToken',
        'data.accessToken',
      ]);

      // Expect a token upon successful verification
      if (!token) {
        throw new Error('Auth token not found in USSD verification response.');
      }

      console.log('USSD verification successful, received auth token.');
      apiClient.setAuthToken(token);

      // Set in global state if needed by other tests
      if (global.testState) {
        global.testState.authToken = token;
      }
    } catch (error) {
      console.error('Error verifying USSD session:', error.response?.data || error.message);
      throw error;
    }
  });
});

afterAll(async () => {
  // Clean up any resources if needed
  apiClient.clearAuthToken();
  console.log('Cleaned up USSD test resources.');
});
