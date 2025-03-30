// tests/integration/voterRoutes.test.js
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
// Adjust imports based on actual voter controllers/services/models used
const voterController = require('../../src/controllers/voterController'); // Example placeholder
const userModel = require('../../src/db/models/userModel'); // Example placeholder
const testData = require('../api-test-data.json');

// --- Assuming services handle logic ---
const voterService = require('../../src/services/voterService');
const pollingUnitService = require('../../src/services/pollingUnitService'); // Assuming service for polling unit logic
const verificationService = require('../../src/services/verificationService'); // Assuming service for verification
const notificationService = require('../../src/services/notificationService'); // Assuming service for notifications
// No need to import controllers directly if we stub services

describe('Voter Routes Integration Tests - /api/v1/voter (Protected)', () => {
  let sandbox;
  let authToken; // Standard voter token
  let userIdFromToken; // Extract user ID for stub verification

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Generate a standard voter auth token
    const payload = { id: 'test-voter-id', role: 'voter', /* other needed fields */ };
    userIdFromToken = payload.id;
    authToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  });

  afterEach(() => {
    sandbox.restore();
  });

  // --- Voter Profile Routes ---
  describe('GET /profile', () => {
    it('should get the authenticated voter\'s profile successfully', async () => {
      const expectedProfile = testData.voterRoutes['/api/v1/voter/profile'].get.successResponse.data;
      const getProfileStub = sandbox.stub(voterService, 'getVoterProfile').resolves(expectedProfile);

      const response = await request(app)
        .get('/api/v1/voter/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Voter profile retrieved successfully.',
        data: expectedProfile,
      });
      expect(getProfileStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/v1/voter/profile');
      expect(response.status).to.equal(401);
    });

    it('should return 404 if the voter profile is not found', async () => {
      const getProfileStub = sandbox.stub(voterService, 'getVoterProfile').resolves(null);

      const response = await request(app)
        .get('/api/v1/voter/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body).to.deep.equal({
        success: false,
        message: 'Voter profile not found.',
      });
      expect(getProfileStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 500 for unexpected errors', async () => {
        const error = new Error("DB connection error");
        const getProfileStub = sandbox.stub(voterService, 'getVoterProfile').rejects(error);

        const response = await request(app)
            .get('/api/v1/voter/profile')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(response.body.message).to.equal('An unexpected error occurred');
        expect(getProfileStub.calledOnce).to.be.true;
    });
  });

  describe('PUT /profile', () => {
    it('should update the voter\'s profile successfully (e.g., phone number)', async () => {
      const updateData = testData.voterRoutes['/api/v1/voter/profile'].put.requestBody.success;
      const expectedUpdatedProfile = testData.voterRoutes['/api/v1/voter/profile'].put.successResponse.data;
      const updateProfileStub = sandbox.stub(voterService, 'updateVoterProfile').resolves(expectedUpdatedProfile);

      const response = await request(app)
        .put('/api/v1/voter/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Voter profile updated successfully.',
        data: expectedUpdatedProfile,
      });
      expect(updateProfileStub.calledOnceWith(userIdFromToken, updateData)).to.be.true;
    });

     it('should return 400 for invalid input data (e.g., invalid phone format)', async () => {
      const invalidData = { phoneNumber: 'invalid-phone' };
      const response = await request(app)
        .put('/api/v1/voter/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors[0].msg).to.contain('Invalid phone number format');
    });

    it('should return 401 if not authenticated', async () => {
       const updateData = testData.voterRoutes['/api/v1/voter/profile'].put.requestBody.success;
       const response = await request(app).put('/api/v1/voter/profile').send(updateData);
       expect(response.status).to.equal(401);
    });

    // Add 404 test if update could fail due to user not found (though auth middleware usually prevents this)
     it('should return 500 for unexpected errors during update', async () => {
        const updateData = testData.voterRoutes['/api/v1/voter/profile'].put.requestBody.success;
        const error = new Error("Update failed");
        const updateProfileStub = sandbox.stub(voterService, 'updateVoterProfile').rejects(error);

        const response = await request(app)
            .put('/api/v1/voter/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);

        expect(response.status).to.equal(500);
        expect(updateProfileStub.calledOnce).to.be.true;
    });
  });

  // --- Change Password Route ---
  describe('PUT /change-password', () => {
    it('should change the voter\'s password successfully', async () => {
      const passwordData = testData.voterRoutes['/api/v1/voter/change-password'].put.requestBody.success;
      const changePasswordStub = sandbox.stub(voterService, 'changeVoterPassword').resolves({ message: 'Password changed successfully.' });

      const response = await request(app)
        .put('/api/v1/voter/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Password changed successfully.',
      });
      expect(changePasswordStub.calledOnceWith(userIdFromToken, passwordData.currentPassword, passwordData.newPassword)).to.be.true;
    });

     it('should return 400 for missing fields', async () => {
      const invalidData = { ...testData.voterRoutes['/api/v1/voter/change-password'].put.requestBody.success, newPassword: undefined };
       const response = await request(app)
        .put('/api/v1/voter/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
       expect(response.body.success).to.be.false;
       expect(response.body.errors[0].msg).to.contain('New password is required');
    });

     it('should return 400 for weak new password', async () => {
      const invalidData = { ...testData.voterRoutes['/api/v1/voter/change-password'].put.requestBody.success, newPassword: 'short' };
       const response = await request(app)
        .put('/api/v1/voter/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
       expect(response.body.success).to.be.false;
       expect(response.body.errors[0].msg).to.contain('New password must be at least 8 characters');
    });

    it('should return 400 if current password is incorrect', async () => {
       const passwordData = testData.voterRoutes['/api/v1/voter/change-password'].put.requestBody.wrongCurrent;
       const error = { status: 400, message: 'Incorrect current password provided.' };
       const changePasswordStub = sandbox.stub(voterService, 'changeVoterPassword').rejects(error);

       const response = await request(app)
        .put('/api/v1/voter/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).to.equal(400);
        expect(response.body).to.deep.equal({ success: false, message: error.message });
       expect(changePasswordStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
       const passwordData = testData.voterRoutes['/api/v1/voter/change-password'].put.requestBody.success;
       const response = await request(app).put('/api/v1/voter/change-password').send(passwordData);
       expect(response.status).to.equal(401);
    });

     it('should return 500 for unexpected errors', async () => {
        const passwordData = testData.voterRoutes['/api/v1/voter/change-password'].put.requestBody.success;
        const error = new Error("Hashing error");
        const changePasswordStub = sandbox.stub(voterService, 'changeVoterPassword').rejects(error);

        const response = await request(app)
            .put('/api/v1/voter/change-password')
            .set('Authorization', `Bearer ${authToken}`)
            .send(passwordData);

        expect(response.status).to.equal(500);
        expect(changePasswordStub.calledOnce).to.be.true;
    });
  });

  // --- Polling Unit Routes ---
  describe('GET /polling-unit', () => {
    it('should get the voter\'s assigned polling unit successfully', async () => {
      const expectedPollingUnit = testData.voterRoutes['/api/v1/voter/polling-unit'].get.successResponse.data;
      const getAssignedPUStub = sandbox.stub(voterService, 'getVoterPollingUnit').resolves(expectedPollingUnit);

      const response = await request(app)
        .get('/api/v1/voter/polling-unit')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Assigned polling unit retrieved successfully.',
        data: expectedPollingUnit,
      });
      expect(getAssignedPUStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 404 if the voter has no assigned polling unit', async () => {
       const getAssignedPUStub = sandbox.stub(voterService, 'getVoterPollingUnit').resolves(null); // Simulate not found

       const response = await request(app)
        .get('/api/v1/voter/polling-unit')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
       expect(response.body).to.deep.equal({
        success: false,
        message: 'No assigned polling unit found for this voter.',
      });
       expect(getAssignedPUStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/v1/voter/polling-unit');
      expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors', async () => {
        const error = new Error("Server error");
        const getAssignedPUStub = sandbox.stub(voterService, 'getVoterPollingUnit').rejects(error);

        const response = await request(app)
            .get('/api/v1/voter/polling-unit')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(getAssignedPUStub.calledOnce).to.be.true;
    });
  });

  describe('GET /polling-units', () => {
      it('should get a list of all polling units with default pagination', async () => {
          const expectedResult = testData.voterRoutes['/api/v1/voter/polling-units'].get.successResponse; // includes units, total, page, etc.
          const listPUStub = sandbox.stub(pollingUnitService, 'getAllPollingUnits').resolves(expectedResult);
          const defaultQuery = { page: 1, limit: 50 }; // Default params expected by service

          const response = await request(app)
              .get('/api/v1/voter/polling-units')
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: 'Polling units retrieved successfully.',
              data: expectedResult
          });
          expect(listPUStub.calledOnceWith(sinon.match(defaultQuery))).to.be.true; // Check default query args
      });

       it('should get a list of polling units with specific pagination and search query', async () => {
          const queryParams = testData.voterRoutes['/api/v1/voter/polling-units'].get.queryParams.searchAndPaginate;
          const expectedResult = testData.voterRoutes['/api/v1/voter/polling-units'].get.paginatedSearchResponse;
          const listPUStub = sandbox.stub(pollingUnitService, 'getAllPollingUnits').resolves(expectedResult);

          const response = await request(app)
              .get('/api/v1/voter/polling-units')
              .query(queryParams) // Add query params
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(200);
          expect(response.body.data.pollingUnits).to.be.an('array');
          expect(response.body.data.page).to.equal(queryParams.page);
          expect(response.body.data.limit).to.equal(queryParams.limit);
          expect(listPUStub.calledOnceWith(sinon.match(queryParams))).to.be.true; // Check specific query args
      });

      it('should return 401 if not authenticated', async () => {
          const response = await request(app).get('/api/v1/voter/polling-units');
          expect(response.status).to.equal(401);
      });

       it('should handle invalid query parameters gracefully (e.g., non-numeric page)', async () => {
           // The validation middleware should handle this, resulting in a 400
           // Or the service call might just ignore/default the value
           const queryParams = { page: 'abc', limit: 'xyz' };
           const expectedResult = testData.voterRoutes['/api/v1/voter/polling-units'].get.successResponse; // Expect default behavior
            const listPUStub = sandbox.stub(pollingUnitService, 'getAllPollingUnits').resolves(expectedResult);
            const defaultQuery = { page: 1, limit: 50 }; // Service might default invalid params

            const response = await request(app)
                .get('/api/v1/voter/polling-units')
                .query(queryParams)
                .set('Authorization', `Bearer ${authToken}`);

            // Depending on validation setup, could be 200 (with defaults) or 400
             expect(response.status).to.equal(200); // Assuming service defaults invalid params
             expect(listPUStub.calledOnceWith(sinon.match(defaultQuery))).to.be.true;
             // If validation middleware catches it:
             // expect(response.status).to.equal(400);
             // expect(response.body.errors[0].msg).to.contain('must be an integer');
       });

       it('should return 500 for unexpected errors', async () => {
           const error = new Error("DB query failed");
           const listPUStub = sandbox.stub(pollingUnitService, 'getAllPollingUnits').rejects(error);

            const response = await request(app)
                .get('/api/v1/voter/polling-units')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).to.equal(500);
            expect(listPUStub.calledOnce).to.be.true;
       });
  });

  describe('GET /polling-units/:id', () => {
      it('should get a specific polling unit by ID successfully', async () => {
          const pollingUnitId = testData.voterRoutes['/api/v1/voter/polling-units/{id}'].getPathParams().id;
          const expectedPollingUnit = testData.voterRoutes['/api/v1/voter/polling-units/{id}'].get.successResponse.data;
          const getPUStub = sandbox.stub(pollingUnitService, 'getPollingUnitDetails').resolves(expectedPollingUnit);

          const response = await request(app)
              .get(`/api/v1/voter/polling-units/${pollingUnitId}`)
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: 'Polling unit details retrieved successfully.',
              data: expectedPollingUnit
          });
          expect(getPUStub.calledOnceWith(pollingUnitId)).to.be.true;
      });

       it('should return 400 for invalid polling unit ID format', async () => {
          const invalidId = 'not-a-uuid';
          const response = await request(app)
              .get(`/api/v1/voter/polling-units/${invalidId}`)
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(400);
          expect(response.body.success).to.be.false;
          expect(response.body.errors[0].msg).to.contain('Polling Unit ID must be a valid UUID');
      });

       it('should return 404 if polling unit ID not found', async () => {
          const pollingUnitId = testData.voterRoutes['/api/v1/voter/polling-units/{id}'].getPathParams().notFoundId;
          const getPUStub = sandbox.stub(pollingUnitService, 'getPollingUnitDetails').resolves(null);

           const response = await request(app)
              .get(`/api/v1/voter/polling-units/${pollingUnitId}`)
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(404);
           expect(response.body).to.deep.equal({
              success: false,
              message: 'Polling unit not found.',
          });
           expect(getPUStub.calledOnceWith(pollingUnitId)).to.be.true;
      });

       it('should return 401 if not authenticated', async () => {
           const pollingUnitId = testData.voterRoutes['/api/v1/voter/polling-units/{id}'].getPathParams().id;
           const response = await request(app).get(`/api/v1/voter/polling-units/${pollingUnitId}`);
           expect(response.status).to.equal(401);
       });

       it('should return 500 for unexpected errors', async () => {
           const pollingUnitId = testData.voterRoutes['/api/v1/voter/polling-units/{id}'].getPathParams().id;
           const error = new Error("Server error");
            const getPUStub = sandbox.stub(pollingUnitService, 'getPollingUnitDetails').rejects(error);

            const response = await request(app)
                .get(`/api/v1/voter/polling-units/${pollingUnitId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).to.equal(500);
            expect(getPUStub.calledOnce).to.be.true;
       });
  });

  describe('GET /polling-units/nearby', () => {
      it('should get nearby polling units successfully', async () => {
          const queryParams = testData.voterRoutes['/api/v1/voter/polling-units/nearby'].get.queryParams.success;
          const expectedResult = testData.voterRoutes['/api/v1/voter/polling-units/nearby'].get.successResponse; // { units: [], total: ... }
          const nearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').resolves(expectedResult);

          const response = await request(app)
              .get('/api/v1/voter/polling-units/nearby')
              .query(queryParams)
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: 'Nearby polling units retrieved successfully.',
              data: expectedResult
          });
          expect(nearbyStub.calledOnceWith(queryParams.latitude, queryParams.longitude, queryParams.radius || 5, queryParams.limit || 10)).to.be.true; // Check args including defaults
      });

      it('should return 400 if latitude or longitude is missing', async () => {
          const invalidParams = { ...testData.voterRoutes['/api/v1/voter/polling-units/nearby'].get.queryParams.success, latitude: undefined };
          // Validation middleware should catch this
           const response = await request(app)
              .get('/api/v1/voter/polling-units/nearby')
              .query(invalidParams)
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(400);
          expect(response.body.success).to.be.false;
          // Exact error message depends on validator setup
          expect(response.body.message).to.contain('Validation Error');
          expect(response.body.errors[0].msg).to.contain('Latitude is required');
      });

       it('should return 400 if latitude or longitude is not a valid number', async () => {
           const invalidParams = { ...testData.voterRoutes['/api/v1/voter/polling-units/nearby'].get.queryParams.success, longitude: 'abc' };
           const response = await request(app)
              .get('/api/v1/voter/polling-units/nearby')
              .query(invalidParams)
              .set('Authorization', `Bearer ${authToken}`);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Longitude must be a valid number');
       });


       it('should return 401 if not authenticated', async () => {
           const queryParams = testData.voterRoutes['/api/v1/voter/polling-units/nearby'].get.queryParams.success;
           const response = await request(app).get('/api/v1/voter/polling-units/nearby').query(queryParams);
           expect(response.status).to.equal(401);
       });

       it('should return 500 for unexpected errors', async () => {
           const queryParams = testData.voterRoutes['/api/v1/voter/polling-units/nearby'].get.queryParams.success;
           const error = new Error("Geolocation query failed");
           const nearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').rejects(error);

            const response = await request(app)
              .get('/api/v1/voter/polling-units/nearby')
              .query(queryParams)
              .set('Authorization', `Bearer ${authToken}`);

           expect(response.status).to.equal(500);
           expect(nearbyStub.calledOnce).to.be.true;
       });
  });

  // --- Voting History Route ---
  describe('GET /voting-history', () => {
    it('should get the voter\'s voting history successfully', async () => {
      const expectedHistory = testData.voterRoutes['/api/v1/voter/voting-history'].get.successResponse.data; // { votes: [], total: ... }
      const historyStub = sandbox.stub(voterService, 'getVoterVotingHistory').resolves(expectedHistory);
      const defaultQuery = { page: 1, limit: 20 }; // Assume defaults

      const response = await request(app)
        .get('/api/v1/voter/voting-history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Voting history retrieved successfully.',
        data: expectedHistory,
      });
      expect(historyStub.calledOnceWith(userIdFromToken, sinon.match(defaultQuery))).to.be.true;
    });

    it('should get voting history with pagination', async () => {
       const queryParams = { page: 2, limit: 5 };
       const expectedHistory = { votes: [ /* subset of votes */ ], total: 15, page: 2, limit: 5, totalPages: 3 }; // Example paginated response
       const historyStub = sandbox.stub(voterService, 'getVoterVotingHistory').resolves(expectedHistory);

       const response = await request(app)
        .get('/api/v1/voter/voting-history')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(200);
       expect(response.body.data.page).to.equal(queryParams.page);
       expect(response.body.data.limit).to.equal(queryParams.limit);
       expect(historyStub.calledOnceWith(userIdFromToken, sinon.match(queryParams))).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/v1/voter/voting-history');
      expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors', async () => {
        const error = new Error("DB Error");
         const historyStub = sandbox.stub(voterService, 'getVoterVotingHistory').rejects(error);

         const response = await request(app)
            .get('/api/v1/voter/voting-history')
            .set('Authorization', `Bearer ${authToken}`);

         expect(response.status).to.equal(500);
         expect(historyStub.calledOnce).to.be.true;
    });
  });

  // --- Eligibility Check Route ---
  describe('GET /eligibility/:electionId', () => {
    it('should confirm voter is eligible for a specific election', async () => {
      const electionId = testData.voterRoutes['/api/v1/voter/eligibility/{electionId}'].getPathParams().eligible.electionId;
      const expectedEligibility = { eligible: true, reason: null };
      const eligibilityStub = sandbox.stub(voterService, 'checkVoterEligibility').resolves(expectedEligibility);

      const response = await request(app)
        .get(`/api/v1/voter/eligibility/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Eligibility check successful.',
        data: expectedEligibility,
      });
      expect(eligibilityStub.calledOnceWith(userIdFromToken, electionId)).to.be.true;
    });

     it('should confirm voter is ineligible for a specific election with a reason', async () => {
      const electionId = testData.voterRoutes['/api/v1/voter/eligibility/{electionId}'].getPathParams().ineligible.electionId;
      const expectedEligibility = { eligible: false, reason: 'Voter not registered in the required region.' };
      const eligibilityStub = sandbox.stub(voterService, 'checkVoterEligibility').resolves(expectedEligibility);

      const response = await request(app)
        .get(`/api/v1/voter/eligibility/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200); // Still 200, but data indicates ineligibility
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Eligibility check successful.',
        data: expectedEligibility,
      });
      expect(eligibilityStub.calledOnceWith(userIdFromToken, electionId)).to.be.true;
    });

     it('should return 400 for invalid election ID format', async () => {
      const invalidElectionId = 'not-a-uuid';
       const response = await request(app)
        .get(`/api/v1/voter/eligibility/${invalidElectionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.errors[0].msg).to.contain('Election ID must be a valid UUID');
    });

     it('should return 404 if election ID not found', async () => {
       const electionId = testData.voterRoutes['/api/v1/voter/eligibility/{electionId}'].getPathParams().notFound.electionId;
       const error = { status: 404, message: 'Election not found.' };
       const eligibilityStub = sandbox.stub(voterService, 'checkVoterEligibility').rejects(error);

       const response = await request(app)
        .get(`/api/v1/voter/eligibility/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(404);
       expect(response.body).to.deep.equal({ success: false, message: error.message });
       expect(eligibilityStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
       const electionId = testData.voterRoutes['/api/v1/voter/eligibility/{electionId}'].getPathParams().eligible.electionId;
       const response = await request(app).get(`/api/v1/voter/eligibility/${electionId}`);
       expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors', async () => {
        const electionId = testData.voterRoutes['/api/v1/voter/eligibility/{electionId}'].getPathParams().eligible.electionId;
        const error = new Error("Eligibility check failed");
        const eligibilityStub = sandbox.stub(voterService, 'checkVoterEligibility').rejects(error);

        const response = await request(app)
            .get(`/api/v1/voter/eligibility/${electionId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(eligibilityStub.calledOnce).to.be.true;
    });
  });

  // --- Identity Verification Routes ---
  describe('POST /verify-identity', () => {
    it('should initiate identity verification successfully (e.g., send OTP)', async () => {
      // Assuming this requires election context sometimes
      const verificationData = testData.voterRoutes['/api/v1/voter/verify-identity'].post.requestBody.success;
      const expectedResult = { message: 'Identity verification process initiated. Check your registered method.' };
      const initiateStub = sandbox.stub(verificationService, 'initiateVerification').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/voter/verify-identity')
        .set('Authorization', `Bearer ${authToken}`)
        .send(verificationData); // May include method (SMS, Email) or electionId

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: expectedResult.message,
        // data might be null or contain verification ID
      });
      expect(initiateStub.calledOnceWith(userIdFromToken, verificationData)).to.be.true;
    });

    it('should return 400 if voter has already verified recently', async () => {
        const verificationData = testData.voterRoutes['/api/v1/voter/verify-identity'].post.requestBody.alreadyVerified;
        const error = { status: 400, message: 'Identity already verified recently.' };
        const initiateStub = sandbox.stub(verificationService, 'initiateVerification').rejects(error);

        const response = await request(app)
            .post('/api/v1/voter/verify-identity')
            .set('Authorization', `Bearer ${authToken}`)
            .send(verificationData);

        expect(response.status).to.equal(400);
        expect(response.body).to.deep.equal({ success: false, message: error.message });
        expect(initiateStub.calledOnce).to.be.true;
    });

     it('should return 401 if not authenticated', async () => {
        const verificationData = testData.voterRoutes['/api/v1/voter/verify-identity'].post.requestBody.success;
        const response = await request(app).post('/api/v1/voter/verify-identity').send(verificationData);
        expect(response.status).to.equal(401);
     });

      it('should return 500 for unexpected errors', async () => {
        const verificationData = testData.voterRoutes['/api/v1/voter/verify-identity'].post.requestBody.success;
        const error = new Error("OTP service failed");
        const initiateStub = sandbox.stub(verificationService, 'initiateVerification').rejects(error);

        const response = await request(app)
            .post('/api/v1/voter/verify-identity')
            .set('Authorization', `Bearer ${authToken}`)
            .send(verificationData);

        expect(response.status).to.equal(500);
        expect(initiateStub.calledOnce).to.be.true;
    });
  });

  describe('POST /verify-identity/confirm', () => {
      it('should confirm identity verification successfully with correct code', async () => {
          const confirmData = testData.voterRoutes['/api/v1/voter/verify-identity/confirm'].post.requestBody.success;
          const expectedResult = { verified: true, message: 'Identity verified successfully.' };
          const confirmStub = sandbox.stub(verificationService, 'confirmVerification').resolves(expectedResult);

          const response = await request(app)
              .post('/api/v1/voter/verify-identity/confirm')
              .set('Authorization', `Bearer ${authToken}`)
              .send(confirmData); // Includes code, potentially verification ID

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: expectedResult.message,
              data: { verified: true } // Or similar confirmation
          });
          expect(confirmStub.calledOnceWith(userIdFromToken, confirmData.code /*, confirmData.verificationId */)).to.be.true;
      });

       it('should return 400 for missing verification code', async () => {
          const invalidData = { ...testData.voterRoutes['/api/v1/voter/verify-identity/confirm'].post.requestBody.success, code: undefined };
           const response = await request(app)
              .post('/api/v1/voter/verify-identity/confirm')
              .set('Authorization', `Bearer ${authToken}`)
              .send(invalidData);

          expect(response.status).to.equal(400);
          expect(response.body.success).to.be.false;
           expect(response.body.errors[0].msg).to.contain('Verification code is required');
      });

       it('should return 400 for invalid or expired verification code', async () => {
           const confirmData = testData.voterRoutes['/api/v1/voter/verify-identity/confirm'].post.requestBody.invalidCode;
           const error = { status: 400, message: 'Invalid or expired verification code.' };
           const confirmStub = sandbox.stub(verificationService, 'confirmVerification').rejects(error);

            const response = await request(app)
              .post('/api/v1/voter/verify-identity/confirm')
              .set('Authorization', `Bearer ${authToken}`)
              .send(confirmData);

           expect(response.status).to.equal(400);
           expect(response.body).to.deep.equal({ success: false, message: error.message });
           expect(confirmStub.calledOnce).to.be.true;
      });

       it('should return 401 if not authenticated', async () => {
            const confirmData = testData.voterRoutes['/api/v1/voter/verify-identity/confirm'].post.requestBody.success;
            const response = await request(app).post('/api/v1/voter/verify-identity/confirm').send(confirmData);
            expect(response.status).to.equal(401);
       });

        it('should return 500 for unexpected errors', async () => {
            const confirmData = testData.voterRoutes['/api/v1/voter/verify-identity/confirm'].post.requestBody.success;
            const error = new Error("Verification check failed");
             const confirmStub = sandbox.stub(verificationService, 'confirmVerification').rejects(error);

             const response = await request(app)
                .post('/api/v1/voter/verify-identity/confirm')
                .set('Authorization', `Bearer ${authToken}`)
                .send(confirmData);

            expect(response.status).to.equal(500);
            expect(confirmStub.calledOnce).to.be.true;
        });
  });

  // --- Notification Routes ---
  describe('GET /notifications', () => {
    it('should get the voter\'s notifications successfully', async () => {
      const expectedNotifications = testData.voterRoutes['/api/v1/voter/notifications'].get.successResponse.data; // { notifications: [], totalUnread: ..., total: ..., page: ..., limit: ... }
      const getNotifsStub = sandbox.stub(notificationService, 'getUserNotifications').resolves(expectedNotifications);
      const defaultQuery = { page: 1, limit: 10, status: 'all' }; // Example defaults

      const response = await request(app)
        .get('/api/v1/voter/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Notifications retrieved successfully.',
        data: expectedNotifications,
      });
      expect(getNotifsStub.calledOnceWith(userIdFromToken, sinon.match(defaultQuery))).to.be.true;
    });

     it('should get only unread notifications with pagination', async () => {
      const queryParams = { status: 'unread', page: 1, limit: 5 };
       const expectedNotifications = { notifications: [ /* only unread */ ], totalUnread: 3, total: 3, page: 1, limit: 5, totalPages: 1 };
       const getNotifsStub = sandbox.stub(notificationService, 'getUserNotifications').resolves(expectedNotifications);

       const response = await request(app)
        .get('/api/v1/voter/notifications')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(200);
       expect(response.body.data.notifications.every(n => !n.read)).to.be.true; // Check if all returned are unread
       expect(response.body.data.page).to.equal(queryParams.page);
       expect(getNotifsStub.calledOnceWith(userIdFromToken, sinon.match(queryParams))).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/v1/voter/notifications');
      expect(response.status).to.equal(401);
    });

     it('should return 500 for unexpected errors', async () => {
        const error = new Error("Notification service down");
        const getNotifsStub = sandbox.stub(notificationService, 'getUserNotifications').rejects(error);

        const response = await request(app)
            .get('/api/v1/voter/notifications')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(getNotifsStub.calledOnce).to.be.true;
    });
  });

  describe('PUT /notifications/:notificationId/read', () => {
     it('should mark a notification as read successfully', async () => {
      const notificationId = testData.voterRoutes['/api/v1/voter/notifications/{notificationId}/read'].put.pathParams.notificationId;
      const markReadStub = sandbox.stub(notificationService, 'markNotificationAsRead').resolves({ success: true });

      const response = await request(app)
        .put(`/api/v1/voter/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(); // No body usually needed

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Notification marked as read.',
      });
      expect(markReadStub.calledOnceWith(userIdFromToken, notificationId)).to.be.true;
    });

     it('should return 400 for invalid notification ID format', async () => {
      const invalidId = 'not-a-uuid';
       const response = await request(app)
        .put(`/api/v1/voter/notifications/${invalidId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).to.equal(400);
      expect(response.body.errors[0].msg).to.contain('Notification ID must be a valid UUID');
    });

    it('should return 404 if notification not found or does not belong to user', async () => {
       const notificationId = testData.voterRoutes['/api/v1/voter/notifications/{notificationId}/read'].put.pathParams.notFoundId;
       const error = { status: 404, message: 'Notification not found or access denied.' };
       const markReadStub = sandbox.stub(notificationService, 'markNotificationAsRead').rejects(error);

       const response = await request(app)
        .put(`/api/v1/voter/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

       expect(response.status).to.equal(404);
       expect(response.body).to.deep.equal({ success: false, message: error.message });
       expect(markReadStub.calledOnce).to.be.true;
    });

     it('should return 401 if not authenticated', async () => {
        const notificationId = testData.voterRoutes['/api/v1/voter/notifications/{notificationId}/read'].put.pathParams.notificationId;
        const response = await request(app).put(`/api/v1/voter/notifications/${notificationId}/read`).send();
        expect(response.status).to.equal(401);
    });

     it('should return 500 for unexpected errors', async () => {
        const notificationId = testData.voterRoutes['/api/v1/voter/notifications/{notificationId}/read'].put.pathParams.notificationId;
        const error = new Error("DB update failed");
        const markReadStub = sandbox.stub(notificationService, 'markNotificationAsRead').rejects(error);

         const response = await request(app)
            .put(`/api/v1/voter/notifications/${notificationId}/read`)
            .set('Authorization', `Bearer ${authToken}`)
            .send();

        expect(response.status).to.equal(500);
        expect(markReadStub.calledOnce).to.be.true;
    });
  });

}); // End main describe block for Voter Routes 