const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const electionModel = require('../../src/db/models/electionModel');
const candidateModel = require('../../src/db/models/candidateModel');
const voteModel = require('../../src/db/models/voteModel');
const testData = require('../api-test-data.json');
const candidateController = require('../../src/controllers/election/candidateController');
const offlineVoteService = require('../../src/services/offlineVoteService');

describe('Election Routes Integration Tests', () => {
  let sandbox;
  let authToken;
  let adminAuthToken;
  let voterUserId;
  let adminUserId;
  
  beforeEach(() => {
    // Create a sandbox for Sinon stubs
    sandbox = sinon.createSandbox();
    
    // Generate test auth tokens
    const voterPayload = { id: 'voter-user-uuid', role: 'voter' };
    voterUserId = voterPayload.id;
    authToken = jwt.sign(voterPayload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

    const adminPayload = { id: 'admin-user-uuid', role: 'admin' };
    adminUserId = adminPayload.id;
    adminAuthToken = jwt.sign(adminPayload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('GET /api/v1/elections', () => {
    it('should return a list of elections', async () => {
      // Test data
      const mockElections = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Presidential Election 2023',
          type: 'presidential',
          status: 'active',
          startDate: '2023-02-25T08:00:00.000Z',
          endDate: '2023-02-25T18:00:00.000Z',
          description: 'Nigerian Presidential Election'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          title: 'Gubernatorial Election 2023',
          type: 'gubernatorial',
          status: 'upcoming',
          startDate: '2023-03-11T08:00:00.000Z',
          endDate: '2023-03-11T18:00:00.000Z',
          description: 'Nigerian Gubernatorial Election'
        }
      ];
      
      // Stub database calls
      const getElectionsStub = sandbox.stub(electionModel, 'getElections').resolves({
        elections: mockElections,
        total: mockElections.length,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      
      // Make request
      const response = await request(app)
        .get('/api/v1/elections')
        .set('Authorization', `Bearer ${authToken}`)
        .query(testData.electionRoutes['/api/v1/elections'].queryParams);
      
      // Assertions
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('elections');
      expect(response.body.elections).to.be.an('array');
      expect(response.body.elections).to.have.lengthOf(2);
      expect(getElectionsStub.calledOnce).to.be.true;
    });
    
    it('should return 401 if not authenticated', async () => {
      // Make request without auth token
      const response = await request(app)
        .get('/api/v1/elections')
        .query(testData.electionRoutes['/api/v1/elections'].queryParams);
      
      // Assertions
      expect(response.status).to.equal(401);
    });
  });
  
  describe('GET /api/v1/elections/:id', () => {
    it('should return election details by ID', async () => {
      // Test data
      const electionId = testData.electionRoutes['/api/v1/elections/{id}'].pathParams.id;
      const mockElection = {
        id: electionId,
        title: 'Presidential Election 2023',
        type: 'presidential',
        status: 'active',
        startDate: '2023-02-25T08:00:00.000Z',
        endDate: '2023-02-25T18:00:00.000Z',
        description: 'Nigerian Presidential Election',
        createdAt: '2023-01-15T10:00:00.000Z',
        updatedAt: '2023-01-15T10:00:00.000Z'
      };
      
      // Stub database calls
      const getElectionStub = sandbox.stub(electionModel, 'getElectionById').resolves(mockElection);
      
      // Make request
      const response = await request(app)
        .get(`/api/v1/elections/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Assertions
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('election');
      expect(response.body.election).to.have.property('id', electionId);
      expect(getElectionStub.calledOnce).to.be.true;
      expect(getElectionStub.calledWith(electionId)).to.be.true;
    });
    
    it('should return 404 if election not found', async () => {
      // Test data
      const electionId = testData.electionRoutes['/api/v1/elections/{id}'].pathParams.id;
      
      // Stub database calls to return null (not found)
      const getElectionStub = sandbox.stub(electionModel, 'getElectionById').resolves(null);
      
      // Make request
      const response = await request(app)
        .get(`/api/v1/elections/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Assertions
      expect(response.status).to.equal(404);
      expect(getElectionStub.calledOnce).to.be.true;
    });
  });
  
  describe('GET /api/v1/elections/:electionId/candidates', () => {
    it('should return candidates for an election', async () => {
      // Test data
      const electionId = testData.electionRoutes['/api/v1/elections/{electionId}/candidates'].pathParams.electionId;
      const mockCandidates = [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'John Candidate',
          party: 'Democratic Party',
          partyAcronym: 'DP',
          electionId,
          biography: 'Experienced candidate',
          imageUrl: 'https://example.com/image1.jpg'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Jane Candidate',
          party: 'Republican Party',
          partyAcronym: 'RP',
          electionId,
          biography: 'Qualified candidate',
          imageUrl: 'https://example.com/image2.jpg'
        }
      ];
      
      // Stub database calls
      const getCandidatesStub = sandbox.stub(candidateModel, 'getCandidatesByElection').resolves({
        candidates: mockCandidates,
        total: mockCandidates.length,
        page: 1,
        limit: 50,
        totalPages: 1
      });
      
      // Make request
      const response = await request(app)
        .get(`/api/v1/elections/${electionId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .query(testData.electionRoutes['/api/v1/elections/{electionId}/candidates'].queryParams);
      
      // Assertions
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('candidates');
      expect(response.body.candidates).to.be.an('array');
      expect(response.body.candidates).to.have.lengthOf(2);
      expect(getCandidatesStub.calledOnce).to.be.true;
    });
  });
  
  describe('POST /api/v1/elections/:electionId/vote', () => {
    it('should cast a vote successfully', async () => {
      // Test data
      const electionId = testData.electionRoutes['/api/v1/elections/{electionId}/vote'].pathParams.electionId;
      const candidateId = testData.electionRoutes['/api/v1/elections/{electionId}/vote'].requestBody.candidateId;
      const voterId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Stub database calls
      const checkVoteStub = sandbox.stub(voteModel, 'checkVoterElectionVote').resolves(null);
      const getElectionStub = sandbox.stub(electionModel, 'getElectionById').resolves({
        id: electionId,
        status: 'active',
        startDate: new Date(Date.now() - 3600000), // 1 hour ago
        endDate: new Date(Date.now() + 3600000) // 1 hour from now
      });
      const getCandidateStub = sandbox.stub(candidateModel, 'getCandidateById').resolves({
        id: candidateId,
        electionId,
        name: 'John Candidate'
      });
      const castVoteStub = sandbox.stub(voteModel, 'castVote').resolves({
        id: '550e8400-e29b-41d4-a716-446655440004',
        voterId,
        electionId,
        candidateId,
        timestamp: new Date()
      });
      
      // Make request
      const response = await request(app)
        .post(`/api/v1/elections/${electionId}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.electionRoutes['/api/v1/elections/{electionId}/vote'].requestBody);
      
      // Assertions
      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('message');
      expect(checkVoteStub.calledOnce).to.be.true;
      expect(getElectionStub.calledOnce).to.be.true;
      expect(getCandidateStub.calledOnce).to.be.true;
      expect(castVoteStub.calledOnce).to.be.true;
    });
    
    it('should return 400 if already voted in this election', async () => {
      // Test data
      const electionId = testData.electionRoutes['/api/v1/elections/{electionId}/vote'].pathParams.electionId;
      const voterId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Stub database calls to simulate already voted
      const checkVoteStub = sandbox.stub(voteModel, 'checkVoterElectionVote').resolves({
        id: '550e8400-e29b-41d4-a716-446655440004',
        voterId,
        electionId
      });
      
      // Make request
      const response = await request(app)
        .post(`/api/v1/elections/${electionId}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.electionRoutes['/api/v1/elections/{electionId}/vote'].requestBody);
      
      // Assertions
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('already voted');
      expect(checkVoteStub.calledOnce).to.be.true;
    });
  });

  // --- Candidate CRUD Routes (Admin for CUD) ---
  describe('POST /:electionId/candidates', () => {
      const electionId = testData.electionRoutes['/api/v1/elections/{electionId}/candidates'].post.pathParams.electionId;
      const candidateData = testData.electionRoutes['/api/v1/elections/{electionId}/candidates'].post.requestBody.success;

      it('should create a new candidate successfully (Admin)', async () => {
          const expectedCandidate = { id: 'new-candidate-uuid', ...candidateData, electionId };
          const createStub = sandbox.stub(candidateController, 'createCandidateService').resolves(expectedCandidate);

          const response = await request(app)
              .post(`/api/v1/elections/${electionId}/candidates`)
              .set('Authorization', `Bearer ${adminAuthToken}`)
              .send(candidateData);

          expect(response.status).to.equal(201);
          expect(response.body).to.deep.equal({
              success: true,
              message: 'Candidate created successfully.',
              data: expectedCandidate
          });
          expect(createStub.calledOnceWith(electionId, candidateData)).to.be.true;
      });

      it('should return 403 Forbidden if user is not admin', async () => {
          const response = await request(app)
              .post(`/api/v1/elections/${electionId}/candidates`)
              .set('Authorization', `Bearer ${authToken}`)
              .send(candidateData);

          expect(response.status).to.equal(403);
          expect(response.body.message).to.contain('Forbidden');
      });

      it('should return 400 for missing required fields (e.g., fullName)', async () => {
          const invalidData = { ...candidateData, fullName: undefined };
          const response = await request(app)
              .post(`/api/v1/elections/${electionId}/candidates`)
              .set('Authorization', `Bearer ${adminAuthToken}`)
              .send(invalidData);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Full name is required');
      });

       it('should return 404 if election ID not found (Admin)', async () => {
          const error = { status: 404, message: 'Election not found.' };
          const createStub = sandbox.stub(candidateController, 'createCandidateService').rejects(error);

           const response = await request(app)
              .post(`/api/v1/elections/${electionId}/candidates`)
              .set('Authorization', `Bearer ${adminAuthToken}`)
              .send(candidateData);

           expect(response.status).to.equal(404);
           expect(response.body.message).to.equal(error.message);
           expect(createStub.calledOnce).to.be.true;
      });

      it('should return 401 if not authenticated', async () => {
           const response = await request(app)
              .post(`/api/v1/elections/${electionId}/candidates`)
              .send(candidateData);
           expect(response.status).to.equal(401);
      });
  });

  describe('GET /:electionId/candidates/:candidateId', () => {
      const electionId = testData.electionRoutes['/api/v1/elections/{electionId}/candidates/{candidateId}'].getPathParams().electionId;
      const candidateId = testData.electionRoutes['/api/v1/elections/{electionId}/candidates/{candidateId}'].getPathParams().candidateId;

      it('should get a specific candidate successfully', async () => {
          const expectedCandidate = testData.electionRoutes['/api/v1/elections/{electionId}/candidates/{candidateId}'].get.successResponse.data;
          const getStub = sandbox.stub(candidateController, 'getCandidateByIdService').resolves(expectedCandidate);

          const response = await request(app)
              .get(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: 'Candidate retrieved successfully.',
              data: expectedCandidate
          });
          expect(getStub.calledOnceWith(electionId, candidateId)).to.be.true;
      });

      it('should return 400 for invalid election or candidate ID format', async () => {
          const response = await request(app)
              .get(`/api/v1/elections/invalid-election/candidates/invalid-candidate`)
              .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).to.equal(400);
      });

       it('should return 404 if candidate or election not found', async () => {
           const error = { status: 404, message: 'Candidate not found in this election.' };
          const getStub = sandbox.stub(candidateController, 'getCandidateByIdService').resolves(null);

           const response = await request(app)
              .get(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
              .set('Authorization', `Bearer ${authToken}`);

           expect(response.status).to.equal(404);
           expect(response.body.message).to.contain('Candidate not found');
           expect(getStub.calledOnce).to.be.true;
       });

       it('should return 401 if not authenticated', async () => {
           const response = await request(app).get(`/api/v1/elections/${electionId}/candidates/${candidateId}`);
           expect(response.status).to.equal(401);
       });
  });

   describe('PUT /:electionId/candidates/:candidateId', () => {
      const electionId = testData.electionRoutes['/api/v1/elections/{electionId}/candidates/{candidateId}'].getPathParams().electionId;
      const candidateId = testData.electionRoutes['/api/v1/elections/{electionId}/candidates/{candidateId}'].getPathParams().candidateId;
      const updateData = testData.electionRoutes['/api/v1/elections/{electionId}/candidates/{candidateId}'].put.requestBody.success;

      it('should update a candidate successfully (Admin)', async () => {
          const expectedUpdatedCandidate = { ...updateData, id: candidateId, electionId };
          const updateStub = sandbox.stub(candidateController, 'updateCandidateService').resolves(expectedUpdatedCandidate);

          const response = await request(app)
              .put(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
              .set('Authorization', `Bearer ${adminAuthToken}`)
              .send(updateData);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: 'Candidate updated successfully.',
              data: expectedUpdatedCandidate
          });
          expect(updateStub.calledOnceWith(electionId, candidateId, updateData)).to.be.true;
      });

       it('should return 403 Forbidden if user is not admin', async () => {
           const response = await request(app)
              .put(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
              .set('Authorization', `Bearer ${authToken}`)
              .send(updateData);

           expect(response.status).to.equal(403);
       });

       it('should return 400 for invalid input data (e.g., invalid photoUrl)', async () => {
           const invalidData = { ...updateData, photoUrl: 'not-a-url' };
            const response = await request(app)
              .put(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
              .set('Authorization', `Bearer ${adminAuthToken}`)
              .send(invalidData);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Photo URL must be a valid URL');
       });

        it('should return 404 if candidate or election not found (Admin)', async () => {
           const error = { status: 404, message: 'Candidate not found.' };
           const updateStub = sandbox.stub(candidateController, 'updateCandidateService').rejects(error);

            const response = await request(app)
              .put(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
              .set('Authorization', `Bearer ${adminAuthToken}`)
              .send(updateData);

           expect(response.status).to.equal(404);
            expect(response.body.message).to.equal(error.message);
           expect(updateStub.calledOnce).to.be.true;
       });

       it('should return 401 if not authenticated', async () => {
            const response = await request(app)
               .put(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
               .send(updateData);
            expect(response.status).to.equal(401);
       });
   });

   describe('DELETE /:electionId/candidates/:candidateId', () => {
        const electionId = testData.electionRoutes['/api/v1/elections/{electionId}/candidates/{candidateId}'].getPathParams().electionId;
        const candidateId = testData.electionRoutes['/api/v1/elections/{electionId}/candidates/{candidateId}'].getPathParams().candidateId;

        it('should delete a candidate successfully (Admin)', async () => {
            const deleteStub = sandbox.stub(candidateController, 'deleteCandidateService').resolves({ success: true });

            const response = await request(app)
                .delete(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
                .set('Authorization', `Bearer ${adminAuthToken}`);

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal({
                success: true,
                message: 'Candidate deleted successfully.',
            });
            expect(deleteStub.calledOnceWith(electionId, candidateId)).to.be.true;
        });

         it('should return 403 Forbidden if user is not admin', async () => {
           const response = await request(app)
              .delete(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
              .set('Authorization', `Bearer ${authToken}`);

           expect(response.status).to.equal(403);
       });

        it('should return 404 if candidate or election not found (Admin)', async () => {
            const error = { status: 404, message: 'Candidate not found.' };
            const deleteStub = sandbox.stub(candidateController, 'deleteCandidateService').rejects(error);

            const response = await request(app)
                .delete(`/api/v1/elections/${electionId}/candidates/${candidateId}`)
                .set('Authorization', `Bearer ${adminAuthToken}`);

            expect(response.status).to.equal(404);
            expect(response.body.message).to.equal(error.message);
            expect(deleteStub.calledOnce).to.be.true;
        });

         it('should return 401 if not authenticated', async () => {
            const response = await request(app).delete(`/api/v1/elections/${electionId}/candidates/${candidateId}`);
            expect(response.status).to.equal(401);
       });
   });

  // --- Offline Voting Routes ---
  describe('POST /offline-vote/verify', () => {
      it('should verify an offline vote code successfully', async () => {
          const verifyData = testData.electionRoutes['/api/v1/elections/offline-vote/verify'].post.requestBody.success;
          const expectedResult = { valid: true, message: 'Offline vote code is valid.', verificationId: 'mock-verification-id' };
          const verifyStub = sandbox.stub(offlineVoteService, 'verifyOfflineCode').resolves(expectedResult);

          const response = await request(app)
              .post('/api/v1/elections/offline-vote/verify')
              .set('Authorization', `Bearer ${authToken}`) // Assume voter initiates verification
              .send(verifyData);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: expectedResult.message,
              data: { verificationId: expectedResult.verificationId, valid: true }
          });
          expect(verifyStub.calledOnceWith(verifyData.offlineCode)).to.be.true;
      });

       it('should return 400 for missing offline code', async () => {
           const invalidData = { offlineCode: undefined };
            const response = await request(app)
              .post('/api/v1/elections/offline-vote/verify')
              .set('Authorization', `Bearer ${authToken}`)
              .send(invalidData);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Offline vote code is required');
       });

      it('should return 400 if offline code is invalid or expired', async () => {
           const verifyData = testData.electionRoutes['/api/v1/elections/offline-vote/verify'].post.requestBody.invalidCode;
           const error = { status: 400, message: 'Invalid or expired offline vote code.' };
           const verifyStub = sandbox.stub(offlineVoteService, 'verifyOfflineCode').rejects(error);

           const response = await request(app)
              .post('/api/v1/elections/offline-vote/verify')
              .set('Authorization', `Bearer ${authToken}`)
              .send(verifyData);

           expect(response.status).to.equal(400);
           expect(response.body).to.deep.equal({ success: false, message: error.message });
           expect(verifyStub.calledOnce).to.be.true;
      });

      it('should return 401 if not authenticated', async () => {
            const verifyData = testData.electionRoutes['/api/v1/elections/offline-vote/verify'].post.requestBody.success;
            const response = await request(app).post('/api/v1/elections/offline-vote/verify').send(verifyData);
            expect(response.status).to.equal(401);
      });

      it('should return 500 for unexpected errors', async () => {
           const verifyData = testData.electionRoutes['/api/v1/elections/offline-vote/verify'].post.requestBody.success;
           const error = new Error("Verification service error");
           const verifyStub = sandbox.stub(offlineVoteService, 'verifyOfflineCode').rejects(error);

           const response = await request(app)
              .post('/api/v1/elections/offline-vote/verify')
              .set('Authorization', `Bearer ${authToken}`)
              .send(verifyData);

           expect(response.status).to.equal(500);
           expect(verifyStub.calledOnce).to.be.true;
      });
  });

  describe('POST /offline-vote/submit', () => {
      it('should submit a verified offline vote successfully', async () => {
          const submitData = testData.electionRoutes['/api/v1/elections/offline-vote/submit'].post.requestBody.success;
          const expectedResult = { voteId: 'new-offline-vote-uuid', message: 'Offline vote submitted successfully.' };
          const submitStub = sandbox.stub(offlineVoteService, 'submitVerifiedVote').resolves(expectedResult);

          const response = await request(app)
              .post('/api/v1/elections/offline-vote/submit')
              .set('Authorization', `Bearer ${authToken}`) // Voter submits
              .send(submitData);

          expect(response.status).to.equal(201); // Vote created
          expect(response.body).to.deep.equal({
              success: true,
              message: expectedResult.message,
              data: { voteId: expectedResult.voteId }
          });
          expect(submitStub.calledOnceWith(userIdFromToken, submitData.verificationId)).to.be.true;
      });

       it('should return 400 for missing verification ID', async () => {
          const invalidData = { verificationId: undefined };
           const response = await request(app)
              .post('/api/v1/elections/offline-vote/submit')
              .set('Authorization', `Bearer ${authToken}`)
              .send(invalidData);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Verification ID is required');
      });

      it('should return 400 if verification ID is invalid or vote already submitted', async () => {
          const submitData = testData.electionRoutes['/api/v1/elections/offline-vote/submit'].post.requestBody.invalidId;
          const error = { status: 400, message: 'Invalid verification ID or vote already submitted.' };
          const submitStub = sandbox.stub(offlineVoteService, 'submitVerifiedVote').rejects(error);

          const response = await request(app)
              .post('/api/v1/elections/offline-vote/submit')
              .set('Authorization', `Bearer ${authToken}`)
              .send(submitData);

          expect(response.status).to.equal(400);
          expect(response.body).to.deep.equal({ success: false, message: error.message });
          expect(submitStub.calledOnce).to.be.true;
      });

       it('should return 400 if voter already voted in the associated election (online)', async () => {
          const submitData = testData.electionRoutes['/api/v1/elections/offline-vote/submit'].post.requestBody.alreadyVotedOnline;
           const error = { status: 400, message: 'Voter has already cast a vote in this election.' };
           const submitStub = sandbox.stub(offlineVoteService, 'submitVerifiedVote').rejects(error);

           const response = await request(app)
              .post('/api/v1/elections/offline-vote/submit')
              .set('Authorization', `Bearer ${authToken}`)
              .send(submitData);

           expect(response.status).to.equal(400);
           expect(response.body).to.deep.equal({ success: false, message: error.message });
           expect(submitStub.calledOnce).to.be.true;
       });

       it('should return 401 if not authenticated', async () => {
           const submitData = testData.electionRoutes['/api/v1/elections/offline-vote/submit'].post.requestBody.success;
           const response = await request(app).post('/api/v1/elections/offline-vote/submit').send(submitData);
           expect(response.status).to.equal(401);
       });

       it('should return 500 for unexpected errors', async () => {
          const submitData = testData.electionRoutes['/api/v1/elections/offline-vote/submit'].post.requestBody.success;
           const error = new Error("DB insert error");
            const submitStub = sandbox.stub(offlineVoteService, 'submitVerifiedVote').rejects(error);

            const response = await request(app)
              .post('/api/v1/elections/offline-vote/submit')
              .set('Authorization', `Bearer ${authToken}`)
              .send(submitData);

            expect(response.status).to.equal(500);
            expect(submitStub.calledOnce).to.be.true;
       });
  });

}); 