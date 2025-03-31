/**
 * E2E Tests for Elections Flow
 */

const apiClient = require('../utils/apiClient');
const endpoints = require('../data/api-endpoints.json');

// Test variables
let electionId = null;
let candidateId = null;

describe('Elections Flow', () => {
  beforeAll(async () => {
    // Ensure a valid auth token exists from the auth flow
    if (global.testState && global.testState.authToken) {
      apiClient.setAuthToken(global.testState.authToken);
      console.log('Using existing auth token for election tests');
    } else {
      // Throw an error if no valid token is available - tests cannot proceed reliably
      throw new Error(
        'Authentication token not found. Run auth tests first or ensure login is successful.',
      );
    }
  });

  test('Get list of elections', async () => {
    const endpointInfo = endpoints.electionRoutes['/api/v1/elections'];

    try {
      const response = await apiClient.get(
        '/elections',
        endpointInfo?.queryParams, // Optional chaining
      );

      console.log('Elections list response:', response.data);

      expect(response.status).toBe(200);

      // Extract elections using the utility function
      const elections = apiClient.extractDataFromResponse(
        response,
        ['elections', 'data.elections', 'data'],
        [], // Default to empty array if not found
      );

      // Check if elections exist - Do not generate mock data
      if (!elections || elections.length === 0) {
        console.warn('API returned no elections. Skipping subsequent election-dependent tests.');
        // Optionally, fail the test if elections are strictly required:
        // throw new Error('Expected elections from API but received none.');
      } else {
        // Store the first election ID for subsequent tests
        electionId = elections[0].id;
        console.log(`Using election ID: ${electionId} for subsequent tests`);
      }
    } catch (error) {
      console.error('Error fetching elections:', error.response?.data || error.message);
      throw error;
    }
  });

  test('Get election details', async () => {
    if (!electionId) {
      console.warn('Skipping election details test as no election ID is available.');
      return; // Skip if no electionId was obtained previously
    }

    try {
      const response = await apiClient.get(`/elections/${electionId}`);

      console.log('Election details response:', response.data);

      expect(response.status).toBe(200);

      // Extract election using the utility function
      const election = apiClient.extractDataFromResponse(response, [
        'election',
        'data.election',
        'data',
      ]);

      // Ensure election data is present and matches the ID
      if (!election) {
        throw new Error(`Election details not found in response for ID: ${electionId}`);
      }
      expect(election.id).toBe(electionId);

      console.log(
        `Successfully retrieved details for election: ${election.electionName || election.title}`,
      );
    } catch (error) {
      console.error('Error fetching election details:', error.response?.data || error.message);
      throw error;
    }
  });

  test('Get candidates for election', async () => {
    if (!electionId) {
      console.warn('Skipping candidates test as no election ID is available.');
      return; // Skip test
    }

    const endpointInfo = endpoints.electionRoutes['/api/v1/elections/{electionId}/candidates'];

    try {
      const response = await apiClient.get(
        `/elections/${electionId}/candidates`,
        { page: 1, limit: 50 }, // Example query params
      );

      console.log('Candidates response:', response.data);

      expect(response.status).toBe(200);

      // Extract candidates using the utility function
      const candidates = apiClient.extractDataFromResponse(
        response,
        ['candidates', 'data.candidates', 'data'],
        [], // Default to empty array
      );

      // Check if candidates exist - Do not generate mock data
      if (!candidates || candidates.length === 0) {
        console.warn(
          `API returned no candidates for election ${electionId}. Skipping voting tests.`,
        );
        // Optionally, fail if candidates are strictly required:
        // throw new Error(`Expected candidates for election ${electionId} but received none.`);
      } else {
        // Store the first candidate ID for voting tests
        candidateId = candidates[0].id;
        console.log(`Using candidate ID: ${candidateId} for voting tests`);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error.response?.data || error.message);
      throw error;
    }
  });

  test('Cast vote in election', async () => {
    if (!electionId || !candidateId) {
      console.warn('Skipping voting test as election ID or candidate ID is not available.');
      return; // Skip test
    }

    const endpointInfo = endpoints.electionRoutes['/api/v1/elections/{electionId}/vote'];

    try {
      const response = await apiClient.post(`/elections/${electionId}/vote`, {
        candidateId: candidateId,
      });

      console.log('Vote cast response:', response.data);

      // Expect successful vote creation (2xx status)
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      console.log('Successfully cast vote or verified existing vote status.');
    } catch (error) {
      // Check if the error is the specific "already voted" scenario (400)
      // Adjust status code and error message check based on actual API response
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data?.code === 'VOTER_ALREADY_VOTED'
      ) {
        // Example error code
        console.warn(
          'Attempted to vote, but voter has already voted in this election (expected in re-runs).',
        );
        // Allow the test to pass in this specific scenario
      } else {
        // For any other error, log details and re-throw to fail the test
        console.error('Error casting vote:', error.response?.data || error.message);
        throw error;
      }
    }
  });

  test('Get election results', async () => {
    if (!electionId) {
      console.warn('Skipping results test as no election ID is available.');
      return; // Skip test
    }

    try {
      const response = await apiClient.get(`/results/elections/${electionId}`);

      console.log('Election results response:', response.data);

      expect(response.status).toBe(200);
      // Add more specific assertions about the results structure if possible
      expect(response.data).toBeDefined();

      console.log('Successfully retrieved election results');
    } catch (error) {
      // Check if the error is due to results not being ready yet (e.g., election not completed)
      // Adjust status code and error message check based on actual API response
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data?.code === 'ELECTION_NOT_COMPLETED'
      ) {
        // Example error code
        console.warn('Election results not available yet (election likely not completed).');
        // Allow the test to pass in this specific scenario
      } else {
        // For any other error, log details and re-throw
        console.error('Error fetching election results:', error.response?.data || error.message);
        throw error;
      }
    }
  });

  test('Get election statistics', async () => {
    if (!electionId) {
      console.warn('Skipping statistics test as no election ID is available.');
      return; // Skip test
    }

    try {
      const response = await apiClient.get(`/results/statistics/${electionId}`);

      console.log('Election statistics response:', response.data);

      expect(response.status).toBe(200);
      // Add more specific assertions about the statistics structure if possible
      expect(response.data).toBeDefined();

      console.log('Successfully retrieved election statistics');
    } catch (error) {
      console.error('Error fetching election statistics:', error.response?.data || error.message);
      throw error;
    }
  });
});

afterAll(async () => {
  // Clean up
  apiClient.clearAuthToken();
});
