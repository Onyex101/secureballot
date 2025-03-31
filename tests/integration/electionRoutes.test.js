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
const voteService = require('../../src/services/voteService');

// Example simplified mock data
const MOCK_ELECTION_1 = {
  id: 'elec-uuid-1',
  electionName: 'Presidential Election 2024',
  electionType: 'presidential',
  status: 'active',
  startDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  endDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  description: 'Mock Presidential Election'
};
const MOCK_ELECTION_2 = {
  id: 'elec-uuid-2',
  electionName: 'Gubernatorial Election 2024',
  electionType: 'gubernatorial',
  status: 'upcoming',
  startDate: new Date(Date.now() + (2 * 86400000)).toISOString(), // Day after tomorrow
  endDate: new Date(Date.now() + (3 * 86400000)).toISOString(),
  description: 'Mock Gubernatorial Election'
};
const MOCK_CANDIDATE_1 = {
    id: 'cand-uuid-1',
    name: 'John Candidate',
    party: 'Democratic Party',
    partyAcronym: 'DP',
    electionId: MOCK_ELECTION_1.id,
    // ... other fields
};
const MOCK_CANDIDATE_2 = {
    id: 'cand-uuid-2',
    name: 'Jane Candidate',
    party: 'Republican Party',
    partyAcronym: 'RP',
    electionId: MOCK_ELECTION_1.id,
    // ... other fields
};

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
    it('should return a list of elections with pagination', async () => {
      const mockElections = [MOCK_ELECTION_1, MOCK_ELECTION_2];
      const mockPagination = { total: 2, page: 1, limit: 10, totalPages: 1 };
      
      // IMPORTANT: Stub the actual method used by your service/controller (e.g., findAndCountAll)
      const findAndCountAllStub = sandbox.stub(electionModel, 'findAndCountAll').resolves({ rows: mockElections, count: mockPagination.total });
      
      const response = await request(app)
        .get('/api/v1/elections')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 }); // Use inline query params
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.exist;
      expect(response.body.data.elections).to.be.an('array').with.lengthOf(2);
      // Check properties of the first returned election
      expect(response.body.data.elections[0].id).to.equal(MOCK_ELECTION_1.id);
      expect(response.body.data.elections[0].electionName).to.equal(MOCK_ELECTION_1.electionName);
      // Check pagination data
      expect(response.body.data.pagination).to.deep.equal(mockPagination);
      
      // Verify the stub call (check options if specific filters/limit/offset are expected)
      expect(findAndCountAllStub.calledOnce).to.be.true;
      // expect(findAndCountAllStub.firstCall.args[0].where).to.deep.equal({}); // Example check
      // expect(findAndCountAllStub.firstCall.args[0].limit).to.equal(10);
      // expect(findAndCountAllStub.firstCall.args[0].offset).to.equal(0);
    });
    
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/elections')
        .query({ page: 1, limit: 10 });
      
      expect(response.status).to.equal(401);
    });
    
    // Add test for filtering/searching if applicable
    // Add test for pagination edge cases (empty list, multiple pages)
  });
  
  describe('GET /api/v1/elections/:id', () => {
    it('should return election details by ID', async () => {
      const electionId = MOCK_ELECTION_1.id;
      
      // IMPORTANT: Stub the actual method used (e.g., findByPk)
      const findByPkStub = sandbox.stub(electionModel, 'findByPk').resolves(MOCK_ELECTION_1);
      
      const response = await request(app)
        .get(`/api/v1/elections/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.exist;
      expect(response.body.data.id).to.equal(electionId);
      expect(response.body.data.electionName).to.equal(MOCK_ELECTION_1.electionName);
      expect(response.body.data.status).to.equal(MOCK_ELECTION_1.status);
      
      expect(findByPkStub.calledOnceWith(electionId)).to.be.true;
    });
    
    it('should return 404 if election not found', async () => {
      const nonExistentId = 'elec-non-existent';
      // IMPORTANT: Stub the actual method used
      const findByPkStub = sandbox.stub(electionModel, 'findByPk').resolves(null);
      
      const response = await request(app)
        .get(`/api/v1/elections/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Election not found'); // Match error message
      expect(findByPkStub.calledOnceWith(nonExistentId)).to.be.true;
    });
    
    // Add 401 test
    it('should return 401 if not authenticated', async () => {
        const response = await request(app).get(`/api/v1/elections/${MOCK_ELECTION_1.id}`);
        expect(response.status).to.equal(401);
    });

    // Add 500 test
    it('should return 500 for unexpected errors', async () => {
        const electionId = MOCK_ELECTION_1.id;
        const serverError = new Error('Database error');
        const findByPkStub = sandbox.stub(electionModel, 'findByPk').rejects(serverError);

        const response = await request(app)
            .get(`/api/v1/elections/${electionId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(findByPkStub.calledOnce).to.be.true;
    });
  });
  
  describe('GET /api/v1/elections/:electionId/candidates', () => {
    it('should return candidates for a specific election with pagination', async () => {
      const electionId = MOCK_ELECTION_1.id;
      const mockCandidates = [MOCK_CANDIDATE_1, MOCK_CANDIDATE_2];
      const mockPagination = { total: 2, page: 1, limit: 50, totalPages: 1 };
      
      // Stub the candidate service method (or model method if service doesn't exist)
      // IMPORTANT: Ensure 'getCandidatesForElection' is correct function name
      const getCandidatesStub = sandbox.stub(electionService, 'getCandidatesForElection').resolves({ 
          candidates: mockCandidates, 
          pagination: mockPagination 
      });
      // // Alternate: Stub the model directly if no service method
      // const findAndCountAllStub = sandbox.stub(candidateModel, 'findAndCountAll').resolves({ rows: mockCandidates, count: mockPagination.total });
      
      const response = await request(app)
        .get(`/api/v1/elections/${electionId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 50 });
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.exist;
      expect(response.body.data.candidates).to.be.an('array').with.lengthOf(mockCandidates.length);
      expect(response.body.data.candidates[0].id).to.equal(mockCandidates[0].id);
      // expect(response.body.data.candidates[0].electionId).to.equal(electionId); // Redundant if service call is verified
      expect(response.body.data.pagination).to.deep.equal(mockPagination);
      
      // Verify the service/model call includes the electionId and pagination
      expect(getCandidatesStub.calledOnceWith(electionId, sinon.match({ page: 1, limit: 50 }))).to.be.true;
      // // Alternate: Verify model call
      // expect(findAndCountAllStub.calledOnce).to.be.true;
      // expect(findAndCountAllStub.firstCall.args[0].where).to.deep.equal({ electionId: electionId });
    });

     it('should return 404 if the election ID does not exist when fetching candidates (handled by service)', async () => {
        const nonExistentElectionId = 'elec-non-existent';
        const error = new Error('Election not found.');
        error.status = 404;
        // IMPORTANT: Ensure 'getCandidatesForElection' is correct
        const getCandidatesStub = sandbox.stub(electionService, 'getCandidatesForElection').rejects(error);
        
        const response = await request(app)
            .get(`/api/v1/elections/${nonExistentElectionId}/candidates`)
            .set('Authorization', `Bearer ${authToken}`)
            .query({ page: 1, limit: 50 });

        // Expect 404 because the service should handle the election check
        expect(response.status).to.equal(404); 
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal(error.message);
        expect(getCandidatesStub.calledOnce).to.be.true;
    });

    // Add 401 test
    it('should return 401 if not authenticated', async () => {
        const response = await request(app).get(`/api/v1/elections/${MOCK_ELECTION_1.id}/candidates`);
        expect(response.status).to.equal(401);
        expect(response.body.message).to.contain('No authorization token');
    });

    // Add 500 test
    it('should return 500 for unexpected service errors', async () => {
        const electionId = MOCK_ELECTION_1.id;
        const serverError = new Error('Database error fetching candidates');
        const getCandidatesStub = sandbox.stub(electionService, 'getCandidatesForElection').rejects(serverError);

        const response = await request(app)
            .get(`/api/v1/elections/${electionId}/candidates`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(500);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(getCandidatesStub.calledOnce).to.be.true;
    });
  });
  
  describe('POST /api/v1/elections/:electionId/vote', () => {
    it('should cast a vote successfully', async () => {
      const electionId = MOCK_ELECTION_1.id;
      const candidateId = MOCK_CANDIDATE_1.id;
      const voteData = { candidateId: candidateId }; // Request body
      // Define minimal expected result from the vote service
      const serviceResult = { 
          voteId: 'new-vote-uuid-123', 
          receiptCode: 'RECEIPT-ABC-123', 
          message: 'Vote cast successfully. Your receipt code is RECEIPT-ABC-123'
      };
      
      // IMPORTANT: Stub the single service method responsible for casting the vote
      // Ensure 'castVote' is the correct function name in voteService
      const castVoteStub = sandbox.stub(voteService, 'castVote').resolves(serviceResult);
      
      const response = await request(app)
        .post(`/api/v1/elections/${electionId}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(voteData);
      
      expect(response.status).to.equal(201); // Vote creation status
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      expect(response.body.data).to.exist;
      expect(response.body.data.voteId).to.equal(serviceResult.voteId);
      expect(response.body.data.receiptCode).to.equal(serviceResult.receiptCode);

      // Verify service call with voterId (from token), electionId (from path), and candidateId (from body)
      expect(castVoteStub.calledOnceWith(voterUserId, electionId, voteData.candidateId)).to.be.true;
    });
    
    it('should return 400 if candidateId is missing', async () => {
        const electionId = MOCK_ELECTION_1.id;
        const invalidVoteData = {}; // Missing candidateId

        const response = await request(app)
            .post(`/api/v1/elections/${electionId}/vote`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidVoteData);

        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Validation Error');
        expect(response.body.errors.some(e => e.msg.includes('Candidate ID is required'))).to.be.true;
    });

    it('should return 400 if already voted in this election (handled by service)', async () => {
      const electionId = MOCK_ELECTION_1.id;
      const candidateId = MOCK_CANDIDATE_1.id;
      const voteData = { candidateId: candidateId };
      const conflictError = new Error('Voter has already voted in this election.');
      conflictError.status = 400; // Or 409 Conflict
      conflictError.code = 'ALREADY_VOTED';
      
      // Stub the service to reject with the conflict error
      const castVoteStub = sandbox.stub(voteService, 'castVote').rejects(conflictError);
      
      const response = await request(app)
        .post(`/api/v1/elections/${electionId}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(voteData);
      
      expect(response.status).to.equal(400); // Or 409
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(conflictError.message);

      expect(castVoteStub.calledOnce).to.be.true;
    });

    it('should return 404 if election or candidate not found (handled by service)', async () => {
        const electionId = 'non-existent-election-id';
        const candidateId = MOCK_CANDIDATE_1.id;
        const voteData = { candidateId: candidateId };
        const notFoundError = new Error('Election or Candidate not found.');
        notFoundError.status = 404;
        const castVoteStub = sandbox.stub(voteService, 'castVote').rejects(notFoundError);

        const response = await request(app)
            .post(`/api/v1/elections/${electionId}/vote`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(voteData);

        expect(response.status).to.equal(404);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal(notFoundError.message);
        expect(castVoteStub.calledOnce).to.be.true;
    });

    it('should return 400 if election is not active (handled by service)', async () => {
        const inactiveElectionId = MOCK_ELECTION_2.id; // Use the upcoming election
        const candidateId = 'some-candidate-id';
        const voteData = { candidateId: candidateId };
        const inactiveError = new Error('Election is not currently active.');
        inactiveError.status = 400;
        const castVoteStub = sandbox.stub(voteService, 'castVote').rejects(inactiveError);

        const response = await request(app)
            .post(`/api/v1/elections/${inactiveElectionId}/vote`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(voteData);

        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal(inactiveError.message);
        expect(castVoteStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
        const electionId = MOCK_ELECTION_1.id;
        const voteData = { candidateId: MOCK_CANDIDATE_1.id };
        const response = await request(app)
            .post(`/api/v1/elections/${electionId}/vote`)
            .send(voteData);
        expect(response.status).to.equal(401);
        expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected service errors', async () => {
        const electionId = MOCK_ELECTION_1.id;
        const voteData = { candidateId: MOCK_CANDIDATE_1.id };
        const serverError = new Error('Database error during vote creation');
        const castVoteStub = sandbox.stub(voteService, 'castVote').rejects(serverError);

        const response = await request(app)
            .post(`/api/v1/elections/${electionId}/vote`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(voteData);

        expect(response.status).to.equal(500);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(castVoteStub.calledOnce).to.be.true;
    });

    // ... (Potentially add tests for eligibility check failure if handled here)

    // ... rest of file ...
  });

  // ... rest of file ...
}); 