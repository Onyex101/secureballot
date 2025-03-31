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
    const payload = { id: 'test-voter-id', role: 'voter' /* other needed fields */ };
    userIdFromToken = payload.id;
    authToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  });

  afterEach(() => {
    sandbox.restore();
  });

  // --- Voter Profile Routes ---
  describe('GET /profile', () => {
    it("should get the authenticated voter's profile successfully", async () => {
      // Minimal expected data from service
      const serviceResult = { id: userIdFromToken, nin: '11122233344', email: 'voter@test.com' };
      // IMPORTANT: Ensure 'getVoterProfile' is correct
      const getProfileStub = sandbox.stub(voterService, 'getVoterProfile').resolves(serviceResult);

      const response = await request(app)
        .get('/api/v1/voter/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Voter profile retrieved successfully.'); // Match controller message
      expect(response.body.data).to.exist;
      expect(response.body.data.id).to.equal(userIdFromToken);
      expect(response.body.data.nin).to.equal(serviceResult.nin);
      expect(response.body.data.email).to.equal(serviceResult.email);

      expect(getProfileStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/v1/voter/profile');
      expect(response.status).to.equal(401);
      // Optionally check body for standard unauthorized message
    });

    it('should return 404 if the voter profile is not found by the service', async () => {
      // Simulate service resolving null/undefined or throwing a specific not found error
      const notFoundError = new Error('Voter not found');
      notFoundError.status = 404;
      notFoundError.code = 'VOTER_NOT_FOUND';
      // IMPORTANT: Ensure 'getVoterProfile' is correct
      const getProfileStub = sandbox.stub(voterService, 'getVoterProfile').rejects(notFoundError);
      // Or: sandbox.stub(voterService, 'getVoterProfile').resolves(null);

      const response = await request(app)
        .get('/api/v1/voter/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Voter not found'); // Match error message
      expect(getProfileStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 500 for unexpected service errors', async () => {
      const serverError = new Error('DB connection error');
      // IMPORTANT: Ensure 'getVoterProfile' is correct
      const getProfileStub = sandbox.stub(voterService, 'getVoterProfile').rejects(serverError);

      const response = await request(app)
        .get('/api/v1/voter/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error'); // Match generic error handler
      expect(getProfileStub.calledOnce).to.be.true;
    });
  });

  describe('PUT /profile', () => {
    it("should update the voter's profile successfully (e.g., phone number)", async () => {
      const updateData = { phoneNumber: '09087654321' };
      // Minimal expected data returned by service/controller
      const serviceResult = {
        id: userIdFromToken,
        phoneNumber: updateData.phoneNumber /* other updated fields */,
      };
      // IMPORTANT: Ensure 'updateVoterProfile' is correct
      const updateProfileStub = sandbox
        .stub(voterService, 'updateVoterProfile')
        .resolves(serviceResult);

      const response = await request(app)
        .put('/api/v1/voter/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Profile updated successfully'); // Match controller message
      expect(response.body.data).to.exist;
      expect(response.body.data.id).to.equal(userIdFromToken);
      expect(response.body.data.phoneNumber).to.equal(updateData.phoneNumber);

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
      expect(response.body.errors).to.be.an('array').that.has.length.greaterThan(0);
      expect(response.body.errors.some(e => e.msg.includes('Invalid phone number format'))).to.be
        .true; // Adjust msg
    });

    it('should return 401 if not authenticated', async () => {
      const updateData = { phoneNumber: '09011112222' };
      const response = await request(app).put('/api/v1/voter/profile').send(updateData);
      expect(response.status).to.equal(401);
    });

    // 404 test is less relevant here if auth middleware guarantees user exists

    it('should return 500 for unexpected errors during update', async () => {
      const updateData = { phoneNumber: '09087654321' };
      const serverError = new Error('Update failed unexpectedly');
      // IMPORTANT: Ensure 'updateVoterProfile' is correct
      const updateProfileStub = sandbox
        .stub(voterService, 'updateVoterProfile')
        .rejects(serverError);

      const response = await request(app)
        .put('/api/v1/voter/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(updateProfileStub.calledOnce).to.be.true;
    });
  });

  // --- Change Password Route ---
  // IMPORTANT: Changed to POST based on controller refactoring
  describe('POST /change-password', () => {
    it("should change the voter's password successfully", async () => {
      const passwordData = { currentPassword: 'oldPass123', newPassword: 'newSecurePass456!' };
      // Service might resolve void or a simple success message object
      const serviceResult = { message: 'Password changed successfully.' };
      // IMPORTANT: Ensure 'changePassword' is correct name in voterService
      const changePasswordStub = sandbox
        .stub(voterService, 'changePassword')
        .resolves(serviceResult);

      const response = await request(app)
        .post('/api/v1/voter/change-password') // Changed to POST
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Password changed successfully');
      // No specific data expected in response body for this typically

      expect(
        changePasswordStub.calledOnceWith(
          userIdFromToken,
          passwordData.currentPassword,
          passwordData.newPassword,
        ),
      ).to.be.true;
    });

    it('should return 400 for missing fields', async () => {
      const invalidData = { currentPassword: 'oldPass123' }; // Missing newPassword
      const response = await request(app)
        .post('/api/v1/voter/change-password') // Changed to POST
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('newPassword is required'))).to.be.true; // Adjust msg
    });

    it('should return 400 for weak new password', async () => {
      const invalidData = { currentPassword: 'oldPass123', newPassword: 'short' };
      const response = await request(app)
        .post('/api/v1/voter/change-password') // Changed to POST
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(
        response.body.errors.some(e =>
          e.msg.includes('New password must be at least 8 characters'),
        ),
      ).to.be.true; // Adjust msg
    });

    it('should return 400 if current password is incorrect', async () => {
      const passwordData = { currentPassword: 'wrongOldPass', newPassword: 'newSecurePass456!' };
      const inputError = new Error('Incorrect current password provided.');
      inputError.status = 400; // Or 401 depending on design
      inputError.code = 'INVALID_CURRENT_PASSWORD';
      // IMPORTANT: Ensure 'changePassword' is correct
      const changePasswordStub = sandbox.stub(voterService, 'changePassword').rejects(inputError);

      const response = await request(app)
        .post('/api/v1/voter/change-password') // Changed to POST
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).to.equal(400); // Or 401
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(inputError.message);
      expect(changePasswordStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const passwordData = { currentPassword: 'oldPass123', newPassword: 'newSecurePass456!' };
      const response = await request(app).post('/api/v1/voter/change-password').send(passwordData); // Changed to POST
      expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors', async () => {
      const passwordData = { currentPassword: 'oldPass123', newPassword: 'newSecurePass456!' };
      const serverError = new Error('Hashing service error');
      // IMPORTANT: Ensure 'changePassword' is correct
      const changePasswordStub = sandbox.stub(voterService, 'changePassword').rejects(serverError);

      const response = await request(app)
        .post('/api/v1/voter/change-password') // Changed to POST
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(changePasswordStub.calledOnce).to.be.true;
    });
  });

  // --- Polling Unit Routes ---
  describe('GET /polling-unit', () => {
    it("should get the voter's assigned polling unit successfully", async () => {
      const serviceResult = { id: 'pu-abc-123', pollingUnitCode: 'PU001', pollingUnitName: 'Test PU 1' }; // Inline data
      const getAssignedPUStub = sandbox.stub(voterService, 'getVoterPollingUnit').resolves(serviceResult);

      const response = await request(app).get('/api/v1/voter/polling-unit').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Assigned polling unit retrieved successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.id).to.equal(serviceResult.id);
      expect(response.body.data.pollingUnitCode).to.equal(serviceResult.pollingUnitCode);
      expect(getAssignedPUStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 404 if the voter has no assigned polling unit', async () => {
      const notFoundError = new Error('Polling unit not assigned');
      notFoundError.status = 404;
      const getAssignedPUStub = sandbox.stub(voterService, 'getVoterPollingUnit').rejects(notFoundError);

      const response = await request(app).get('/api/v1/voter/polling-unit').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(notFoundError.message);
      expect(getAssignedPUStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/v1/voter/polling-unit');
      expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors', async () => {
      const error = new Error('Server error');
      const getAssignedPUStub = sandbox.stub(voterService, 'getVoterPollingUnit').rejects(error);

      const response = await request(app).get('/api/v1/voter/polling-unit').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(getAssignedPUStub.calledOnce).to.be.true;
    });
  });

  describe('GET /polling-units', () => {
    it('should get a list of all polling units with default pagination', async () => {
      // Inline mock data
      const mockPollingUnits = [
        { id: 'pu-1', pollingUnitCode: 'PU001', pollingUnitName: 'PU Name 1', lga: 'LGA1' },
        { id: 'pu-2', pollingUnitCode: 'PU002', pollingUnitName: 'PU Name 2', lga: 'LGA1' }
      ];
      const mockPagination = { total: 2, page: 1, limit: 50, totalPages: 1 };
      const expectedResult = { pollingUnits: mockPollingUnits, pagination: mockPagination };
      // IMPORTANT: Ensure 'getAllPollingUnits' is correct function name
      const listPUStub = sandbox.stub(pollingUnitService, 'getAllPollingUnits').resolves(expectedResult);
      const defaultQuery = { page: 1, limit: 50 }; // Default params expected by service

      const response = await request(app)
        .get('/api/v1/voter/polling-units')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Polling units retrieved successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.pollingUnits).to.be.an('array').with.lengthOf(mockPollingUnits.length);
      expect(response.body.data.pollingUnits[0].id).to.equal(mockPollingUnits[0].id);
      expect(response.body.data.pollingUnits[0].pollingUnitCode).to.equal(mockPollingUnits[0].pollingUnitCode);
      expect(response.body.data.pagination).to.deep.equal(mockPagination); // deep.equal ok for pagination

      expect(listPUStub.calledOnceWith(sinon.match(defaultQuery))).to.be.true; // Check default query args
    });

    it('should get a list of polling units with specific pagination and search query', async () => {
      const queryParams = { page: 2, limit: 10, search: 'LGA2' }; // Inline query
      // Inline mock data for response
      const mockPollingUnits = [
          { id: 'pu-3', pollingUnitCode: 'PU003', pollingUnitName: 'PU Name 3', lga: 'LGA2' }
      ];
      const mockPagination = { total: 1, page: 2, limit: 10, totalPages: 1 };
      const expectedResult = { pollingUnits: mockPollingUnits, pagination: mockPagination };
      // IMPORTANT: Ensure 'getAllPollingUnits' is correct
      const listPUStub = sandbox.stub(pollingUnitService, 'getAllPollingUnits').resolves(expectedResult);

      const response = await request(app)
        .get('/api/v1/voter/polling-units')
        .query(queryParams) // Add query params
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.exist;
      expect(response.body.data.pollingUnits).to.be.an('array').with.lengthOf(mockPollingUnits.length);
      expect(response.body.data.pagination.page).to.equal(queryParams.page);
      expect(response.body.data.pagination.limit).to.equal(queryParams.limit);
      expect(response.body.data.pagination.total).to.equal(mockPagination.total);

      expect(listPUStub.calledOnceWith(sinon.match(queryParams))).to.be.true; // Check specific query args
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/v1/voter/polling-units');
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should handle invalid query parameters gracefully (e.g., non-numeric page)', async () => {
      const queryParams = { page: 'abc', limit: 'xyz' };
      // Assuming validation middleware handles this, resulting in a 400
      const response = await request(app)
        .get('/api/v1/voter/polling-units')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      // Expect 400 due to validation failure
      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Page must be an integer'))).to.be.true; // Adjust msg
      expect(response.body.errors.some(e => e.msg.includes('Limit must be an integer'))).to.be.true; // Adjust msg
    });

    it('should return 500 for unexpected errors', async () => {
      const error = new Error('DB query failed');
      const listPUStub = sandbox.stub(pollingUnitService, 'getAllPollingUnits').rejects(error);

      const response = await request(app)
        .get('/api/v1/voter/polling-units')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(listPUStub.calledOnce).to.be.true;
    });
  });

  describe('GET /polling-units/:id', () => {
    it('should get a specific polling unit by ID successfully', async () => {
      const pollingUnitId = 'pu-uuid-specific'; // Inline ID
      const expectedPollingUnit = { // Inline mock data
          id: pollingUnitId,
          pollingUnitCode: 'PU-SPECIFIC',
          pollingUnitName: 'Specific PU',
          lga: 'LGA-SPECIFIC',
          ward: 'Ward-SPECIFIC',
          state: 'State-SPECIFIC'
      };
      // IMPORTANT: Ensure 'getPollingUnitDetails' is correct
      const getPUStub = sandbox.stub(pollingUnitService, 'getPollingUnitDetails').resolves(expectedPollingUnit);

      const response = await request(app)
        .get(`/api/v1/voter/polling-units/${pollingUnitId}`) // Use backticks for interpolation
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Polling unit details retrieved successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.id).to.equal(expectedPollingUnit.id);
      expect(response.body.data.pollingUnitCode).to.equal(expectedPollingUnit.pollingUnitCode);
      expect(response.body.data.lga).to.equal(expectedPollingUnit.lga);
      // Avoid deep.equal, check specific fields

      expect(getPUStub.calledOnceWith(pollingUnitId)).to.be.true;
    });

    it('should return 400 for invalid polling unit ID format', async () => {
      const invalidId = 'not-a-uuid-or-valid-format';
      const response = await request(app)
        .get(`/api/v1/voter/polling-units/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      // Adjust error message based on your actual validation (e.g., UUID check)
      expect(response.body.errors.some(e => e.msg.includes('Polling Unit ID must be a valid UUID'))).to.be.true; 
    });

    it('should return 404 if polling unit ID not found', async () => {
      const pollingUnitId = 'pu-uuid-not-found'; // Inline ID
      const error = new Error('Polling unit not found.');
      error.status = 404;
      // IMPORTANT: Ensure 'getPollingUnitDetails' is correct
      const getPUStub = sandbox.stub(pollingUnitService, 'getPollingUnitDetails').rejects(error);
      // Or: sandbox.stub(pollingUnitService, 'getPollingUnitDetails').resolves(null);

      const response = await request(app)
        .get(`/api/v1/voter/polling-units/${pollingUnitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);

      expect(getPUStub.calledOnceWith(pollingUnitId)).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const pollingUnitId = 'pu-uuid-specific'; // Inline ID
      const response = await request(app).get(`/api/v1/voter/polling-units/${pollingUnitId}`);
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected errors', async () => {
      const pollingUnitId = 'pu-uuid-specific'; // Inline ID
      const error = new Error('Server error');
      const getPUStub = sandbox.stub(pollingUnitService, 'getPollingUnitDetails').rejects(error);

      const response = await request(app)
        .get(`/api/v1/voter/polling-units/${pollingUnitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(getPUStub.calledOnce).to.be.true;
    });
  });

  describe('GET /polling-units/nearby', () => {
    it('should get nearby polling units successfully', async () => {
      const queryParams = { latitude: 6.5244, longitude: 3.3792, radius: 5 }; // Inline query data, e.g., Lagos coords
      const mockPollingUnits = [ // Inline mock response
          { id: 'nearby-pu-1', pollingUnitCode: 'PU-NEAR1', distance: 1.2, latitude: 6.525, longitude: 3.38 },
          { id: 'nearby-pu-2', pollingUnitCode: 'PU-NEAR2', distance: 3.5, latitude: 6.520, longitude: 3.37 }
      ];
      const expectedResult = { units: mockPollingUnits, total: mockPollingUnits.length }; // Service might return simple array or object
      // IMPORTANT: Ensure 'findNearbyPollingUnits' is correct
      const nearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').resolves(expectedResult); // Resolving with object containing units array

      const response = await request(app)
        .get('/api/v1/voter/polling-units/nearby')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Nearby polling units retrieved successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.units).to.be.an('array').with.lengthOf(mockPollingUnits.length);
      expect(response.body.data.units[0].id).to.equal(mockPollingUnits[0].id);
      expect(response.body.data.units[0].distance).to.equal(mockPollingUnits[0].distance);
      // Assuming service returns the structure { units: [], total: X }
      expect(response.body.data.total).to.equal(mockPollingUnits.length);

      expect(
        nearbyStub.calledOnceWith(
          queryParams.latitude,
          queryParams.longitude,
          queryParams.radius || sinon.match.number, // Use provided radius or default
          sinon.match.number // Check for default limit if applicable
        ),
      ).to.be.true;
    });

    it('should return 400 if latitude or longitude is missing', async () => {
      const invalidParams = { longitude: 3.3792 }; // Missing latitude
      const response = await request(app)
        .get('/api/v1/voter/polling-units/nearby')
        .query(invalidParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Latitude is required'))).to.be.true;
    });

    it('should return 400 if latitude or longitude is not a valid number', async () => {
      const invalidParams = { latitude: 6.5244, longitude: 'not-a-longitude' }; // Invalid longitude
      const response = await request(app)
        .get('/api/v1/voter/polling-units/nearby')
        .query(invalidParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Longitude must be a valid number'))).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const queryParams = { latitude: 6.5244, longitude: 3.3792 };
      const response = await request(app)
        .get('/api/v1/voter/polling-units/nearby')
        .query(queryParams);
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected errors', async () => {
      const queryParams = { latitude: 6.5244, longitude: 3.3792 };
      const error = new Error('Geolocation query failed');
      const nearbyStub = sandbox.stub(pollingUnitService, 'findNearbyPollingUnits').rejects(error);

      const response = await request(app)
        .get('/api/v1/voter/polling-units/nearby')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(nearbyStub.calledOnce).to.be.true;
    });
  });

  // --- Voting History Route ---
  describe('GET /voting-history', () => {
    it("should get the voter's voting history successfully with default pagination", async () => {
      // Inline mock data
      const mockHistory = [
          { voteId: 'v-1', electionId: 'e-1', electionName: 'Election 1', candidateId: 'c-1', timestamp: new Date().toISOString() },
          { voteId: 'v-2', electionId: 'e-2', electionName: 'Election 2', candidateId: 'c-2', timestamp: new Date().toISOString() },
      ];
      const mockPagination = { total: 2, page: 1, limit: 20, totalPages: 1 }; // Default limit
      const expectedHistory = { votes: mockHistory, pagination: mockPagination };
      // IMPORTANT: Ensure 'getVoterVotingHistory' is correct
      const historyStub = sandbox.stub(voterService, 'getVoterVotingHistory').resolves(expectedHistory);
      const defaultQuery = { page: 1, limit: 20 }; // Assume defaults

      const response = await request(app)
        .get('/api/v1/voter/voting-history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Voting history retrieved successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.votes).to.be.an('array').with.lengthOf(mockHistory.length);
      expect(response.body.data.votes[0].voteId).to.equal(mockHistory[0].voteId);
      expect(response.body.data.votes[0].electionName).to.equal(mockHistory[0].electionName);
      expect(response.body.data.pagination).to.deep.equal(mockPagination);

      expect(historyStub.calledOnceWith(userIdFromToken, sinon.match(defaultQuery))).to.be.true;
    });

    it('should get voting history with specific pagination', async () => {
      const queryParams = { page: 2, limit: 5 }; // Inline query
      const mockHistory = [ // Inline mock data for page 2
          { voteId: 'v-6', electionId: 'e-6', electionName: 'Election 6', candidateId: 'c-6', timestamp: new Date().toISOString() }
      ];
      const mockPagination = { total: 6, page: 2, limit: 5, totalPages: 2 };
      const expectedHistory = { votes: mockHistory, pagination: mockPagination };
      // IMPORTANT: Ensure 'getVoterVotingHistory' is correct
      const historyStub = sandbox.stub(voterService, 'getVoterVotingHistory').resolves(expectedHistory);

      const response = await request(app)
        .get('/api/v1/voter/voting-history')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.exist;
      expect(response.body.data.votes).to.be.an('array').with.lengthOf(mockHistory.length);
      expect(response.body.data.pagination.page).to.equal(queryParams.page);
      expect(response.body.data.pagination.limit).to.equal(queryParams.limit);
      expect(response.body.data.pagination.total).to.equal(mockPagination.total);

      expect(historyStub.calledOnceWith(userIdFromToken, sinon.match(queryParams))).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/v1/voter/voting-history');
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected errors', async () => {
      const error = new Error('DB Error accessing history');
      const historyStub = sandbox.stub(voterService, 'getVoterVotingHistory').rejects(error);

      const response = await request(app)
        .get('/api/v1/voter/voting-history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(historyStub.calledOnce).to.be.true;
    });
  });

  // --- Eligibility Check Route ---
  describe('GET /eligibility/:electionId', () => {
    it('should confirm voter is eligible for a specific election', async () => {
      const electionId = 'election-eligible-uuid'; // Inline ID
      const expectedEligibility = { eligible: true, reason: null }; // Inline result
      // IMPORTANT: Ensure 'checkVoterEligibility' is correct
      const eligibilityStub = sandbox.stub(voterService, 'checkVoterEligibility').resolves(expectedEligibility);

      const response = await request(app)
        .get(`/api/v1/voter/eligibility/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Eligibility check successful.');
      expect(response.body.data).to.exist;
      expect(response.body.data.eligible).to.be.true;
      expect(response.body.data.reason).to.be.null;

      expect(eligibilityStub.calledOnceWith(userIdFromToken, electionId)).to.be.true;
    });

    it('should confirm voter is ineligible for a specific election with a reason', async () => {
      const electionId = 'election-ineligible-uuid'; // Inline ID
      const expectedEligibility = { // Inline result
        eligible: false,
        reason: 'Voter not registered in the required LGA.',
      };
      // IMPORTANT: Ensure 'checkVoterEligibility' is correct
      const eligibilityStub = sandbox.stub(voterService, 'checkVoterEligibility').resolves(expectedEligibility);

      const response = await request(app)
        .get(`/api/v1/voter/eligibility/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200); // Still 200, but data indicates ineligibility
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Eligibility check successful.');
      expect(response.body.data).to.exist;
      expect(response.body.data.eligible).to.be.false;
      expect(response.body.data.reason).to.equal(expectedEligibility.reason);

      expect(eligibilityStub.calledOnceWith(userIdFromToken, electionId)).to.be.true;
    });

    it('should return 400 for invalid election ID format', async () => {
      const invalidElectionId = 'not-a-uuid-format';
      const response = await request(app)
        .get(`/api/v1/voter/eligibility/${invalidElectionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Election ID must be a valid UUID'))).to.be.true; // Adjust msg
    });

    it('should return 404 if election ID not found', async () => {
      const electionId = 'election-not-found-uuid'; // Inline ID
      const error = new Error('Election not found.');
      error.status = 404;
      const eligibilityStub = sandbox.stub(voterService, 'checkVoterEligibility').rejects(error);

      const response = await request(app)
        .get(`/api/v1/voter/eligibility/${electionId}`) 
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(eligibilityStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const electionId = 'election-eligible-uuid';
      const response = await request(app).get(`/api/v1/voter/eligibility/${electionId}`);
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected errors', async () => {
      const electionId = 'election-eligible-uuid';
      const error = new Error('Eligibility check failed in service');
      const eligibilityStub = sandbox.stub(voterService, 'checkVoterEligibility').rejects(error);

      const response = await request(app)
        .get(`/api/v1/voter/eligibility/${electionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(eligibilityStub.calledOnce).to.be.true;
    });
  });

  // --- Identity Verification Routes ---
  describe('POST /verify-identity', () => {
    it('should initiate identity verification successfully (e.g., send OTP)', async () => {
      // Assuming this might need an election context or verification method
      const verificationData = { method: 'SMS', context: { electionId: 'e-verify-1' } }; // Inline data
      const expectedResult = { // Inline result
        message: 'Identity verification process initiated. Check your registered SMS number.',
        verificationId: 'verify-session-uuid-123' // Optional: If service returns an ID
      };
      // IMPORTANT: Ensure 'initiateVerification' is correct
      const initiateStub = sandbox.stub(verificationService, 'initiateVerification').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/voter/verify-identity')
        .set('Authorization', `Bearer ${authToken}`)
        .send(verificationData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(expectedResult.message);
      // Check data if returned
      expect(response.body.data).to.exist;
      expect(response.body.data.verificationId).to.equal(expectedResult.verificationId);

      expect(initiateStub.calledOnceWith(userIdFromToken, verificationData)).to.be.true;
    });

    it('should return 400 if verification method is missing or invalid', async () => {
        const invalidData = { context: {} }; // Missing method
         const response = await request(app)
            .post('/api/v1/voter/verify-identity')
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidData);

        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Validation Error');
        expect(response.body.errors.some(e => e.msg.includes('Verification method is required'))).to.be.true; // Adjust msg
    });

    it('should return 400 if voter has already verified recently', async () => {
      const verificationData = { method: 'SMS' }; // Inline data
      const error = new Error('Identity already verified recently.');
      error.status = 400;
      const initiateStub = sandbox.stub(verificationService, 'initiateVerification').rejects(error);

      const response = await request(app)
        .post('/api/v1/voter/verify-identity')
        .set('Authorization', `Bearer ${authToken}`)
        .send(verificationData);

      expect(response.status).to.equal(400);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(initiateStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const verificationData = { method: 'SMS' };
      const response = await request(app)
        .post('/api/v1/voter/verify-identity')
        .send(verificationData);
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected errors', async () => {
      const verificationData = { method: 'SMS' };
      const error = new Error('OTP service failed');
      const initiateStub = sandbox.stub(verificationService, 'initiateVerification').rejects(error);

      const response = await request(app)
        .post('/api/v1/voter/verify-identity')
        .set('Authorization', `Bearer ${authToken}`)
        .send(verificationData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(initiateStub.calledOnce).to.be.true;
    });
  });

  describe('POST /verify-identity/confirm', () => {
    it('should confirm identity verification successfully with correct code', async () => {
      const confirmData = { code: '123456', verificationId: 'verify-session-uuid-123' }; // Inline data
      const expectedResult = { verified: true, message: 'Identity verified successfully.' }; // Inline result
      // IMPORTANT: Ensure 'confirmVerification' is correct
      const confirmStub = sandbox.stub(verificationService, 'confirmVerification').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/voter/verify-identity/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send(confirmData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(expectedResult.message);
      expect(response.body.data).to.exist;
      expect(response.body.data.verified).to.be.true; // Check specific confirmation data

      // Verify args passed to service
      expect(confirmStub.calledOnceWith(userIdFromToken, confirmData.code, confirmData.verificationId)).to.be.true;
    });

    it('should return 400 for missing verification code', async () => {
      const invalidData = { verificationId: 'verify-session-uuid-123' }; // Missing code
      const response = await request(app)
        .post('/api/v1/voter/verify-identity/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Verification code is required'))).to.be.true;
    });

    it('should return 400 for invalid or expired verification code', async () => {
      const confirmData = { code: 'expired-code', verificationId: 'verify-session-old' }; // Inline data
      const error = new Error('Invalid or expired verification code.');
      error.status = 400;
      const confirmStub = sandbox.stub(verificationService, 'confirmVerification').rejects(error);

      const response = await request(app)
        .post('/api/v1/voter/verify-identity/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send(confirmData);

      expect(response.status).to.equal(400);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(confirmStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const confirmData = { code: '123456' };
      const response = await request(app)
        .post('/api/v1/voter/verify-identity/confirm')
        .send(confirmData);
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected errors', async () => {
      const confirmData = { code: '123456' };
      const error = new Error('Verification check failed in service');
      const confirmStub = sandbox.stub(verificationService, 'confirmVerification').rejects(error);

      const response = await request(app)
        .post('/api/v1/voter/verify-identity/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send(confirmData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(confirmStub.calledOnce).to.be.true;
    });
  });

  // --- Notification Routes ---
  describe('GET /notifications', () => {
    it("should get the voter's notifications successfully with default pagination", async () => {
      // Inline mock data
      const mockNotifications = [
          { id: 'n-1', title: 'Election Reminder', message: 'Vote tomorrow!', read: false, createdAt: new Date().toISOString() },
          { id: 'n-2', title: 'Polling Unit Changed', message: 'Your PU is now PU002', read: true, createdAt: new Date().toISOString() },
      ];
      const mockPagination = { total: 2, page: 1, limit: 10, totalPages: 1 };
      const expectedNotifications = { notifications: mockNotifications, totalUnread: 1, pagination: mockPagination };
      // IMPORTANT: Ensure 'getUserNotifications' is correct
      const getNotifsStub = sandbox.stub(notificationService, 'getUserNotifications').resolves(expectedNotifications);
      const defaultQuery = { page: 1, limit: 10, status: 'all' }; // Example defaults

      const response = await request(app)
        .get('/api/v1/voter/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Notifications retrieved successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.notifications).to.be.an('array').with.lengthOf(mockNotifications.length);
      expect(response.body.data.notifications[0].id).to.equal(mockNotifications[0].id);
      expect(response.body.data.notifications[0].read).to.equal(mockNotifications[0].read);
      expect(response.body.data.totalUnread).to.equal(expectedNotifications.totalUnread);
      expect(response.body.data.pagination).to.deep.equal(mockPagination);

      expect(getNotifsStub.calledOnceWith(userIdFromToken, sinon.match(defaultQuery))).to.be.true;
    });

    it('should get only unread notifications with pagination', async () => {
      const queryParams = { status: 'unread', page: 1, limit: 5 }; // Inline query
      // Inline mock data
      const mockNotifications = [
          { id: 'n-3', title: 'New Election Added', message: '...', read: false, createdAt: new Date().toISOString() },
      ];
      const mockPagination = { total: 1, page: 1, limit: 5, totalPages: 1 };
      const expectedNotifications = { notifications: mockNotifications, totalUnread: 1, pagination: mockPagination };
      // IMPORTANT: Ensure 'getUserNotifications' is correct
      const getNotifsStub = sandbox.stub(notificationService, 'getUserNotifications').resolves(expectedNotifications);

      const response = await request(app)
        .get('/api/v1/voter/notifications')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.exist;
      expect(response.body.data.notifications).to.be.an('array').with.lengthOf(mockNotifications.length);
      expect(response.body.data.notifications.every(n => !n.read)).to.be.true; // Check if all returned are unread
      expect(response.body.data.pagination.page).to.equal(queryParams.page);
      expect(response.body.data.totalUnread).to.equal(expectedNotifications.totalUnread);

      expect(getNotifsStub.calledOnceWith(userIdFromToken, sinon.match(queryParams))).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/v1/voter/notifications');
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected errors', async () => {
      const error = new Error('Notification service down');
      const getNotifsStub = sandbox.stub(notificationService, 'getUserNotifications').rejects(error);

      const response = await request(app)
        .get('/api/v1/voter/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(getNotifsStub.calledOnce).to.be.true;
    });
  });

  describe('PUT /notifications/:notificationId/read', () => {
    it('should mark a notification as read successfully', async () => {
      const notificationId = 'notification-to-read-uuid'; // Inline ID
      const serviceResult = { success: true }; // Service might return simple object or void
      // IMPORTANT: Ensure 'markNotificationAsRead' is correct
      const markReadStub = sandbox.stub(notificationService, 'markNotificationAsRead').resolves(serviceResult);

      const response = await request(app)
        .put(`/api/v1/voter/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(); // No body usually needed

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Notification marked as read.');
      expect(response.body.data).to.not.exist; // Usually no data returned

      expect(markReadStub.calledOnceWith(userIdFromToken, notificationId)).to.be.true;
    });

    it('should return 400 for invalid notification ID format', async () => {
      const invalidId = 'not-a-uuid-format';
      const response = await request(app)
        .put(`/api/v1/voter/notifications/${invalidId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Notification ID must be a valid UUID'))).to.be.true; // Adjust msg
    });

    it('should return 404 if notification not found or does not belong to user', async () => {
      const notificationId = 'not-found-notification-uuid'; // Inline ID
      const error = new Error('Notification not found or access denied.');
      error.status = 404;
      const markReadStub = sandbox.stub(notificationService, 'markNotificationAsRead').rejects(error);

      const response = await request(app)
        .put(`/api/v1/voter/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).to.equal(404);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(markReadStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const notificationId = 'notification-to-read-uuid';
      const response = await request(app)
        .put(`/api/v1/voter/notifications/${notificationId}/read`)
        .send();
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected errors', async () => {
      const notificationId = 'notification-to-read-uuid';
      const error = new Error('DB update failed for notification read status');
      const markReadStub = sandbox.stub(notificationService, 'markNotificationAsRead').rejects(error);

      const response = await request(app)
        .put(`/api/v1/voter/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(markReadStub.calledOnce).to.be.true;
    });
  });
}); // End main describe block for Voter Routes
