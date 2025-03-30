/**
 * E2E Tests for Elections Flow
 */

const apiClient = require('../utils/apiClient');
const testDataGenerator = require('../utils/testDataGenerator');
const config = require('../config');
const endpoints = require('../data/api-endpoints.json');

// Test variables
let electionId = null;
let candidateId = null;

describe('Elections Flow', () => {
  beforeAll(async () => {
    // Use the auth token set in auth.test.js if available
    if (global.testState && global.testState.authToken) {
      apiClient.setAuthToken(global.testState.authToken);
      console.log('Using existing auth token');
    } else {
      console.warn('No auth token available. Some tests may fail.');
    }
  });
  
  test('Get list of elections', async () => {
    const endpointInfo = endpoints.electionRoutes['/api/v1/elections'];
    
    try {
      const response = await apiClient.get(
        '/api/v1/elections',
        endpointInfo.queryParams
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elections');
      expect(Array.isArray(response.data.elections)).toBe(true);
      
      // Store the first election ID for subsequent tests if available
      if (response.data.elections && response.data.elections.length > 0) {
        electionId = response.data.elections[0].id;
        console.log(`Using election ID: ${electionId} for subsequent tests`);
      } else {
        console.log('No elections found, some tests will be skipped');
      }
    } catch (error) {
      console.error('Error fetching elections:', error);
      throw error;
    }
  });
  
  test('Get election details', async () => {
    if (!electionId) {
      console.warn('Skipping election details test as no election ID is available');
      return;
    }
    
    try {
      const response = await apiClient.get(`/api/v1/elections/${electionId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('election');
      expect(response.data.election.id).toBe(electionId);
      
      console.log(`Successfully retrieved details for election: ${response.data.election.title}`);
    } catch (error) {
      console.error('Error fetching election details:', error);
      throw error;
    }
  });
  
  test('Get candidates for election', async () => {
    if (!electionId) {
      console.warn('Skipping candidates test as no election ID is available');
      return;
    }
    
    const endpointInfo = endpoints.electionRoutes['/api/v1/elections/{electionId}/candidates'];
    
    try {
      const response = await apiClient.get(
        `/api/v1/elections/${electionId}/candidates`,
        { page: 1, limit: 50 }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('candidates');
      expect(Array.isArray(response.data.candidates)).toBe(true);
      
      // Store the first candidate ID for voting tests if available
      if (response.data.candidates && response.data.candidates.length > 0) {
        candidateId = response.data.candidates[0].id;
        console.log(`Using candidate ID: ${candidateId} for voting tests`);
      } else {
        console.log('No candidates found, voting tests will be skipped');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  });
  
  test('Cast vote in election', async () => {
    if (!electionId || !candidateId) {
      console.warn('Skipping voting test as election ID or candidate ID is not available');
      return;
    }
    
    const endpointInfo = endpoints.electionRoutes['/api/v1/elections/{electionId}/vote'];
    
    try {
      const response = await apiClient.post(
        `/api/v1/elections/${electionId}/vote`,
        {
          candidateId: candidateId
        }
      );
      
      // We expect either a successful vote or an error that we've already voted
      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        console.log('Successfully cast vote');
      } else if (response.status === 400 && response.data.error && response.data.error.includes('already voted')) {
        console.log('Already voted in this election');
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(response)}`);
      }
    } catch (error) {
      // Check if the error is because we already voted
      if (error.response && error.response.status === 400 && 
          error.response.data.error && error.response.data.error.includes('already voted')) {
        console.log('Already voted in this election');
      } else {
        console.error('Error casting vote:', error);
        throw error;
      }
    }
  });
  
  test('Get election results', async () => {
    if (!electionId) {
      console.warn('Skipping results test as no election ID is available');
      return;
    }
    
    try {
      const response = await apiClient.get(`/api/v1/results/elections/${electionId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('results');
      
      console.log('Successfully retrieved election results');
    } catch (error) {
      // If the election is not completed yet, we might get an error
      if (error.response && error.response.status === 400 && 
          error.response.data.error && error.response.data.error.includes('not completed')) {
        console.log('Election results not available yet (election not completed)');
      } else {
        console.error('Error fetching election results:', error);
        throw error;
      }
    }
  });
  
  test('Get election statistics', async () => {
    if (!electionId) {
      console.warn('Skipping statistics test as no election ID is available');
      return;
    }
    
    try {
      const response = await apiClient.get(`/api/v1/results/statistics/${electionId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('statistics');
      
      console.log('Successfully retrieved election statistics');
    } catch (error) {
      console.error('Error fetching election statistics:', error);
      throw error;
    }
  });
});

afterAll(async () => {
  // Clean up
  apiClient.clearAuthToken();
}); 