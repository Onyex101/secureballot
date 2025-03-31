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

// Use inline data for clarity
const MOCK_VALID_NIN = '11122233344';
const MOCK_VALID_VIN = 'VIN1112223334455566';
const MOCK_PHONE = '08012345678';
const MOCK_SESSION_CODE = 'USSD-ABC';
const MOCK_ELECTION_ID = 'elec-ussd-1';
const MOCK_CANDIDATE_ID = 'cand-ussd-A';

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
      const startData = { nin: MOCK_VALID_NIN, vin: MOCK_VALID_VIN, phoneNumber: MOCK_PHONE };
      // Service might return sessionCode or just a success message
      const serviceResult = { message: 'USSD session initiated. Check SMS for session code.', sessionCode: MOCK_SESSION_CODE }; 
      // IMPORTANT: Ensure 'startUssdSession' is correct function name in ussdService
      const startSessionStub = sandbox.stub(ussdService, 'startUssdSession').resolves(serviceResult);

      const response = await request(app)
        .post('/api/v1/ussd/start')
        .send(startData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      // Assert data if controller returns it (e.g., the session code)
      // expect(response.body.data).to.exist;
      // expect(response.body.data.sessionCode).to.equal(serviceResult.sessionCode);
      
      // IMPORTANT: Verify arguments based on service signature
      expect(startSessionStub.calledOnceWith(startData)).to.be.true; // Or specific args if unpacked
    });

    it('should return 400 for missing required fields (e.g., NIN)', async () => {
       const invalidData = { vin: MOCK_VALID_VIN, phoneNumber: MOCK_PHONE }; // Missing NIN
       const response = await request(app)
        .post('/api/v1/ussd/start')
        .send(invalidData);

       expect(response.status).to.equal(400);
       expect(response.body.success).to.be.false;
       expect(response.body.message).to.equal('Validation Error');
       expect(response.body.errors).to.be.an('array').that.has.length.greaterThan(0);
       expect(response.body.errors.some(e => e.msg.includes('NIN is required'))).to.be.true;
    });

     it('should return 400 for invalid field format (e.g., invalid VIN length)', async () => {
       const invalidData = { nin: MOCK_VALID_NIN, vin: '123', phoneNumber: MOCK_PHONE };
       const response = await request(app)
        .post('/api/v1/ussd/start')
        .send(invalidData);

       expect(response.status).to.equal(400);
       expect(response.body.success).to.be.false;
       expect(response.body.message).to.equal('Validation Error');
       expect(response.body.errors.some(e => e.msg.includes('VIN must be 19 characters'))).to.be.true; // Adjust msg
    });

     it('should return 401 if authentication fails (invalid NIN/VIN/Phone in service)', async () => {
      const startData = { nin: 'INVALIDNIN', vin: 'INVALIDVIN', phoneNumber: MOCK_PHONE };
       const authError = new Error('Authentication failed: Invalid NIN or VIN.');
       authError.status = 401;
       authError.code = 'USSD_AUTH_FAILED';
       // IMPORTANT: Ensure 'startUssdSession' is correct
       const startSessionStub = sandbox.stub(ussdService, 'startUssdSession').rejects(authError);

       const response = await request(app)
        .post('/api/v1/ussd/start')
        .send(startData);

       expect(response.status).to.equal(401);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal(authError.message);
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

     it('should return 500 for unexpected service errors', async () => {
        const startData = { nin: MOCK_VALID_NIN, vin: MOCK_VALID_VIN, phoneNumber: MOCK_PHONE };
        const serverError = new Error("SMS service failure");
        // IMPORTANT: Ensure 'startUssdSession' is correct
        const startSessionStub = sandbox.stub(ussdService, 'startUssdSession').rejects(serverError);

        const response = await request(app)
            .post('/api/v1/ussd/start')
            .send(startData);

        expect(response.status).to.equal(500);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(startSessionStub.calledOnce).to.be.true;
     });
  });

  // --- Cast Vote via USSD ---
  describe('POST /vote', () => {
      it('should cast a vote via USSD successfully', async () => {
          const voteData = { sessionCode: MOCK_SESSION_CODE, electionId: MOCK_ELECTION_ID, candidateId: MOCK_CANDIDATE_ID };
          // Define minimal service result
          const serviceResult = { confirmationCode: 'CONFIRM-XYZ', message: 'Vote cast successfully via USSD.' }; 
          // IMPORTANT: Ensure 'castVote' is correct function name in ussdService
          const castVoteStub = sandbox.stub(ussdService, 'castVote').resolves(serviceResult);

          const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

          expect(response.status).to.equal(200); // Or 201 if applicable
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.equal(serviceResult.message);
          expect(response.body.data).to.exist;
          expect(response.body.data.confirmationCode).to.equal(serviceResult.confirmationCode);
          
          expect(castVoteStub.calledOnceWith(voteData)).to.be.true; // Or specific args
      });

       it('should return 400 for missing required fields (e.g., sessionCode)', async () => {
           const invalidData = { electionId: MOCK_ELECTION_ID, candidateId: MOCK_CANDIDATE_ID }; // Missing sessionCode
           const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(invalidData);

           expect(response.status).to.equal(400);
           expect(response.body.success).to.be.false;
           expect(response.body.message).to.equal('Validation Error');
           expect(response.body.errors.some(e => e.msg.includes('sessionCode is required'))).to.be.true; // Adjust msg
       });

      it('should return 401 or 404 for invalid or expired session code (depends on service error)', async () => {
           const voteData = { sessionCode: 'INVALID-CODE', electionId: MOCK_ELECTION_ID, candidateId: MOCK_CANDIDATE_ID };
           const sessionError = new Error('Invalid or expired USSD session.');
           sessionError.status = 401; // Or 404
           sessionError.code = 'INVALID_SESSION';
           // IMPORTANT: Ensure 'castVote' is correct
           const castVoteStub = sandbox.stub(ussdService, 'castVote').rejects(sessionError);

            const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

           expect(response.status).to.equal(sessionError.status);
            expect(response.body.success).to.be.false;
            expect(response.body.message).to.equal(sessionError.message);
           expect(castVoteStub.calledOnce).to.be.true;
      });

      it('should return 400 or 409 if voter already voted in this election', async () => {
            const voteData = { sessionCode: MOCK_SESSION_CODE, electionId: MOCK_ELECTION_ID, candidateId: MOCK_CANDIDATE_ID };
            const conflictError = new Error('You have already voted in this election.');
            conflictError.status = 400; // Or 409 Conflict
            conflictError.code = 'VOTER_ALREADY_VOTED';
            // IMPORTANT: Ensure 'castVote' is correct
            const castVoteStub = sandbox.stub(ussdService, 'castVote').rejects(conflictError);

            const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

           expect(response.status).to.equal(conflictError.status);
            expect(response.body.success).to.be.false;
            expect(response.body.message).to.equal(conflictError.message);
           expect(castVoteStub.calledOnce).to.be.true;
      });

        it('should return 404 if election or candidate not found by the service', async () => {
            const voteData = { sessionCode: MOCK_SESSION_CODE, electionId: 'NOT-FOUND-ELEC', candidateId: MOCK_CANDIDATE_ID };
            const notFoundError = new Error('Election or Candidate not found.');
            notFoundError.status = 404;
            notFoundError.code = 'ELECTION_OR_CANDIDATE_NOT_FOUND';
            // IMPORTANT: Ensure 'castVote' is correct
            const castVoteStub = sandbox.stub(ussdService, 'castVote').rejects(notFoundError);

             const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

           expect(response.status).to.equal(404);
            expect(response.body.success).to.be.false;
            expect(response.body.message).to.equal(notFoundError.message);
           expect(castVoteStub.calledOnce).to.be.true;
       });

       it('should return 500 for unexpected errors during voting', async () => {
           const voteData = { sessionCode: MOCK_SESSION_CODE, electionId: MOCK_ELECTION_ID, candidateId: MOCK_CANDIDATE_ID };
           const serverError = new Error("Vote recording failed unexpectedly");
           // IMPORTANT: Ensure 'castVote' is correct
            const castVoteStub = sandbox.stub(ussdService, 'castVote').rejects(serverError);

             const response = await request(app)
              .post('/api/v1/ussd/vote')
              .send(voteData);

           expect(response.status).to.equal(500);
           expect(response.body.success).to.be.false;
           expect(response.body.message).to.equal('Internal Server Error');
           expect(castVoteStub.calledOnce).to.be.true;
       });
  });

  // --- Check USSD Session Status ---
  describe('GET /session-status', () => {
      it('should get the status of a USSD session successfully', async () => {
          const sessionCode = MOCK_SESSION_CODE;
          // Define minimal service result
          const serviceResult = { status: 'active', expiresAt: new Date(Date.now() + 300000).toISOString() }; 
          // IMPORTANT: Ensure 'getUssdSessionStatus' is correct
          const getStatusStub = sandbox.stub(ussdService, 'getUssdSessionStatus').resolves(serviceResult);

          const response = await request(app)
              .get('/api/v1/ussd/session-status')
              .query({ sessionCode: sessionCode });

          expect(response.status).to.equal(200);
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.equal('Session status retrieved successfully.');
          expect(response.body.data).to.exist;
          expect(response.body.data.status).to.equal(serviceResult.status);
          expect(response.body.data.expiresAt).to.equal(serviceResult.expiresAt);

          expect(getStatusStub.calledOnceWith(sessionCode)).to.be.true;
      });

      it('should return 400 for missing sessionCode query parameter', async () => {
           const response = await request(app)
              .get('/api/v1/ussd/session-status')
              // No query params
              .send(); // Use send() just to ensure request is made if needed by supertest

          expect(response.status).to.equal(400);
          expect(response.body.success).to.be.false;
          expect(response.body.message).to.equal('Validation Error');
          expect(response.body.errors.some(e => e.msg.includes('sessionCode is required'))).to.be.true;
      });

      // Add test for invalid sessionCode format if applicable

      it('should return 404 if session code not found or expired', async () => {
            const sessionCode = 'NOT-FOUND-CODE';
            const error = new Error('USSD session not found or expired.');
            error.status = 404;
            // IMPORTANT: Ensure 'getUssdSessionStatus' is correct
            const getStatusStub = sandbox.stub(ussdService, 'getUssdSessionStatus').rejects(error);

            const response = await request(app)
                .get('/api/v1/ussd/session-status')
                .query({ sessionCode: sessionCode });

            expect(response.status).to.equal(404);
            expect(response.body.success).to.be.false;
            expect(response.body.message).to.equal(error.message);
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