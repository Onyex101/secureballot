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
const resultsService = require('../../src/services/resultsService');
const statisticsService = require('../../src/services/statisticsService');

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
    it('should get live results for a specific election successfully', async () => {
      const electionId = testData.resultsRoutes['/api/v1/results/live/{electionId}'].getPathParams().electionId;
      const expectedLiveResults = testData.resultsRoutes['/api/v1/results/live/{electionId}'].get.successResponse.data;
      // Stub the results service method
      const liveResultsStub = sandbox.stub(resultsService, 'fetchLiveElectionResults').resolves(expectedLiveResults);

      const response = await request(app)
        .get(`/api/v1/results/live/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Live election results retrieved successfully.',
        data: expectedLiveResults,
      });
      expect(liveResultsStub.calledOnceWith(electionId)).to.be.true;
    });

    it('should return 400 for invalid election ID format', async () => {
      const invalidId = 'not-a-uuid';
      const response = await request(app)
        .get(`/api/v1/results/live/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.errors[0].msg).to.contain('Election ID must be a valid UUID');
    });

     it('should return 404 if election not found', async () => {
      const electionId = testData.resultsRoutes['/api/v1/results/live/{electionId}'].getPathParams().notFoundId;
      const error = { status: 404, message: 'Election not found or results unavailable.' };
      const liveResultsStub = sandbox.stub(resultsService, 'fetchLiveElectionResults').rejects(error);

      const response = await request(app)
        .get(`/api/v1/results/live/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body).to.deep.equal({ success: false, message: error.message });
      expect(liveResultsStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
       const electionId = testData.resultsRoutes['/api/v1/results/live/{electionId}'].getPathParams().electionId;
       const response = await request(app).get(`/api/v1/results/live/${electionId}`);
       expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors', async () => {
        const electionId = testData.resultsRoutes['/api/v1/results/live/{electionId}'].getPathParams().electionId;
        const error = new Error("Realtime DB error");
        const liveResultsStub = sandbox.stub(resultsService, 'fetchLiveElectionResults').rejects(error);

        const response = await request(app)
            .get(`/api/v1/results/live/${electionId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(liveResultsStub.calledOnce).to.be.true;
    });
  });

  // --- Statistics by Election ---
  describe('GET /statistics/:electionId', () => {
      it('should get election statistics successfully', async () => {
          const electionId = testData.resultsRoutes['/api/v1/results/statistics/{electionId}'].getPathParams().electionId;
          const expectedStats = testData.resultsRoutes['/api/v1/results/statistics/{electionId}'].get.successResponse.data;
          const statsStub = sandbox.stub(statisticsService, 'calculateElectionStatistics').resolves(expectedStats);

          const response = await request(app)
              .get(`/api/v1/results/statistics/${electionId}`)
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: 'Election statistics retrieved successfully.',
              data: expectedStats
          });
          expect(statsStub.calledOnceWith(electionId)).to.be.true;
      });

      it('should return 400 for invalid election ID format', async () => {
          const invalidId = 'not-a-uuid';
          const response = await request(app)
            .get(`/api/v1/results/statistics/${invalidId}`)
            .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(400);
      });

      it('should return 404 if election not found', async () => {
           const electionId = testData.resultsRoutes['/api/v1/results/statistics/{electionId}'].getPathParams().notFoundId;
           const error = { status: 404, message: 'Election not found.' };
           const statsStub = sandbox.stub(statisticsService, 'calculateElectionStatistics').rejects(error);

           const response = await request(app)
              .get(`/api/v1/results/statistics/${electionId}`)
              .set('Authorization', `Bearer ${authToken}`);

           expect(response.status).to.equal(404);
           expect(response.body).to.deep.equal({ success: false, message: error.message });
           expect(statsStub.calledOnce).to.be.true;
       });

       it('should return 401 if not authenticated', async () => {
           const electionId = testData.resultsRoutes['/api/v1/results/statistics/{electionId}'].getPathParams().electionId;
           const response = await request(app).get(`/api/v1/results/statistics/${electionId}`);
           expect(response.status).to.equal(401);
       });

        it('should return 500 for unexpected errors during statistics calculation', async () => {
            const electionId = testData.resultsRoutes['/api/v1/results/statistics/{electionId}'].getPathParams().electionId;
            const error = new Error("Calculation failed");
            const statsStub = sandbox.stub(statisticsService, 'calculateElectionStatistics').rejects(error);

            const response = await request(app)
                .get(`/api/v1/results/statistics/${electionId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).to.equal(500);
            expect(statsStub.calledOnce).to.be.true;
        });
  });

  // --- Detailed Results by Election (handled by statisticsController) ---
  describe('GET /elections/:electionId', () => {
     it('should get detailed election results successfully (without breakdown)', async () => {
        const electionId = testData.resultsRoutes['/api/v1/results/elections/{electionId}'].getPathParams().electionId;
        const expectedResults = testData.resultsRoutes['/api/v1/results/elections/{electionId}'].get.successResponse.data;
        // NOTE: Using the statisticsService based on the route definition
        const resultsStub = sandbox.stub(statisticsService, 'getDetailedElectionResults').resolves(expectedResults);
        const queryParams = { includePollingUnitBreakdown: false }; // Default or explicit false

        const response = await request(app)
            .get(`/api/v1/results/elections/${electionId}`)
            .query(queryParams) // Explicitly set query param for clarity
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body).to.deep.equal({
            success: true,
            message: 'Election results retrieved successfully.',
            data: expectedResults
        });
        // Verify service called with correct electionId and breakdown flag
        expect(resultsStub.calledOnceWith(electionId, false)).to.be.true;
    });

     it('should get detailed election results successfully (with breakdown)', async () => {
        const electionId = testData.resultsRoutes['/api/v1/results/elections/{electionId}'].getPathParams().electionId;
        const expectedResultsWithBreakdown = testData.resultsRoutes['/api/v1/results/elections/{electionId}'].get.successResponseWithBreakdown.data;
        const resultsStub = sandbox.stub(statisticsService, 'getDetailedElectionResults').resolves(expectedResultsWithBreakdown);
        const queryParams = { includePollingUnitBreakdown: true };

        const response = await request(app)
            .get(`/api/v1/results/elections/${electionId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body.data).to.have.property('pollingUnitBreakdown'); // Check for breakdown data
        expect(resultsStub.calledOnceWith(electionId, true)).to.be.true; // Verify breakdown flag is true
    });

     it('should return 400 for invalid election ID format', async () => {
         const invalidId = 'not-a-uuid';
         const response = await request(app)
            .get(`/api/v1/results/elections/${invalidId}`)
            .set('Authorization', `Bearer ${authToken}`);
         expect(response.status).to.equal(400);
     });

     it('should return 404 if election not found', async () => {
         const electionId = testData.resultsRoutes['/api/v1/results/elections/{electionId}'].getPathParams().notFoundId;
         const error = { status: 404, message: 'Election not found.' };
         const resultsStub = sandbox.stub(statisticsService, 'getDetailedElectionResults').rejects(error);

         const response = await request(app)
            .get(`/api/v1/results/elections/${electionId}`)
            .set('Authorization', `Bearer ${authToken}`);

         expect(response.status).to.equal(404);
         expect(resultsStub.calledOnce).to.be.true;
     });

     it('should return 401 if not authenticated', async () => {
        const electionId = testData.resultsRoutes['/api/v1/results/elections/{electionId}'].getPathParams().electionId;
        const response = await request(app).get(`/api/v1/results/elections/${electionId}`);
        expect(response.status).to.equal(401);
     });

      it('should return 500 for unexpected errors', async () => {
        const electionId = testData.resultsRoutes['/api/v1/results/elections/{electionId}'].getPathParams().electionId;
        const error = new Error("Result aggregation failed");
         const resultsStub = sandbox.stub(statisticsService, 'getDetailedElectionResults').rejects(error);

        const response = await request(app)
            .get(`/api/v1/results/elections/${electionId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(resultsStub.calledOnce).to.be.true;
    });
  });

  // --- Live Statistics Across Elections ---
  describe('GET /live', () => {
    it('should get real-time voting stats across all active elections', async () => {
        const expectedStats = testData.resultsRoutes['/api/v1/results/live'].get.successResponse.data;
        // NOTE: Using statisticsService based on route definition
        const statsStub = sandbox.stub(statisticsService, 'getCurrentVotingStatistics').resolves(expectedStats);

        const response = await request(app)
            .get('/api/v1/results/live') // This is the root /live endpoint for overall stats
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body).to.deep.equal({
            success: true,
            message: 'Real-time voting statistics retrieved successfully.',
            data: expectedStats
        });
        expect(statsStub.calledOnce).to.be.true;
    });

     it('should return 401 if not authenticated', async () => {
        const response = await request(app).get('/api/v1/results/live');
        expect(response.status).to.equal(401);
     });

     it('should return 500 for unexpected errors', async () => {
        const error = new Error("Stats service error");
         const statsStub = sandbox.stub(statisticsService, 'getCurrentVotingStatistics').rejects(error);

        const response = await request(app)
            .get('/api/v1/results/live')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(statsStub.calledOnce).to.be.true;
    });
  });

  // --- Results by Region ---
  describe('GET /region/:electionId', () => {
    it('should get results by region for a specific election successfully', async () => {
        const electionId = testData.resultsRoutes['/api/v1/results/region/{electionId}'].getPathParams().electionId;
        const queryParams = testData.resultsRoutes['/api/v1/results/region/{electionId}'].get.queryParams.success; // Contains regionId
        const expectedResults = testData.resultsRoutes['/api/v1/results/region/{electionId}'].get.successResponse.data;
        const regionResultsStub = sandbox.stub(resultsService, 'getElectionResultsByRegion').resolves(expectedResults);

        const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body).to.deep.equal({
            success: true,
            message: 'Regional election results retrieved successfully.',
            data: expectedResults
        });
        expect(regionResultsStub.calledOnceWith(electionId, queryParams.regionId)).to.be.true;
    });

    it('should get results for all regions if regionId is omitted', async () => {
        const electionId = testData.resultsRoutes['/api/v1/results/region/{electionId}'].getPathParams().electionId;
        const expectedResultsAllRegions = testData.resultsRoutes['/api/v1/results/region/{electionId}'].get.successResponseAllRegions.data;
        const regionResultsStub = sandbox.stub(resultsService, 'getElectionResultsByRegion').resolves(expectedResultsAllRegions);

        const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            // No query params
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        // Check structure for all regions
        expect(response.body.data).to.be.an('object'); // Or array, depending on service response format
        expect(regionResultsStub.calledOnceWith(electionId, undefined)).to.be.true; // regionId should be undefined
    });


     it('should return 400 for invalid election ID format', async () => {
         const invalidId = 'not-a-uuid';
         const queryParams = testData.resultsRoutes['/api/v1/results/region/{electionId}'].get.queryParams.success;
         const response = await request(app)
            .get(`/api/v1/results/region/${invalidId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);
         expect(response.status).to.equal(400);
         expect(response.body.errors[0].param).to.equal('electionId');
     });

     it('should return 400 for invalid region ID format', async () => {
         const electionId = testData.resultsRoutes['/api/v1/results/region/{electionId}'].getPathParams().electionId;
         const queryParams = { regionId: 'not-a-uuid' };
         const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);
         expect(response.status).to.equal(400);
          expect(response.body.errors[0].param).to.equal('regionId');
     });

     it('should return 404 if election not found', async () => {
         const electionId = testData.resultsRoutes['/api/v1/results/region/{electionId}'].getPathParams().notFoundId;
         const queryParams = testData.resultsRoutes['/api/v1/results/region/{electionId}'].get.queryParams.success;
         const error = { status: 404, message: 'Election not found.' };
         const regionResultsStub = sandbox.stub(resultsService, 'getElectionResultsByRegion').rejects(error);

         const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

         expect(response.status).to.equal(404);
         expect(regionResultsStub.calledOnce).to.be.true;
     });

     // Potentially add 404 for regionId not found if applicable

     it('should return 401 if not authenticated', async () => {
        const electionId = testData.resultsRoutes['/api/v1/results/region/{electionId}'].getPathParams().electionId;
        const queryParams = testData.resultsRoutes['/api/v1/results/region/{electionId}'].get.queryParams.success;
        const response = await request(app).get(`/api/v1/results/region/${electionId}`).query(queryParams);
        expect(response.status).to.equal(401);
     });

     it('should return 500 for unexpected errors', async () => {
        const electionId = testData.resultsRoutes['/api/v1/results/region/{electionId}'].getPathParams().electionId;
        const queryParams = testData.resultsRoutes['/api/v1/results/region/{electionId}'].get.queryParams.success;
        const error = new Error("Regional aggregation failed");
        const regionResultsStub = sandbox.stub(resultsService, 'getElectionResultsByRegion').rejects(error);

        const response = await request(app)
            .get(`/api/v1/results/region/${electionId}`)
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(regionResultsStub.calledOnce).to.be.true;
    });
  });

}); // End main describe block for Results Routes 