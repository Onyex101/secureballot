// tests/integration/mobileRoutes.test.js
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
// Adjust imports based on actual mobile controllers/services/models used
const mobileController = require('../../src/controllers/mobileController'); // Example placeholder
const voterService = require('../../src/services/voterService'); // Example placeholder
const electionService = require('../../src/services/electionService'); // Example placeholder
const mobileAuthService = require('../../src/services/mobileAuthService');
const mobileVoteService = require('../../src/services/mobileVoteService');
const pollingUnitService = require('../../src/services/pollingUnitService'); // Re-using if applicable
const mobileSyncService = require('../../src/services/mobileSyncService');
const testData = require('../api-test-data.json');

describe('Mobile Routes Integration Tests - /api/v1/mobile', () => {
  let sandbox;
  let authToken; // Standard voter token often used for mobile app APIs
  let userIdFromToken;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Generate a standard voter auth token
    const payload = { id: 'test-voter-id', role: 'voter' };
    userIdFromToken = payload.id;
    authToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  });

  afterEach(() => {
    sandbox.restore();
  });

  // --- Mobile Authentication ---
  describe('POST /auth/login', () => {
    it('should login successfully via mobile', async () => {
      const loginData = testData.mobileRoutes['/api/v1/mobile/auth/login'].post.requestBody.success;
      const expectedResult = {
        token: 'mock-mobile-auth-token',
        user: { id: 'user-uuid', nin: loginData.nin, role: 'voter' },
        deviceVerified: false, // Or true if device info matches a verified device
      };
      const loginStub = sandbox.stub(mobileAuthService, 'handleMobileLogin').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/mobile/auth/login')
        .send(loginData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Mobile login successful.',
        data: expectedResult,
      });
      expect(loginStub.calledOnceWith(loginData.nin, loginData.vin, loginData.password, loginData.deviceInfo)).to.be.true;
    });

    it('should return 400 for missing required fields (e.g., vin)', async () => {
       const invalidData = { ...testData.mobileRoutes['/api/v1/mobile/auth/login'].post.requestBody.success, vin: undefined };
       const response = await request(app)
        .post('/api/v1/mobile/auth/login')
        .send(invalidData);

       expect(response.status).to.equal(400);
       expect(response.body.errors[0].msg).to.contain('VIN is required');
    });

    it('should return 401 for invalid credentials', async () => {
        const loginData = testData.mobileRoutes['/api/v1/mobile/auth/login'].post.requestBody.invalidCreds;
        const error = { status: 401, message: 'Invalid credentials provided.' };
        const loginStub = sandbox.stub(mobileAuthService, 'handleMobileLogin').rejects(error);

        const response = await request(app)
            .post('/api/v1/mobile/auth/login')
            .send(loginData);

        expect(response.status).to.equal(401);
        expect(response.body).to.deep.equal({ success: false, message: error.message });
        expect(loginStub.calledOnce).to.be.true;
    });

    it('should return 403 if account requires device verification', async () => {
        const loginData = testData.mobileRoutes['/api/v1/mobile/auth/login'].post.requestBody.needsVerification;
        const error = { status: 403, message: 'Device verification required.', requiresVerification: true };
        const loginStub = sandbox.stub(mobileAuthService, 'handleMobileLogin').rejects(error);

        const response = await request(app)
            .post('/api/v1/mobile/auth/login')
            .send(loginData);

        expect(response.status).to.equal(403);
        expect(response.body).to.deep.equal({ success: false, message: error.message, requiresVerification: true });
        expect(loginStub.calledOnce).to.be.true;
    });

     it('should return 500 for unexpected errors', async () => {
        const loginData = testData.mobileRoutes['/api/v1/mobile/auth/login'].post.requestBody.success;
        const error = new Error("Server error during mobile login");
        const loginStub = sandbox.stub(mobileAuthService, 'handleMobileLogin').rejects(error);

        const response = await request(app)
            .post('/api/v1/mobile/auth/login')
            .send(loginData);

        expect(response.status).to.equal(500);
        expect(loginStub.calledOnce).to.be.true;
     });
  });

  describe('POST /auth/verify-device (Authenticated)', () => {
      it('should verify device successfully with correct code', async () => {
          const verifyData = testData.mobileRoutes['/api/v1/mobile/auth/verify-device'].post.requestBody.success;
          const expectedResult = { message: 'Device verified and linked successfully.' };
          const verifyStub = sandbox.stub(mobileAuthService, 'verifyAndLinkDevice').resolves(expectedResult);

          const response = await request(app)
              .post('/api/v1/mobile/auth/verify-device')
              .set('Authorization', `Bearer ${authToken}`) // Requires auth token from initial login
              .send(verifyData);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: expectedResult.message,
              // data might be null or confirm verification status
          });
          // Service called with userId from token, deviceId, and code
          expect(verifyStub.calledOnceWith(userIdFromToken, verifyData.deviceId, verifyData.verificationCode)).to.be.true;
      });

      it('should return 400 for missing fields (e.g., verificationCode)', async () => {
           const invalidData = { ...testData.mobileRoutes['/api/v1/mobile/auth/verify-device'].post.requestBody.success, verificationCode: undefined };
           const response = await request(app)
              .post('/api/v1/mobile/auth/verify-device')
              .set('Authorization', `Bearer ${authToken}`)
              .send(invalidData);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Verification code is required');
      });

      it('should return 400 for invalid verification code', async () => {
            const verifyData = testData.mobileRoutes['/api/v1/mobile/auth/verify-device'].post.requestBody.invalidCode;
            const error = { status: 400, message: 'Invalid or expired verification code.' };
            const verifyStub = sandbox.stub(mobileAuthService, 'verifyAndLinkDevice').rejects(error);

            const response = await request(app)
                .post('/api/v1/mobile/auth/verify-device')
                .set('Authorization', `Bearer ${authToken}`)
                .send(verifyData);

            expect(response.status).to.equal(400);
            expect(response.body).to.deep.equal({ success: false, message: error.message });
            expect(verifyStub.calledOnce).to.be.true;
      });

       it('should return 401 if not authenticated', async () => {
           const verifyData = testData.mobileRoutes['/api/v1/mobile/auth/verify-device'].post.requestBody.success;
           const response = await request(app).post('/api/v1/mobile/auth/verify-device').send(verifyData);
           expect(response.status).to.equal(401);
       });

       it('should return 500 for unexpected errors', async () => {
           const verifyData = testData.mobileRoutes['/api/v1/mobile/auth/verify-device'].post.requestBody.success;
           const error = new Error("Device verification DB error");
            const verifyStub = sandbox.stub(mobileAuthService, 'verifyAndLinkDevice').rejects(error);

            const response = await request(app)
                .post('/api/v1/mobile/auth/verify-device')
                .set('Authorization', `Bearer ${authToken}`)
                .send(verifyData);

            expect(response.status).to.equal(500);
            expect(verifyStub.calledOnce).to.be.true;
       });
  });

  // --- Mobile Offline Voting ---
  describe('GET /vote/offline-package (Authenticated)', () => {
    it('should download the offline voting package successfully', async () => {
      const queryParams = testData.mobileRoutes['/api/v1/mobile/vote/offline-package'].get.queryParams.success;
      const expectedPackageData = { electionData: { ... }, candidates: [ ... ], /* other necessary data */ }; // Example structure
      // Stub the service method
      const getPackageStub = sandbox.stub(mobileVoteService, 'generateOfflinePackage').resolves(expectedPackageData);

      const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`); // Needs user token

      expect(response.status).to.equal(200);
      // Check response type if it's a file download (e.g., application/octet-stream) or JSON
      // expect(response.headers['content-type']).to.include('application/json'); // Or appropriate type
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Offline voting package generated successfully.',
        data: expectedPackageData,
      });
      expect(getPackageStub.calledOnceWith(userIdFromToken, queryParams.electionId)).to.be.true;
    });

    it('should return 400 for missing electionId', async () => {
       const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .set('Authorization', `Bearer ${authToken}`); // Missing query param

       expect(response.status).to.equal(400);
       expect(response.body.errors[0].msg).to.contain('Election ID is required');
    });

     it('should return 400 for invalid electionId format', async () => {
       const queryParams = { electionId: 'invalid-uuid' };
       const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(400);
        expect(response.body.errors[0].msg).to.contain('Election ID must be a valid UUID');
    });

    it('should return 403 if user is not eligible or permitted for offline voting in this election', async () => {
       const queryParams = testData.mobileRoutes['/api/v1/mobile/vote/offline-package'].get.queryParams.forbidden;
       const error = { status: 403, message: 'Offline voting not enabled or permitted for this election/user.' };
       const getPackageStub = sandbox.stub(mobileVoteService, 'generateOfflinePackage').rejects(error);

       const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(403);
        expect(response.body).to.deep.equal({ success: false, message: error.message });
       expect(getPackageStub.calledOnce).to.be.true;
    });

     it('should return 404 if election not found', async () => {
       const queryParams = testData.mobileRoutes['/api/v1/mobile/vote/offline-package'].get.queryParams.notFound;
       const error = { status: 404, message: 'Election not found.' };
       const getPackageStub = sandbox.stub(mobileVoteService, 'generateOfflinePackage').rejects(error);

        const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(404);
        expect(response.body).to.deep.equal({ success: false, message: error.message });
       expect(getPackageStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
        const queryParams = testData.mobileRoutes['/api/v1/mobile/vote/offline-package'].get.queryParams.success;
        const response = await request(app).get('/api/v1/mobile/vote/offline-package').query(queryParams);
        expect(response.status).to.equal(401);
    });

     it('should return 500 for unexpected errors', async () => {
        const queryParams = testData.mobileRoutes['/api/v1/mobile/vote/offline-package'].get.queryParams.success;
        const error = new Error("Package generation error");
        const getPackageStub = sandbox.stub(mobileVoteService, 'generateOfflinePackage').rejects(error);

        const response = await request(app)
            .get('/api/v1/mobile/vote/offline-package')
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(getPackageStub.calledOnce).to.be.true;
     });
  });

  describe('POST /vote/submit-offline/:electionId (Authenticated)', () => {
      it('should submit offline votes successfully', async () => {
          const electionId = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.pathParams.electionId;
          const submissionData = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.requestBody.success;
          const expectedResult = { votesProcessed: submissionData.encryptedVotes.length, votesFailed: 0 };
          const submitStub = sandbox.stub(mobileVoteService, 'processOfflineVotes').resolves(expectedResult);

          const response = await request(app)
              .post(`/api/v1/mobile/vote/submit-offline/${electionId}`)
              .set('Authorization', `Bearer ${authToken}`)
              .send(submissionData);

          expect(response.status).to.equal(200); // Or 202 Accepted if processing is async
          expect(response.body).to.deep.equal({
              success: true,
              message: `Offline votes submitted for processing. Processed: ${expectedResult.votesProcessed}, Failed: ${expectedResult.votesFailed}`,
              data: expectedResult
          });
          // Service called with userId, electionId, votes, and signature
          expect(submitStub.calledOnceWith(userIdFromToken, electionId, submissionData.encryptedVotes, submissionData.signature)).to.be.true;
      });

       it('should return 400 for invalid election ID format', async () => {
          const invalidId = 'not-a-uuid';
           const submissionData = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.requestBody.success;
           const response = await request(app)
              .post(`/api/v1/mobile/vote/submit-offline/${invalidId}`)
              .set('Authorization', `Bearer ${authToken}`)
              .send(submissionData);
          expect(response.status).to.equal(400);
       });

       it('should return 400 for missing encryptedVotes or signature', async () => {
           const electionId = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.pathParams.electionId;
           const invalidData = { ...testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.requestBody.success, encryptedVotes: undefined };
            const response = await request(app)
              .post(`/api/v1/mobile/vote/submit-offline/${electionId}`)
              .set('Authorization', `Bearer ${authToken}`)
              .send(invalidData);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Encrypted votes is required');
       });

       it('should return 400 for invalid signature or tampered data', async () => {
            const electionId = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.pathParams.electionId;
            const submissionData = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.requestBody.invalidSignature;
            const error = { status: 400, message: 'Invalid signature or data mismatch.' };
            const submitStub = sandbox.stub(mobileVoteService, 'processOfflineVotes').rejects(error);

             const response = await request(app)
              .post(`/api/v1/mobile/vote/submit-offline/${electionId}`)
              .set('Authorization', `Bearer ${authToken}`)
              .send(submissionData);

            expect(response.status).to.equal(400);
            expect(response.body).to.deep.equal({ success: false, message: error.message });
            expect(submitStub.calledOnce).to.be.true;
       });

       it('should return 401 if not authenticated', async () => {
            const electionId = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.pathParams.electionId;
            const submissionData = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.requestBody.success;
            const response = await request(app).post(`/api/v1/mobile/vote/submit-offline/${electionId}`).send(submissionData);
            expect(response.status).to.equal(401);
       });

       it('should return 500 for unexpected errors during submission', async () => {
           const electionId = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.pathParams.electionId;
           const submissionData = testData.mobileRoutes['/api/v1/mobile/vote/submit-offline/{electionId}'].post.requestBody.success;
           const error = new Error("Vote processing queue error");
            const submitStub = sandbox.stub(mobileVoteService, 'processOfflineVotes').rejects(error);

            const response = await request(app)
              .post(`/api/v1/mobile/vote/submit-offline/${electionId}`)
              .set('Authorization', `Bearer ${authToken}`)
              .send(submissionData);

            expect(response.status).to.equal(500);
            expect(submitStub.calledOnce).to.be.true;
       });
  });

  // --- Polling Units ---
  describe('GET /polling-units/nearby (Authenticated)', () => {
    it('should find nearby polling units successfully', async () => {
      const queryParams = testData.mobileRoutes['/api/v1/mobile/polling-units/nearby'].get.queryParams.success; // { latitude, longitude, radius? }
      const expectedPollingUnits = testData.mobileRoutes['/api/v1/mobile/polling-units/nearby'].get.successResponse.data; // Array of polling unit objects
      // Assuming pollingUnitService handles geolocation search
      const findNearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').resolves(expectedPollingUnits);

      const response = await request(app)
        .get('/api/v1/mobile/polling-units/nearby')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Nearby polling units retrieved successfully.',
        data: expectedPollingUnits,
      });
      // Check service called with lat, lon, and potentially radius
      expect(findNearbyStub.calledOnceWith(queryParams.latitude, queryParams.longitude, queryParams.radius || sinon.match.number)).to.be.true; // Default radius might be used
    });

    it('should return 400 for missing latitude or longitude', async () => {
       const invalidParams = { longitude: testData.mobileRoutes['/api/v1/mobile/polling-units/nearby'].get.queryParams.success.longitude };
       const response = await request(app)
        .get('/api/v1/mobile/polling-units/nearby')
        .query(invalidParams)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(400);
       expect(response.body.errors[0].msg).to.contain('Latitude is required');
    });

     it('should return 400 for invalid coordinate format', async () => {
        const invalidParams = { latitude: 'not-a-number', longitude: '10.123' };
       const response = await request(app)
        .get('/api/v1/mobile/polling-units/nearby')
        .query(invalidParams)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(400);
        expect(response.body.errors[0].msg).to.contain('Latitude must be a valid number');
     });

     it('should return an empty array if no polling units found nearby', async () => {
         const queryParams = testData.mobileRoutes['/api/v1/mobile/polling-units/nearby'].get.queryParams.notFound;
         const expectedPollingUnits = [];
          const findNearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').resolves(expectedPollingUnits);

         const response = await request(app)
            .get('/api/v1/mobile/polling-units/nearby')
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

         expect(response.status).to.equal(200);
          expect(response.body.data).to.be.an('array').that.is.empty;
         expect(findNearbyStub.calledOnce).to.be.true;
     });

    it('should return 401 if not authenticated', async () => {
        const queryParams = testData.mobileRoutes['/api/v1/mobile/polling-units/nearby'].get.queryParams.success;
        const response = await request(app).get('/api/v1/mobile/polling-units/nearby').query(queryParams);
        expect(response.status).to.equal(401);
    });

     it('should return 500 for unexpected errors during search', async () => {
        const queryParams = testData.mobileRoutes['/api/v1/mobile/polling-units/nearby'].get.queryParams.success;
        const error = new Error("Geolocation service error");
        const findNearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').rejects(error);

        const response = await request(app)
            .get('/api/v1/mobile/polling-units/nearby')
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(findNearbyStub.calledOnce).to.be.true;
     });
  });

  // --- Mobile Sync ---
  describe('GET /sync/check', () => { /* ... tests ... */ });

  describe('POST /sync/data (Authenticated)', () => {
    it('should return sync data successfully', async () => {
      const requestBody = testData.mobileRoutes['/api/v1/mobile/sync/data'].post.requestBody.success; // { lastSyncTimestamp }
      const expectedSyncData = testData.mobileRoutes['/api/v1/mobile/sync/data'].post.successResponse.data; // { elections: [...], candidates: [...], etc. }
      // Stub the service method
      const getSyncDataStub = sandbox.stub(mobileSyncService, 'getSyncData').resolves(expectedSyncData);

      const response = await request(app)
        .post('/api/v1/mobile/sync/data')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Sync data retrieved successfully.',
        data: expectedSyncData,
      });
      // Verify service called with user ID and timestamp
      expect(getSyncDataStub.calledOnceWith(userIdFromToken, requestBody.lastSyncTimestamp)).to.be.true;
    });

    it('should return 400 for missing lastSyncTimestamp', async () => {
       const requestBody = {}; // Empty body
       const response = await request(app)
        .post('/api/v1/mobile/sync/data')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(400);
       expect(response.body.errors[0].msg).to.contain('Last sync timestamp is required');
    });

     it('should return 400 for invalid timestamp format', async () => {
       const requestBody = { lastSyncTimestamp: 'not-a-valid-date' };
       const response = await request(app)
        .post('/api/v1/mobile/sync/data')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(400);
       expect(response.body.errors[0].msg).to.match(/must be a valid timestamp/i); // Or specific validator message
    });

     it('should return 401 if not authenticated', async () => {
       const requestBody = testData.mobileRoutes['/api/v1/mobile/sync/data'].post.requestBody.success;
       const response = await request(app)
        .post('/api/v1/mobile/sync/data')
        .send(requestBody);
       // No Authorization header
       expect(response.status).to.equal(401);
    });

     it('should return 500 for unexpected errors during data retrieval', async () => {
        const requestBody = testData.mobileRoutes['/api/v1/mobile/sync/data'].post.requestBody.success;
        const error = new Error("Sync data retrieval failed");
        const getSyncDataStub = sandbox.stub(mobileSyncService, 'getSyncData').rejects(error);

        const response = await request(app)
            .post('/api/v1/mobile/sync/data')
            .send(requestBody)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(getSyncDataStub.calledOnce).to.be.true;
     });
  });

}); 