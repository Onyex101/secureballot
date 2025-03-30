// tests/integration/ussdRoutes.test.js
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
// No JWT needed usually for USSD if it uses session/external validation
const app = require('../../src/app');
// Adjust imports based on actual USSD controllers/services/logic
const ussdController = require('../../src/controllers/ussdController'); // Example placeholder
const ussdService = require('../../src/services/ussdService'); // Example placeholder
const testData = require('../api-test-data.json');

// --- Service Imports ---
// Assuming services handle the core logic for USSD session and voting
const ussdSessionService = require('../../src/services/ussdSessionService');
const ussdVoteService = require('../../src/services/ussdVoteService');

describe('USSD Routes Integration Tests - /api/v1/ussd', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // USSD often doesn't use JWT, handle session/state management stubs if needed
  });

  afterEach(() => {
    sandbox.restore();
  });

  // --- Start USSD Session ---
  describe('POST /start', () => {
    it('should start a USSD session successfully', async () => {
      const startData = testData.ussdRoutes['/api/v1/ussd/start'].post.requestBody.success;
      const expectedResult = { message: 'USSD session initiated. Check SMS for session code.' }; // Example response
      const startSessionStub = sandbox.stub(ussdSessionService, 'initiateUssdSession').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/ussd/start')
        .send(startData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: expectedResult.message,
        // data might be null or contain session info if needed
      });
      expect(startSessionStub.calledOnceWith(startData.nin, startData.vin, startData.phoneNumber)).to.be.true;
    });

    it('should return 400 for missing required fields (e.g., NIN)', async () => {
       const invalidData = { ...testData.ussdRoutes['/api/v1/ussd/start'].post.requestBody.success, nin: undefined };
       const response = await request(app)
        .post('/api/v1/ussd/start')
        .send(invalidData);

       expect(response.status).to.equal(400);
       expect(response.body.errors[0].msg).to.contain('NIN is required');
    });

     it('should return 400 for invalid field format (e.g., invalid VIN length)', async () => {
       const invalidData = { ...testData.ussdRoutes['/api/v1/ussd/start'].post.requestBody.success, vin: '123' };
       const response = await request(app)
        .post('/api/v1/ussd/start')
        .send(invalidData);

       expect(response.status).to.equal(400);
        expect(response.body.errors[0].msg).to.contain('VIN must be 19 characters');
    });

     it('should return 401 if authentication fails (invalid NIN/VIN)', async () => {
      const startData = testData.ussdRoutes['/api/v1/ussd/start'].post.requestBody.authFailure;
       const error = { status: 401, message: 'Authentication failed: Invalid NIN or VIN.' };
       const startSessionStub = sandbox.stub(ussdSessionService, 'initiateUssdSession').rejects(error);

       const response = await request(app)
        .post('/api/v1/ussd/start')
        .send(startData);

       expect(response.status).to.equal(401);
        expect(response.body).to.deep.equal({ success: false, message: error.message });
       expect(startSessionStub.calledOnce).to.be.true;
    });

    // Assuming ussdLimiter middleware is tested elsewhere or service handles rate limiting logic
     it('should return 429 if rate limited', async () => {
        const startData = testData.ussdRoutes['/api/v1/ussd/start'].post.requestBody.rateLimited;
        const error = { status: 429, message: 'Too many session start attempts. Please try again later.' };
        const startSessionStub = sandbox.stub(ussdSessionService, 'initiateUssdSession').rejects(error);

         const response = await request(app)
            .post('/api/v1/ussd/start')
            .send(startData);

         expect(response.status).to.equal(429);
         expect(response.body).to.deep.equal({ success: false, message: error.message });
         expect(startSessionStub.calledOnce).to.be.true;
     });

     it('should return 500 for unexpected errors', async () => {
        const startData = testData.ussdRoutes['/api/v1/ussd/start'].post.requestBody.success;
        const error = new Error("SMS service failure");
        const startSessionStub = sandbox.stub(ussdSessionService, 'initiateUssdSession').rejects(error);

        const response = await request(app)
            .post('/api/v1/ussd/start')
            .send(startData);

        expect(response.status).to.equal(500);
        expect(startSessionStub.calledOnce).to.be.true;
     });
  });

  // --- Cast Vote via USSD ---
  describe('POST /vote', () => {
      it('should cast a vote via USSD successfully', async () => {
          const voteData = testData.ussdRoutes['/api/v1/ussd/vote'].post.requestBody.success;
          const expectedResult = { voteId: 'ussd-vote-uuid', message: 'Vote cast successfully via USSD.' };
          const castVoteStub = sandbox.stub(ussdVoteService, 'castVoteViaUssd').resolves(expectedResult);

          const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

          expect(response.status).to.equal(200); // Or 201 if you prefer for creation
          expect(response.body).to.deep.equal({
              success: true,
              message: expectedResult.message,
              data: { voteId: expectedResult.voteId, receiptCode: sinon.match.string } // Include receipt if returned
          });
          expect(castVoteStub.calledOnceWith(voteData.sessionCode, voteData.electionId, voteData.candidateId)).to.be.true;
      });

       it('should return 400 for missing required fields (e.g., sessionCode)', async () => {
           const invalidData = { ...testData.ussdRoutes['/api/v1/ussd/vote'].post.requestBody.success, sessionCode: undefined };
           const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(invalidData);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Session code is required');
       });

      it('should return 401 for invalid or expired session code', async () => {
           const voteData = testData.ussdRoutes['/api/v1/ussd/vote'].post.requestBody.invalidSession;
           const error = { status: 401, message: 'Invalid or expired USSD session.' };
           const castVoteStub = sandbox.stub(ussdVoteService, 'castVoteViaUssd').rejects(error);

            const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

           expect(response.status).to.equal(401);
            expect(response.body).to.deep.equal({ success: false, message: error.message });
           expect(castVoteStub.calledOnce).to.be.true;
      });

      it('should return 403 if voter already voted in this election (via this session or otherwise)', async () => {
            const voteData = testData.ussdRoutes['/api/v1/ussd/vote'].post.requestBody.alreadyVoted;
            const error = { status: 403, message: 'You have already voted in this election.' };
            const castVoteStub = sandbox.stub(ussdVoteService, 'castVoteViaUssd').rejects(error);

            const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

           expect(response.status).to.equal(403);
            expect(response.body).to.deep.equal({ success: false, message: error.message });
           expect(castVoteStub.calledOnce).to.be.true;
      });

        it('should return 404 if election or candidate not found', async () => {
            const voteData = testData.ussdRoutes['/api/v1/ussd/vote'].post.requestBody.notFound;
            const error = { status: 404, message: 'Election or Candidate not found.' };
            const castVoteStub = sandbox.stub(ussdVoteService, 'castVoteViaUssd').rejects(error);

             const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

           expect(response.status).to.equal(404);
            expect(response.body).to.deep.equal({ success: false, message: error.message });
           expect(castVoteStub.calledOnce).to.be.true;
       });

       it('should return 500 for unexpected errors during voting', async () => {
           const voteData = testData.ussdRoutes['/api/v1/ussd/vote'].post.requestBody.success;
           const error = new Error("Vote recording failed");
            const castVoteStub = sandbox.stub(ussdVoteService, 'castVoteViaUssd').rejects(error);

             const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

           expect(response.status).to.equal(500);
           expect(castVoteStub.calledOnce).to.be.true;
       });
  });

  // --- Check USSD Session Status ---
  describe('GET /session-status', () => {
      it('should get the status of a USSD session successfully', async () => {
          const queryParams = testData.ussdRoutes['/api/v1/ussd/session-status'].get.queryParams.success;
          const expectedStatus = testData.ussdRoutes['/api/v1/ussd/session-status'].get.successResponse.data; // e.g., { status: 'active', expiresAt: ... }
          const getStatusStub = sandbox.stub(ussdSessionService, 'getUssdSessionStatus').resolves(expectedStatus);

          const response = await request(app)
              .get('/api/v1/ussd/session-status')
              .query(queryParams);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: 'Session status retrieved successfully.',
              data: expectedStatus
          });
          expect(getStatusStub.calledOnceWith(queryParams.sessionCode)).to.be.true;
      });

      it('should return 400 for missing sessionCode query parameter', async () => {
           const response = await request(app)
              .get('/api/v1/ussd/session-status')
              // No query params
              .send(); // GET doesn't typically have a body, but validator might check query

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Session code is required');
      });

      it('should return 400 for invalid sessionCode format', async () => {
           const queryParams = { sessionCode: '123' }; // Too short
            const response = await request(app)
              .get('/api/v1/ussd/session-status')
              .query(queryParams);

          expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Session code must be 6-10 characters');
      });

      it('should return 404 if session code not found or expired', async () => {
            const queryParams = testData.ussdRoutes['/api/v1/ussd/session-status'].get.queryParams.notFound;
            const error = { status: 404, message: 'USSD session not found or expired.' };
            const getStatusStub = sandbox.stub(ussdSessionService, 'getUssdSessionStatus').rejects(error); // Or resolves(null)

            const response = await request(app)
                .get('/api/v1/ussd/session-status')
                .query(queryParams);

            expect(response.status).to.equal(404);
            expect(response.body).to.deep.equal({ success: false, message: error.message });
            expect(getStatusStub.calledOnce).to.be.true;
      });

       it('should return 500 for unexpected errors', async () => {
           const queryParams = testData.ussdRoutes['/api/v1/ussd/session-status'].get.queryParams.success;
           const error = new Error("Redis error");
           const getStatusStub = sandbox.stub(ussdSessionService, 'getUssdSessionStatus').rejects(error);

            const response = await request(app)
                .get('/api/v1/ussd/session-status')
                .query(queryParams);

            expect(response.status).to.equal(500);
            expect(getStatusStub.calledOnce).to.be.true;
       });
  });

  // --- Verify USSD Vote ---
  describe('POST /verify-vote', () => {
      it('should verify a USSD vote successfully', async () => {
          const verifyData = testData.ussdRoutes['/api/v1/ussd/verify-vote'].post.requestBody.success;
          const expectedVerification = testData.ussdRoutes['/api/v1/ussd/verify-vote'].post.successResponse.data; // e.g., { electionTitle: ..., candidateName: ..., timestamp: ... }
          const verifyVoteStub = sandbox.stub(ussdVoteService, 'verifyUssdVoteByReceipt').resolves(expectedVerification);

          const response = await request(app)
              .post('/api/v1/ussd/verify-vote')
              .send(verifyData);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: 'Vote verified successfully.',
              data: expectedVerification
          });
          expect(verifyVoteStub.calledOnceWith(verifyData.receiptCode, verifyData.phoneNumber)).to.be.true;
      });

       it('should return 400 for missing required fields (e.g., receiptCode)', async () => {
          const invalidData = { ...testData.ussdRoutes['/api/v1/ussd/verify-vote'].post.requestBody.success, receiptCode: undefined };
           const response = await request(app)
              .post('/api/v1/ussd/verify-vote')
              .send(invalidData);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Receipt code is required');
      });

       it('should return 400 for invalid receipt code format', async () => {
           const invalidData = { ...testData.ussdRoutes['/api/v1/ussd/verify-vote'].post.requestBody.success, receiptCode: 'short' };
            const response = await request(app)
              .post('/api/v1/ussd/verify-vote')
              .send(invalidData);

          expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Receipt code must be 16 characters');
       });

      it('should return 404 if vote receipt not found or phone number does not match', async () => {
            const verifyData = testData.ussdRoutes['/api/v1/ussd/verify-vote'].post.requestBody.notFound;
            const error = { status: 404, message: 'Vote record not found for the provided details.' };
            const verifyVoteStub = sandbox.stub(ussdVoteService, 'verifyUssdVoteByReceipt').rejects(error); // Or resolves(null)

            const response = await request(app)
                .post('/api/v1/ussd/verify-vote')
                .send(verifyData);

            expect(response.status).to.equal(404);
             expect(response.body).to.deep.equal({ success: false, message: error.message });
            expect(verifyVoteStub.calledOnce).to.be.true;
      });

       it('should return 500 for unexpected errors', async () => {
           const verifyData = testData.ussdRoutes['/api/v1/ussd/verify-vote'].post.requestBody.success;
           const error = new Error("Verification DB error");
           const verifyVoteStub = sandbox.stub(ussdVoteService, 'verifyUssdVoteByReceipt').rejects(error);

             const response = await request(app)
                .post('/api/v1/ussd/verify-vote')
                .send(verifyData);

            expect(response.status).to.equal(500);
            expect(verifyVoteStub.calledOnce).to.be.true;
       });
  });

}); // End main describe block for USSD Routes 