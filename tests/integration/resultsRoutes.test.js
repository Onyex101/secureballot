// tests/integration/resultsRoutes.test.js
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
// Adjust imports based on actual results controllers/services/models used
const resultsController = require('../../src/controllers/resultsController'); // Example placeholder
const electionModel = require('../../src/db/models/electionModel'); // Example placeholder
const voteModel = require('../../src/db/models/voteModel'); // Example placeholder
const testData = require('../api-test-data.json');

// --- Service Imports ---
// Assuming services handle the core data retrieval logic for results and statistics
const resultsService = require('../../src/services/resultService');
const statisticsService = require('../../src/services/statisticsService');

// Use inline data for clarity
const MOCK_ELECTION_ID = 'elec-res-123';
const MOCK_NOT_FOUND_ID = 'elec-not-found-404';
const MOCK_INVALID_ID = 'not-a-valid-uuid';

describe('Results Routes Integration Tests - /api/v1/results (Protected)', () => {
  let sandbox;
  let authToken; // Standard user token (voter or admin)
  let userIdFromToken;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Generate a generic auth token
    const payload = { id: 'test-user-id', role: 'voter' }; // Use voter or admin depending on needs
    userIdFromToken = payload.id;
    authToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  });

  afterEach(() => {
    sandbox.restore();
  });

  // --- Live Results by Election ---
  describe('GET /live/:electionId', () => {
    it('should get current results tally for a specific election successfully', async () => {
      const electionId = MOCK_ELECTION_ID;
      // Define minimal expected structure from the service
      const serviceResult = { 
        electionId: electionId,
        totalVotes: 1500, 
        lastUpdated: new Date().toISOString(),
        results: [ { candidateId: 'cand-A', votes: 800 }, { candidateId: 'cand-B', votes: 700 } ] 
      };
      // IMPORTANT: Ensure 'getLiveElectionResults' (or similar) is the correct function name
      const liveResultsStub = sandbox.stub(resultsService, 'getLiveElectionResults').resolves(serviceResult);

      const response = await request(app)
        .get(`/api/v1/results/live/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Live election results retrieved successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.electionId).to.equal(electionId);
      expect(response.body.data.totalVotes).to.equal(serviceResult.totalVotes);
      expect(response.body.data.results).to.be.an('array').with.lengthOf(2);
      expect(response.body.data.results[0].candidateId).to.equal('cand-A');

      expect(liveResultsStub.calledOnceWith(electionId)).to.be.true;
    });

    it('should return 400 for invalid election ID format', async () => {
      const invalidId = MOCK_INVALID_ID;
      const response = await request(app)
        .get(`/api/v1/results/live/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors).to.be.an('array').that.has.length.greaterThan(0);
      expect(response.body.errors.some(e => e.msg.includes('Invalid Election ID format'))).to.be.true; // Adjust msg
    });

     it('should return 404 if election not found by the service', async () => {
      const electionId = MOCK_NOT_FOUND_ID;
      const error = new Error('Election not found or results unavailable.');
      error.status = 404;
      error.code = 'ELECTION_NOT_FOUND';
      // IMPORTANT: Ensure 'getLiveElectionResults' is correct
      const liveResultsStub = sandbox.stub(resultsService, 'getLiveElectionResults').rejects(error);

      const response = await request(app)
        .get(`/api/v1/results/live/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(liveResultsStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
       const electionId = MOCK_ELECTION_ID;
       const response = await request(app).get(`/api/v1/results/live/${electionId}`);
       expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected service errors', async () => {
        const electionId = MOCK_ELECTION_ID;
        const serverError = new Error("Realtime DB connection error");
        // IMPORTANT: Ensure 'getLiveElectionResults' is correct
        const liveResultsStub = sandbox.stub(resultsService, 'getLiveElectionResults').rejects(serverError);

        const response = await request(app)
            .get(`/api/v1/results/live/${electionId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(liveResultsStub.calledOnce).to.be.true;
    });
  });

  // --- Statistics by Election ---
  describe('GET /statistics/:electionId', () => {
      it('should get election statistics successfully', async () => {
          const electionId = MOCK_ELECTION_ID;
          // Define minimal expected stats structure
          const serviceResult = { 
              electionId: electionId, 
              totalRegisteredVoters: 10000, 
              totalVotesCast: 7500, 
              turnoutPercentage: 75.0,
              // ... other stats
          };
          // IMPORTANT: Ensure 'calculateElectionStatistics' is correct
          const statsStub = sandbox.stub(statisticsService, 'calculateElectionStatistics').resolves(serviceResult);

          const response = await request(app)
              .get(`/api/v1/results/statistics/${electionId}`)
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(200);
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.equal('Election statistics retrieved successfully.');
          expect(response.body.data).to.exist;
          expect(response.body.data.electionId).to.equal(electionId);
          expect(response.body.data.totalVotesCast).to.equal(serviceResult.totalVotesCast);
          expect(response.body.data.turnoutPercentage).to.equal(serviceResult.turnoutPercentage);
          
          expect(statsStub.calledOnceWith(electionId)).to.be.true;
      });

      it('should return 400 for invalid election ID format', async () => {
          const invalidId = MOCK_INVALID_ID;
          const response = await request(app)
            .get(`/api/v1/results/statistics/${invalidId}`)
            .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(400);
          // Add validation error checks if applicable
           expect(response.body.success).to.be.false;
           expect(response.body.message).to.equal('Validation Error');
           expect(response.body.errors.some(e => e.msg.includes('Invalid Election ID format'))).to.be.true;
      });

      it('should return 404 if election not found by the service', async () => {
           const electionId = MOCK_NOT_FOUND_ID;
           const error = new Error('Election not found.');
           error.status = 404;
           error.code = 'ELECTION_NOT_FOUND';
           // IMPORTANT: Ensure 'calculateElectionStatistics' is correct
           const statsStub = sandbox.stub(statisticsService, 'calculateElectionStatistics').rejects(error);

           const response = await request(app)
              .get(`/api/v1/results/statistics/${electionId}`)
              .set('Authorization', `Bearer ${authToken}`);

           expect(response.status).to.equal(404);
           expect(response.body.success).to.be.false;
           expect(response.body.message).to.equal(error.message);
           expect(statsStub.calledOnce).to.be.true;
       });

       it('should return 401 if not authenticated', async () => {
           const electionId = MOCK_ELECTION_ID;
           const response = await request(app).get(`/api/v1/results/statistics/${electionId}`);
           expect(response.status).to.equal(401);
       });

        it('should return 500 for unexpected errors during statistics calculation', async () => {
            const electionId = MOCK_ELECTION_ID;
            const serverError = new Error("Statistics calculation failed");
            // IMPORTANT: Ensure 'calculateElectionStatistics' is correct
            const statsStub = sandbox.stub(statisticsService, 'calculateElectionStatistics').rejects(serverError);

            const response = await request(app)
                .get(`/api/v1/results/statistics/${electionId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).to.equal(500);
            expect(response.body.success).to.be.false;
            expect(response.body.message).to.equal('Internal Server Error');
            expect(statsStub.calledOnce).to.be.true;
        });
  });

  // --- Detailed Results by Election (handled by statisticsController) ---
  describe('GET /elections/:electionId', () => {
     it('should get detailed election results successfully (without breakdown)', async () => {
        const electionId = MOCK_ELECTION_ID;
        // Define minimal expected structure
        const serviceResult = { 
            election: { id: electionId, electionName: 'Test Election' },
            summary: { totalVotes: 500, winner: 'cand-A' },
            results: [ { candidateId: 'cand-A', votes: 300 }, { candidateId: 'cand-B', votes: 200 } ]
        };
        // IMPORTANT: Ensure 'getDetailedElectionResults' is correct service and function name
        const resultsStub = sandbox.stub(resultsService, 'getDetailedElectionResults').resolves(serviceResult);
        const includeBreakdown = false; // Explicitly testing without breakdown

        const response = await request(app)
            .get(`/api/v1/results/elections/${electionId}`)
            .query({ includePollingUnitBreakdown: includeBreakdown }) // Pass query param
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.message).to.equal('Election results retrieved successfully.');
        expect(response.body.data).to.exist;
        expect(response.body.data.election?.id).to.equal(electionId);
        expect(response.body.data.summary?.totalVotes).to.equal(serviceResult.summary.totalVotes);
        expect(response.body.data.results).to.be.an('array').with.lengthOf(2);
        expect(response.body.data.pollingUnitBreakdown).to.be.undefined; // Ensure breakdown is NOT present

        // Verify service called with correct electionId and breakdown flag
        expect(resultsStub.calledOnceWith(electionId, includeBreakdown)).to.be.true;
    });

     it('should get detailed election results successfully (with breakdown)', async () => {
        const electionId = MOCK_ELECTION_ID;
        // Define minimal structure including breakdown
         const serviceResult = { 
            election: { id: electionId, electionName: 'Test Election' },
            summary: { totalVotes: 500, winner: 'cand-A' },
            results: [ { candidateId: 'cand-A', votes: 300 }, { candidateId: 'cand-B', votes: 200 } ],
            pollingUnitBreakdown: [ { puCode: 'PU001', results: [/*...*/] }, { puCode: 'PU002', results: [/*...*/] } ]
        };
        // IMPORTANT: Ensure 'getDetailedElectionResults' is correct
        const resultsStub = sandbox.stub(resultsService, 'getDetailedElectionResults').resolves(serviceResult);
        const includeBreakdown = true;

        const response = await request(app)
            .get(`/api/v1/results/elections/${electionId}`)
            .query({ includePollingUnitBreakdown: includeBreakdown })
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.exist;
        expect(response.body.data.pollingUnitBreakdown).to.be.an('array').with.length.gt(0); // Check breakdown exists
        
        expect(resultsStub.calledOnceWith(electionId, includeBreakdown)).to.be.true; // Verify breakdown flag is true
    });

     it('should return 400 for invalid election ID format', async () => {
         const invalidId = MOCK_INVALID_ID;
         const response = await request(app)
            .get(`/api/v1/results/elections/${invalidId}`)
            .set('Authorization', `Bearer ${authToken}`);
         expect(response.status).to.equal(400);
          // Add validation error checks
     });

     it('should return 404 if election not found by the service', async () => {
         const electionId = MOCK_NOT_FOUND_ID;
         const error = new Error('Election not found.');
         error.status = 404;
         // IMPORTANT: Ensure 'getDetailedElectionResults' is correct
         const resultsStub = sandbox.stub(resultsService, 'getDetailedElectionResults').rejects(error);

         const response = await request(app)
            .get(`/api/v1/results/elections/${electionId}`)
            .set('Authorization', `Bearer ${authToken}`);

         expect(response.status).to.equal(404);
         expect(response.body.success).to.be.false;
         expect(response.body.message).to.equal(error.message);
         expect(resultsStub.calledOnce).to.be.true;
     });

     it('should return 401 if not authenticated', async () => {
        const electionId = MOCK_ELECTION_ID;
        const response = await request(app).get(`/api/v1/results/elections/${electionId}`);
        expect(response.status).to.equal(401);
     });

      it('should return 500 for unexpected service errors', async () => {
        const electionId = MOCK_ELECTION_ID;
        const serverError = new Error("Result aggregation failed");
         // IMPORTANT: Ensure 'getDetailedElectionResults' is correct
         const resultsStub = sandbox.stub(resultsService, 'getDetailedElectionResults').rejects(serverError);

        const response = await request(app)
            .get(`/api/v1/results/elections/${electionId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(resultsStub.calledOnce).to.be.true;
    });
  });

  // --- Live Statistics Across Elections ---
  describe('GET /live', () => {
    it('should get real-time voting stats across all active elections', async () => {
        // Inline mock data for overall stats
        const expectedStats = { 
            activeElections: 3,
            totalVotesToday: 10500,
            averageTurnout: 65.5,
            lastUpdated: new Date().toISOString()
            // ... other aggregate stats
        };
        // NOTE: Using statisticsService based on route definition in the original test
        // IMPORTANT: Ensure 'getCurrentVotingStatistics' is correct function name
        const statsStub = sandbox.stub(statisticsService, 'getCurrentVotingStatistics').resolves(expectedStats);

        const response = await request(app)
            .get('/api/v1/results/live') // This is the root /live endpoint for overall stats
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        // REFINED assertions:
        expect(response.body.success).to.be.true;
        expect(response.body.message).to.equal('Real-time voting statistics retrieved successfully.');
        expect(response.body.data).to.exist;
        expect(response.body.data.activeElections).to.equal(expectedStats.activeElections);
        expect(response.body.data.totalVotesToday).to.equal(expectedStats.totalVotesToday);
        expect(response.body.data.averageTurnout).to.equal(expectedStats.averageTurnout);
        // Avoid deep.equal

        expect(statsStub.calledOnce).to.be.true;
    });

     it('should return 401 if not authenticated', async () => {
        const response = await request(app).get('/api/v1/results/live');
        expect(response.status).to.equal(401);
        expect(response.body.message).to.contain('No authorization token');
     });

     it('should return 500 for unexpected errors', async () => {
        const error = new Error("Stats service aggregation error");
         const statsStub = sandbox.stub(statisticsService, 'getCurrentVotingStatistics').rejects(error);

        const response = await request(app)
            .get('/api/v1/results/live')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        // REFINED assertions:
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(statsStub.calledOnce).to.be.true;
    });
  });

  // --- Results by Region ---
  describe('GET /region/:electionId', () => {
    it('should get results by region for a specific election and region successfully', async () => {
        const electionId = 'election-region-test-uuid'; // Inline ID
        const regionId = 'region-south-uuid'; // Inline ID
        const queryParams = { regionId: regionId }; // Inline query
        // Inline mock result for a specific region
        const expectedResults = { 
            regionId: regionId,
            regionName: 'South Region',
            totalVotes: 2500,
            results: [ { candidateId: 'cand-A', votes: 1500 }, { candidateId: 'cand-B', votes: 1000 } ]
            // ... other region-specific stats
        };
        // IMPORTANT: Ensure 'getElectionResultsByRegion' is correct
        const regionResultsStub = sandbox.stub(resultsService, 'getElectionResultsByRegion').resolves(expectedResults);

        const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        // REFINED assertions:
        expect(response.body.success).to.be.true;
        expect(response.body.message).to.equal('Regional election results retrieved successfully.');
        expect(response.body.data).to.exist;
        expect(response.body.data.regionId).to.equal(expectedResults.regionId);
        expect(response.body.data.regionName).to.equal(expectedResults.regionName);
        expect(response.body.data.totalVotes).to.equal(expectedResults.totalVotes);
        expect(response.body.data.results).to.be.an('array').with.lengthOf(expectedResults.results.length);

        expect(regionResultsStub.calledOnceWith(electionId, queryParams.regionId)).to.be.true;
    });

    it('should get results for all regions if regionId is omitted', async () => {
        const electionId = 'election-region-test-uuid'; // Inline ID
        // Inline mock result structure for all regions (e.g., an array or object map)
        const expectedResultsAllRegions = [
             { regionId: 'region-south-uuid', regionName: 'South', totalVotes: 2500, results: [/*...*/] },
             { regionId: 'region-north-uuid', regionName: 'North', totalVotes: 3000, results: [/*...*/] }
        ]; // Example: Array of region results
        // IMPORTANT: Ensure 'getElectionResultsByRegion' is correct
        const regionResultsStub = sandbox.stub(resultsService, 'getElectionResultsByRegion').resolves(expectedResultsAllRegions);

        const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            // No query params
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        // REFINED assertions:
        expect(response.body.success).to.be.true;
        expect(response.body.message).to.equal('Regional election results retrieved successfully.');
        expect(response.body.data).to.be.an('array').with.lengthOf(expectedResultsAllRegions.length); // Check structure
        expect(response.body.data[0].regionId).to.equal(expectedResultsAllRegions[0].regionId);
        expect(response.body.data[0].totalVotes).to.equal(expectedResultsAllRegions[0].totalVotes);

        expect(regionResultsStub.calledOnceWith(electionId, undefined)).to.be.true; // regionId should be undefined
    });


     it('should return 400 for invalid election ID format', async () => {
         const invalidId = 'not-a-valid-election-uuid';
         const queryParams = { regionId: 'region-south-uuid' };
         const response = await request(app)
            .get(`/api/v1/results/region/${invalidId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);
         expect(response.status).to.equal(400);
         // Check validation error message for electionId
         expect(response.body.success).to.be.false;
         expect(response.body.message).to.equal('Validation Error');
         expect(response.body.errors.some(e => e.param === 'electionId' && e.msg.includes('Invalid Election ID format'))).to.be.true; // Adjust msg
     });

     it('should return 400 for invalid region ID format (if provided)', async () => {
         const electionId = 'election-region-test-uuid';
         const queryParams = { regionId: 'not-a-valid-region-uuid' };
         const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);
         expect(response.status).to.equal(400);
          // Check validation error message for regionId
         expect(response.body.success).to.be.false;
         expect(response.body.message).to.equal('Validation Error');
         expect(response.body.errors.some(e => e.param === 'regionId' && e.msg.includes('Invalid Region ID format'))).to.be.true; // Adjust msg
     });

     it('should return 404 if election not found', async () => {
         const electionId = 'election-not-found-uuid'; // Inline ID
         const queryParams = { regionId: 'region-south-uuid' };
         const error = new Error('Election not found.');
         error.status = 404;
         const regionResultsStub = sandbox.stub(resultsService, 'getElectionResultsByRegion').rejects(error);

         const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

         expect(response.status).to.equal(404);
         // REFINED assertions:
         expect(response.body.success).to.be.false;
         expect(response.body.message).to.equal(error.message);
         expect(regionResultsStub.calledOnce).to.be.true;
     });

     // Potentially add 404 for regionId not found if applicable and handled by service
     // it('should return 404 if region ID not found for the given election', async () => { ... });

     it('should return 401 if not authenticated', async () => {
        const electionId = 'election-region-test-uuid';
        const queryParams = { regionId: 'region-south-uuid' };
        const response = await request(app).get(`/api/v1/results/region/${electionId}`).query(queryParams);
        expect(response.status).to.equal(401);
        expect(response.body.message).to.contain('No authorization token');
     });

     it('should return 500 for unexpected errors', async () => {
        const electionId = 'election-region-test-uuid';
        const queryParams = { regionId: 'region-south-uuid' };
        const error = new Error("Regional aggregation database error");
        const regionResultsStub = sandbox.stub(resultsService, 'getElectionResultsByRegion').rejects(error);

        const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        // REFINED assertions:
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(regionResultsStub.calledOnce).to.be.true;
    });
  });

}); // End main describe block for Results Routes 