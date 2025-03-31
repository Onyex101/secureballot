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
    it('should login successfully via mobile and return token', async () => {
      const loginData = {
        nin: '33344455566',
        vin: 'VIN3334445556677788',
        password: 'MobilePass1!',
        deviceInfo: { deviceId: 'mobile-device-abc', model: 'Test S24' },
      };
      const serviceResult = {
        token: 'mock-mobile-auth-token',
        user: { id: userIdFromToken, nin: loginData.nin, role: 'voter' },
        deviceVerified: true, // Example: Device already known
      };
      // IMPORTANT: Ensure 'handleMobileLogin' is correct
      const loginStub = sandbox
        .stub(mobileAuthService, 'handleMobileLogin')
        .resolves(serviceResult);

      const response = await request(app).post('/api/v1/mobile/auth/login').send(loginData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Mobile login successful.');
      expect(response.body.data).to.exist;
      expect(response.body.data.token).to.equal(serviceResult.token);
      expect(response.body.data.user?.id).to.equal(userIdFromToken);
      expect(response.body.data.deviceVerified).to.equal(serviceResult.deviceVerified);

      expect(
        loginStub.calledOnceWith(
          loginData.nin,
          loginData.vin,
          loginData.password,
          loginData.deviceInfo,
        ),
      ).to.be.true;
    });

    it('should return 400 for missing required fields (e.g., vin)', async () => {
      const invalidData = { nin: '33344455566', password: 'Pass!"' /* ... missing vin */ };
      const response = await request(app).post('/api/v1/mobile/auth/login').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('VIN is required'))).to.be.true;
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        nin: '33344455566',
        vin: 'VIN3334445556677788',
        password: 'wrongPass',
        deviceInfo: {},
      };
      const authError = new Error('Invalid credentials provided.');
      authError.status = 401;
      // IMPORTANT: Ensure 'handleMobileLogin' is correct
      const loginStub = sandbox.stub(mobileAuthService, 'handleMobileLogin').rejects(authError);

      const response = await request(app).post('/api/v1/mobile/auth/login').send(loginData);

      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(authError.message);
      expect(loginStub.calledOnce).to.be.true;
    });

    it('should return 403 and requiresVerification flag if device verification is needed', async () => {
      const loginData = {
        nin: '33344455566',
        vin: 'VIN3334445556677788',
        password: 'MobilePass1!',
        deviceInfo: { deviceId: 'new-device' },
      };
      const verificationError = new Error('Device verification required.');
      verificationError.status = 403;
      verificationError.requiresVerification = true; // Custom flag expected by controller
      // IMPORTANT: Ensure 'handleMobileLogin' is correct
      const loginStub = sandbox
        .stub(mobileAuthService, 'handleMobileLogin')
        .rejects(verificationError);

      const response = await request(app).post('/api/v1/mobile/auth/login').send(loginData);

      expect(response.status).to.equal(403);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(verificationError.message);
      expect(response.body.requiresVerification).to.equal(true);
      expect(loginStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected service errors', async () => {
      const loginData = {
        nin: '33344455566',
        vin: 'VIN3334445556677788',
        password: 'MobilePass1!',
        deviceInfo: {},
      };
      const serverError = new Error('Server error during mobile login');
      // IMPORTANT: Ensure 'handleMobileLogin' is correct
      const loginStub = sandbox.stub(mobileAuthService, 'handleMobileLogin').rejects(serverError);

      const response = await request(app).post('/api/v1/mobile/auth/login').send(loginData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(loginStub.calledOnce).to.be.true;
    });
  });

  describe('POST /auth/verify-device (Authenticated)', () => {
    it('should verify device successfully with correct code', async () => {
      const verifyData = { deviceId: 'mobile-device-abc', verificationCode: '123456' };
      // Service might return nothing or a success message
      const serviceResult = { message: 'Device verified and linked successfully.' };
      // IMPORTANT: Ensure 'verifyAndLinkDevice' is correct
      const verifyStub = sandbox
        .stub(mobileAuthService, 'verifyAndLinkDevice')
        .resolves(serviceResult);

      const response = await request(app)
        .post('/api/v1/mobile/auth/verify-device')
        .set('Authorization', `Bearer ${authToken}`) // Requires existing token
        .send(verifyData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      // Check for specific data if returned, e.g., updated token or user profile
      // expect(response.body.data).to.exist;

      // Service called with userId from token, deviceId, and code
      expect(
        verifyStub.calledOnceWith(
          userIdFromToken,
          verifyData.deviceId,
          verifyData.verificationCode,
        ),
      ).to.be.true;
    });

    it('should return 400 for missing fields (e.g., verificationCode)', async () => {
      const invalidData = { deviceId: 'mobile-device-abc' }; // Missing verificationCode
      const response = await request(app)
        .post('/api/v1/mobile/auth/verify-device')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Verification code is required'))).to.be
        .true;
    });

    it('should return 400 for invalid verification code', async () => {
      const verifyData = { deviceId: 'mobile-device-abc', verificationCode: 'wrong-code' };
      const inputError = new Error('Invalid or expired verification code.');
      inputError.status = 400;
      // IMPORTANT: Ensure 'verifyAndLinkDevice' is correct
      const verifyStub = sandbox.stub(mobileAuthService, 'verifyAndLinkDevice').rejects(inputError);

      const response = await request(app)
        .post('/api/v1/mobile/auth/verify-device')
        .set('Authorization', `Bearer ${authToken}`)
        .send(verifyData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(inputError.message);
      expect(verifyStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const verifyData = { deviceId: 'mobile-device-abc', verificationCode: '123456' };
      const response = await request(app)
        .post('/api/v1/mobile/auth/verify-device')
        .send(verifyData);
      expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected service errors', async () => {
      const verifyData = { deviceId: 'mobile-device-abc', verificationCode: '123456' };
      const serverError = new Error('Device verification DB error');
      // IMPORTANT: Ensure 'verifyAndLinkDevice' is correct
      const verifyStub = sandbox
        .stub(mobileAuthService, 'verifyAndLinkDevice')
        .rejects(serverError);

      const response = await request(app)
        .post('/api/v1/mobile/auth/verify-device')
        .set('Authorization', `Bearer ${authToken}`)
        .send(verifyData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(verifyStub.calledOnce).to.be.true;
    });
  });

  // --- Mobile Offline Voting ---
  describe('GET /vote/offline-package (Authenticated)', () => {
    it('should download the offline voting package successfully', async () => {
      const electionId = 'elec-mobile-999';
      const queryParams = { electionId: electionId };
      const serviceResult = {
        electionData: { id: electionId, name: 'Mobile Election' },
        candidates: [{ id: 'c1' }, { id: 'c2' }],
      };
      // IMPORTANT: Ensure 'generateOfflinePackage' is correct
      const getPackageStub = sandbox
        .stub(mobileVoteService, 'generateOfflinePackage')
        .resolves(serviceResult);

      const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // If response is JSON:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Offline voting package generated successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.electionData?.id).to.equal(electionId);
      expect(response.body.data.candidates).to.be.an('array');
      // If response is binary data:
      // expect(response.headers['content-type']).to.include('application/octet-stream');
      // expect(response.body).to.be.instanceof(Buffer);

      expect(getPackageStub.calledOnceWith(userIdFromToken, queryParams.electionId)).to.be.true;
    });

    it('should return 400 for missing electionId query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .set('Authorization', `Bearer ${authToken}`); // Missing query param

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Election ID is required'))).to.be.true;
    });

    it('should return 400 for invalid electionId format', async () => {
      const queryParams = { electionId: 'invalid-uuid' };
      const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.errors.some(e => e.msg.includes('Invalid Election ID format'))).to.be
        .true;
    });

    it('should return 403 if user is not eligible for offline voting', async () => {
      const electionId = 'elec-mobile-999';
      const queryParams = { electionId: electionId };
      const permissionError = new Error(
        'Offline voting not enabled or permitted for this election/user.',
      );
      permissionError.status = 403;
      // IMPORTANT: Ensure 'generateOfflinePackage' is correct
      const getPackageStub = sandbox
        .stub(mobileVoteService, 'generateOfflinePackage')
        .rejects(permissionError);

      const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(403);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(permissionError.message);
      expect(getPackageStub.calledOnce).to.be.true;
    });

    it('should return 404 if election not found by the service', async () => {
      const electionId = 'not-found-elec';
      const queryParams = { electionId: electionId };
      const notFoundError = new Error('Election not found.');
      notFoundError.status = 404;
      // IMPORTANT: Ensure 'generateOfflinePackage' is correct
      const getPackageStub = sandbox
        .stub(mobileVoteService, 'generateOfflinePackage')
        .rejects(notFoundError);

      const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(notFoundError.message);
      expect(getPackageStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const queryParams = { electionId: 'elec-mobile-999' };
      const response = await request(app)
        .get('/api/v1/mobile/vote/offline-package')
        .query(queryParams);
      expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors', async () => {
      const queryParams = { electionId: 'elec-mobile-999' };
      const error = new Error('Package generation error');
      const getPackageStub = sandbox
        .stub(mobileVoteService, 'generateOfflinePackage')
        .rejects(error);

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
      const electionId = 'elec-mobile-999';
      const submissionData = { encryptedVotes: [1, 2, 3], signature: 'signature123' };
      const expectedResult = {
        votesProcessed: submissionData.encryptedVotes.length,
        votesFailed: 0,
      };
      const submitStub = sandbox
        .stub(mobileVoteService, 'processOfflineVotes')
        .resolves(expectedResult);

      const response = await request(app)
        .post(`/api/v1/mobile/vote/submit-offline/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(submissionData);

      expect(response.status).to.equal(200); // Or 202 Accepted if processing is async
      expect(response.body).to.deep.equal({
        success: true,
        message: `Offline votes submitted for processing. Processed: ${expectedResult.votesProcessed}, Failed: ${expectedResult.votesFailed}`,
        data: expectedResult,
      });
      // Service called with userId, electionId, votes, and signature
      expect(
        submitStub.calledOnceWith(
          userIdFromToken,
          electionId,
          submissionData.encryptedVotes,
          submissionData.signature,
        ),
      ).to.be.true;
    });

    it('should return 400 for invalid election ID format', async () => {
      const invalidId = 'not-a-uuid';
      const submissionData = { encryptedVotes: [1, 2, 3], signature: 'signature123' };
      const response = await request(app)
        .post(`/api/v1/mobile/vote/submit-offline/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(submissionData);
      expect(response.status).to.equal(400);
    });

    it('should return 400 for missing encryptedVotes or signature', async () => {
      const electionId = 'elec-mobile-999';
      const invalidData = { encryptedVotes: undefined, signature: 'signature123' };
      const response = await request(app)
        .post(`/api/v1/mobile/vote/submit-offline/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.errors[0].msg).to.contain('Encrypted votes is required');
    });

    it('should return 400 for invalid signature or tampered data', async () => {
      const electionId = 'elec-mobile-999';
      const submissionData = { encryptedVotes: [1, 2, 3], signature: 'wrong-signature' };
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
      const electionId = 'elec-mobile-999';
      const submissionData = { encryptedVotes: [1, 2, 3], signature: 'signature123' };
      const response = await request(app)
        .post(`/api/v1/mobile/vote/submit-offline/${electionId}`)
        .send(submissionData);
      expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors during submission', async () => {
      const electionId = 'elec-mobile-999';
      const submissionData = { encryptedVotes: [1, 2, 3], signature: 'signature123' };
      const error = new Error('Vote processing queue error');
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
      const queryParams = { latitude: 6.5244, longitude: 3.3792 }; // Inline query, e.g., Lagos
      // Inline mock response data
      const expectedPollingUnits = [
          { id: 'pu-near-1', pollingUnitCode: 'NEAR001', name: 'Nearby PU 1', distance: 1.5 },
          { id: 'pu-near-2', pollingUnitCode: 'NEAR002', name: 'Nearby PU 2', distance: 4.8 }
      ];
      // Assuming pollingUnitService handles geolocation search
      // IMPORTANT: Ensure 'findNearbyPollingUnits' is correct function name
      // Service might return a simple array or an object with { units: [], total: X }
      const findNearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').resolves(expectedPollingUnits); // Resolving with array

      const response = await request(app)
        .get('/api/v1/mobile/polling-units/nearby') // Adjusted path based on context
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Nearby polling units retrieved successfully.');
      expect(response.body.data).to.be.an('array').with.lengthOf(expectedPollingUnits.length);
      expect(response.body.data[0].id).to.equal(expectedPollingUnits[0].id);
      expect(response.body.data[0].distance).to.equal(expectedPollingUnits[0].distance);
      // Avoid deep.equal on the array
      
      // Check service called with lat, lon, and potentially radius/limit defaults
      expect(findNearbyStub.calledOnceWith(queryParams.latitude, queryParams.longitude, sinon.match.number, sinon.match.number)).to.be.true; // Allow default radius/limit
    });

    it('should return 400 for missing latitude or longitude', async () => {
       const invalidParams = { longitude: 3.3792 }; // Missing latitude
       const response = await request(app)
        .get('/api/v1/mobile/polling-units/nearby')
        .query(invalidParams)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(400);
       // Check validation errors
       expect(response.body.success).to.be.false;
       expect(response.body.message).to.equal('Validation Error');
       expect(response.body.errors.some(e => e.msg.includes('Latitude is required'))).to.be.true;
    });

     it('should return 400 for invalid coordinate format', async () => {
        const invalidParams = { latitude: 'not-a-latitude', longitude: '10.123' }; // Invalid latitude
       const response = await request(app)
        .get('/api/v1/mobile/polling-units/nearby')
        .query(invalidParams)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(400);
       // Check validation errors
       expect(response.body.success).to.be.false;
       expect(response.body.message).to.equal('Validation Error');
       expect(response.body.errors.some(e => e.msg.includes('Latitude must be a valid number'))).to.be.true;
     });

     it('should return an empty array if no polling units found nearby', async () => {
         const queryParams = { latitude: 0, longitude: 0 }; // Coordinates with no results
         const expectedPollingUnits = []; // Empty array response
          const findNearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').resolves(expectedPollingUnits);

         const response = await request(app)
            .get('/api/v1/mobile/polling-units/nearby')
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

         expect(response.status).to.equal(200);
         // REFINED assertions:
          expect(response.body.success).to.be.true;
          expect(response.body.data).to.be.an('array').that.is.empty;
         expect(findNearbyStub.calledOnce).to.be.true;
     });

    it('should return 401 if not authenticated', async () => {
        const queryParams = { latitude: 6.5244, longitude: 3.3792 };
        const response = await request(app).get('/api/v1/mobile/polling-units/nearby').query(queryParams);
        expect(response.status).to.equal(401);
        expect(response.body.message).to.contain('No authorization token');
    });

     it('should return 500 for unexpected errors during search', async () => {
        const queryParams = { latitude: 6.5244, longitude: 3.3792 };
        const error = new Error("Geolocation service DB error");
        const findNearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').rejects(error);

        const response = await request(app)
            .get('/api/v1/mobile/polling-units/nearby')
            .query(queryParams)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        // REFINED assertions:
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(findNearbyStub.calledOnce).to.be.true;
     });
  });

  // --- Mobile Sync ---
  // Assuming GET /sync/check might exist - Add tests if needed
  // describe('GET /sync/check', () => { /* ... tests ... */ }); 

  describe('POST /sync/data (Authenticated)', () => {
    it('should return sync data successfully', async () => {
      const lastSyncTime = new Date(Date.now() - 86400000).toISOString(); // e.g., 1 day ago
      const requestBody = { lastSyncTimestamp: lastSyncTime }; // Inline request data
      // Inline mock sync data response
      const expectedSyncData = { 
          updatedElections: [{ id: 'e-1', name: 'Updated Election' }],
          newCandidates: [{ id: 'c-new', name: 'New Candidate' }],
          deletedPollingUnits: ['pu-deleted-1'],
          currentTimestamp: new Date().toISOString()
          // ... other relevant sync data categories
      }; 
      // IMPORTANT: Ensure 'getSyncData' is correct function name
      const getSyncDataStub = sandbox.stub(mobileSyncService, 'getSyncData').resolves(expectedSyncData);

      const response = await request(app)
        .post('/api/v1/mobile/sync/data')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Sync data retrieved successfully.');
      expect(response.body.data).to.exist;
      // Check specific properties within the sync data
      expect(response.body.data.updatedElections).to.be.an('array').with.lengthOf(expectedSyncData.updatedElections.length);
      expect(response.body.data.newCandidates).to.be.an('array').with.lengthOf(expectedSyncData.newCandidates.length);
      expect(response.body.data.deletedPollingUnits).to.deep.equal(expectedSyncData.deletedPollingUnits); // deep.equal ok for simple array
      expect(response.body.data.currentTimestamp).to.be.a('string');
      // Avoid deep.equal on the entire data object

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
       // Check validation errors
       expect(response.body.success).to.be.false;
       expect(response.body.message).to.equal('Validation Error');
       expect(response.body.errors.some(e => e.msg.includes('Last sync timestamp is required'))).to.be.true;
    });

     it('should return 400 for invalid timestamp format', async () => {
       const requestBody = { lastSyncTimestamp: 'yesterday at noon' }; // Invalid format
       const response = await request(app)
        .post('/api/v1/mobile/sync/data')
        .send(requestBody)
        .set('Authorization', `Bearer ${authToken}`);

       expect(response.status).to.equal(400);
       // Check validation errors
       expect(response.body.success).to.be.false;
       expect(response.body.message).to.equal('Validation Error');
       expect(response.body.errors.some(e => e.msg.match(/must be a valid timestamp|ISO8601 date/i))).to.be.true; // Or specific validator message
    });

     it('should return 401 if not authenticated', async () => {
       const requestBody = { lastSyncTimestamp: new Date().toISOString() };
       const response = await request(app)
        .post('/api/v1/mobile/sync/data')
        .send(requestBody);
       // No Authorization header
       expect(response.status).to.equal(401);
       expect(response.body.message).to.contain('No authorization token');
    });

     it('should return 500 for unexpected errors during data retrieval', async () => {
        const requestBody = { lastSyncTimestamp: new Date().toISOString() };
        const error = new Error("Sync data retrieval database error");
        const getSyncDataStub = sandbox.stub(mobileSyncService, 'getSyncData').rejects(error);

        const response = await request(app)
            .post('/api/v1/mobile/sync/data')
            .send(requestBody)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        // REFINED assertions:
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(getSyncDataStub.calledOnce).to.be.true;
     });
  });

}); // End main describe block for Mobile Routes
