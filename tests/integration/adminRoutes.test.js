// tests/integration/adminRoutes.test.js
import request from 'supertest';
import { expect } from 'chai';
import sinon from 'sinon';
import { app } from '../../src/app'; // Assuming your Express app is exported from here
import { UserRole } from '../../src/types';
import { generateTestToken } from '../utils/authTestUtils'; // Helper to generate tokens
import { testData } from '../utils/testData'; // Your test data source
import * as systemAdminService from '../../src/services/adminService'; // Assuming service layer exists
import * as auditLogService from '../../src/services/auditService'; // For audit log tests later
import * as electoralCommissionerService from '../../src/services/admin/electoralCommissionerService'; // Assuming service exists
import * as securityOfficerService from '../../src/services/admin/securityOfficerService'; // Assuming service exists
import * as resultVerificationService from '../../src/services/admin/resultVerificationService'; // Assuming service exists
import * as voterVerificationService from '../../src/services/voterVerificationService'; // Or wherever the controller methods' logic resides
// Import other necessary services as needed...

// Use inline data or focused mock objects
const MOCK_ADMIN_USER_1 = { id: 'admin-1', email: 'admin1@test.com', role: UserRole.SYSTEM_ADMIN, status: 'active' };
const MOCK_ADMIN_USER_2 = { id: 'admin-2', email: 'auditor1@test.com', role: UserRole.SYSTEM_AUDITOR, status: 'active' };

describe('Admin Routes Integration Tests (/api/v1/admin)', () => {
  let sandbox;
  let systemAdminToken;
  let auditorToken;
  let commissionerToken;
  let securityOfficerToken;
  let resultVerifierToken;
  let voterRegOfficerToken;
  let regularUserToken;

  before(() => {
    // Generate tokens for different roles before all tests run
    systemAdminToken = generateTestToken({ userId: 'sysadmin-id', role: UserRole.SYSTEM_ADMIN });
    auditorToken = generateTestToken({ userId: 'auditor-id', role: UserRole.SYSTEM_AUDITOR });
    commissionerToken = generateTestToken({ userId: 'comm-id', role: UserRole.ELECTORAL_COMMISSIONER });
    securityOfficerToken = generateTestToken({ userId: 'sec-id', role: UserRole.SECURITY_OFFICER });
    regularUserToken = generateTestToken({ userId: 'voter-id', role: UserRole.VOTER });
    // Add new tokens
    resultVerifierToken = generateTestToken({ userId: 'verifier-id', role: UserRole.RESULT_VERIFICATION_OFFICER });
    voterRegOfficerToken = generateTestToken({ userId: 'reg-id', role: UserRole.VOTER_REGISTRATION_OFFICER });
  });

  beforeEach(() => {
    // Create a sandbox for stubbing service methods
    sandbox = sinon.createSandbox();
    // Potentially stub common middleware or services if needed globally
  });

  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });

  // --- System Admin: User Management ---
  describe('GET /users (System Admin)', () => {
    it('should list admin users successfully with default pagination', async () => {
      const expectedUsers = [MOCK_ADMIN_USER_1, MOCK_ADMIN_USER_2];
      const expectedPagination = { total: 2, page: 1, limit: 50, totalPages: 1 }; 
      // IMPORTANT: Ensure 'getUsers' is the correct function name in adminService
      const listUsersStub = sandbox.stub(systemAdminService, 'getUsers').resolves({
          users: expectedUsers,
          pagination: expectedPagination
      });

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array').with.lengthOf(expectedUsers.length);
      // Check key properties of the first user
      expect(response.body.data[0].id).to.equal(expectedUsers[0].id);
      expect(response.body.data[0].email).to.equal(expectedUsers[0].email);
      expect(response.body.pagination).to.deep.equal(expectedPagination); // Deep equal ok for pagination object
      
      // Verify service called with default/empty filters and pagination
       expect(listUsersStub.calledOnceWith(
           sinon.match.object, // Allow any filter object (including empty)
           sinon.match({ page: 1, limit: 50 }) // Default pagination
       )).to.be.true;
    });

     it('should list admin users successfully with filters and pagination', async () => {
        const queryParams = { role: UserRole.SYSTEM_AUDITOR, status: 'active', page: 2, limit: 10 }; 
        const expectedUsers = [MOCK_ADMIN_USER_2]; // Example filtered data
        const expectedPagination = { total: 1, page: 2, limit: 10, totalPages: 1 }; 
        // IMPORTANT: Ensure 'getUsers' is correct
        const listUsersStub = sandbox.stub(systemAdminService, 'getUsers').resolves({
            users: expectedUsers,
            pagination: expectedPagination
        });

        const response = await request(app)
            .get('/api/v1/admin/users')
            .query(queryParams)
            .set('Authorization', `Bearer ${systemAdminToken}`);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.be.an('array').with.lengthOf(1);
        expect(response.body.data[0].id).to.equal(MOCK_ADMIN_USER_2.id);
        expect(response.body.pagination).to.deep.equal(expectedPagination);
        
        // Verify service called with specific filters and pagination
        expect(listUsersStub.calledOnceWith(
            sinon.match({ role: queryParams.role, status: queryParams.status }), // Match filters
            sinon.match({ page: queryParams.page, limit: queryParams.limit })  // Match pagination
        )).to.be.true;
     });

    it('should return 400 for invalid pagination parameters (e.g., limit > 100)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ limit: 200 }) // Invalid limit
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Limit must be between 1 and 100'))).to.be.true; // Adjust msg
    });

    it('should return 400 for invalid status filter', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ status: 'pending' }) // Invalid status
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Status must be one of'))).to.be.true; // Adjust msg
    });

    it('should return 403 if accessed by non-System Admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${auditorToken}`); // Use Auditor token

      expect(response.status).to.equal(403);
       expect(response.body.success).to.be.false;
       expect(response.body.message).to.contain('Forbidden'); // Match middleware message
    });

     it('should return 401 if not authenticated', async () => {
        const response = await request(app).get('/api/v1/admin/users');
        expect(response.status).to.equal(401);
     });

     it('should return 500 for unexpected service errors', async () => {
        const serverError = new Error("Database connection error");
        // IMPORTANT: Ensure 'getUsers' is correct
        const listUsersStub = sandbox.stub(systemAdminService, 'getUsers').rejects(serverError);

        const response = await request(app)
            .get('/api/v1/admin/users')
            .set('Authorization', `Bearer ${systemAdminToken}`);

        expect(response.status).to.equal(500);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Internal Server Error');
        expect(listUsersStub.calledOnce).to.be.true;
     });
  });

  describe('POST /users (System Admin)', () => {
      it('should create a new admin user successfully', async () => {
          const newUserDetails = { 
              email: 'new.sec.officer@test.com', 
              fullName: 'New Security', 
              password: 'StrongPass123!', 
              role: UserRole.SECURITY_OFFICER, 
              phoneNumber: '08099887766'
          }; 
          const createdUser = { id: 'new-admin-uuid', ...newUserDetails };
          delete createdUser.password; // Password should not be returned
          // IMPORTANT: Ensure 'createAdminUser' is correct
          const createUserStub = sandbox.stub(systemAdminService, 'createAdminUser').resolves(createdUser);

          const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(newUserDetails);

          expect(response.status).to.equal(201);
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.contain('Admin user created successfully');
          expect(response.body.data).to.exist;
          expect(response.body.data.id).to.equal(createdUser.id);
          expect(response.body.data.email).to.equal(createdUser.email);
          expect(response.body.data.role).to.equal(createdUser.role);
          expect(response.body.data.password).to.be.undefined; // Ensure password is not returned

          expect(createUserStub.calledOnceWith(newUserDetails)).to.be.true;
      });

      it('should return 400 for missing required fields (e.g., email)', async () => {
          const invalidDetails = { fullName: 'No Email', password: 'Pass!1', role: UserRole.SYSTEM_AUDITOR }; // Missing email
          const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

          expect(response.status).to.equal(400);
          expect(response.body.success).to.be.false;
          expect(response.body.message).to.equal('Validation Error');
          expect(response.body.errors.some(e => e.msg.includes('Email is required'))).to.be.true;
      });

      it('should return 400 for invalid email format', async () => {
           const invalidDetails = { email: 'not-an-email', fullName: 'Bad Email', password: 'Pass!1', role: UserRole.SYSTEM_AUDITOR };
            const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

           expect(response.status).to.equal(400);
            expect(response.body.success).to.be.false;
            expect(response.body.errors.some(e => e.msg.includes('Provide a valid email address'))).to.be.true;
      });

       it('should return 400 for invalid phone number format', async () => {
           const invalidDetails = { email: 'phone@test.com', fullName: 'Bad Phone', password: 'Pass!1', role: UserRole.SYSTEM_AUDITOR, phoneNumber: '123' };
            const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

           expect(response.status).to.equal(400);
            expect(response.body.success).to.be.false;
            expect(response.body.errors.some(e => e.msg.includes('Provide a valid phone number'))).to.be.true;
      });

      it('should return 400 for weak password', async () => {
          const invalidDetails = { email: 'weak@test.com', fullName: 'Weak Pass', password: 'weak', role: UserRole.SYSTEM_AUDITOR };
           const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

          expect(response.status).to.equal(400);
          expect(response.body.success).to.be.false;
          expect(response.body.errors.some(e => e.msg.includes('Password must be at least 8 characters'))).to.be.true;
      });

       it('should return 400 for invalid admin role', async () => {
           const invalidDetails = { email: 'invalid@test.com', fullName: 'Invalid Role', password: 'Pass!1', role: 'InvalidRole' };
           const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

           expect(response.status).to.equal(400);
           expect(response.body.success).to.be.false;
           expect(response.body.errors.some(e => e.msg.includes('Invalid admin role'))).to.be.true;
       });

      it('should return 409 if user email already exists', async () => {
          const newUserDetails = { email: 'existing@test.com', fullName: 'Exists Already', password: 'Pass!1', role: UserRole.SYSTEM_AUDITOR };
           const conflictError = new Error('User with this email already exists');
           conflictError.status = 409;
           conflictError.code = 'EMAIL_ALREADY_EXISTS';
           // IMPORTANT: Ensure 'createAdminUser' is correct
          const createUserStub = sandbox.stub(systemAdminService, 'createAdminUser').rejects(conflictError);

          const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(newUserDetails);

          expect(response.status).to.equal(409);
          expect(response.body.success).to.be.false;
          expect(response.body.message).to.equal(conflictError.message);
          expect(createUserStub.calledOnce).to.be.true;
      });

      it('should return 403 if accessed by non-System Admin', async () => {
          const newUserDetails = { email: 'comm@test.com', fullName: 'Comm User', password: 'Pass!1', role: UserRole.ELECTORAL_COMMISSIONER };
          const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${commissionerToken}`) // Use Commissioner token
              .send(newUserDetails);

          expect(response.status).to.equal(403);
          expect(response.body.success).to.be.false;
          expect(response.body.message).to.contain('Forbidden');
      });

      it('should return 401 if not authenticated', async () => {
          const newUserDetails = { email: 'noauth@test.com', fullName: 'No Auth', password: 'Pass!1', role: UserRole.SYSTEM_AUDITOR };
          const response = await request(app).post('/api/v1/admin/users').send(newUserDetails);

          expect(response.status).to.equal(401);
      });

      it('should return 500 for unexpected errors', async () => {
           const newUserDetails = { email: 'error@test.com', fullName: 'Error User', password: 'Pass!1', role: UserRole.SYSTEM_AUDITOR };
           const error = new Error("Failed to save user");
           const createUserStub = sandbox.stub(systemAdminService, 'createAdminUser').rejects(error);

           const response = await request(app)
               .post('/api/v1/admin/users')
               .set('Authorization', `Bearer ${systemAdminToken}`)
               .send(newUserDetails);

           expect(response.status).to.equal(500);
           expect(createUserStub.calledOnce).to.be.true;
      });
  });

  // --- System Admin: Get/Update/Delete User Details ---
  describe('GET /users/:userId (System Admin)', () => {
    it('should get admin user details successfully', async () => {
      const targetUserId = MOCK_ADMIN_USER_2.id; // Use mock user ID
      const expectedUser = { ...MOCK_ADMIN_USER_2 }; // Use mock user data
      delete expectedUser.password; // Ensure password isn't expected
      // IMPORTANT: Ensure 'getAdminUserDetails' is correct function name
      const getUserStub = sandbox.stub(systemAdminService, 'getAdminUserDetails').resolves(expectedUser);

      const response = await request(app)
        .get(`/api/v1/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.contain('User details retrieved');
      expect(response.body.data).to.exist;
      expect(response.body.data.id).to.equal(expectedUser.id);
      expect(response.body.data.email).to.equal(expectedUser.email);
      expect(response.body.data.role).to.equal(expectedUser.role);
      expect(response.body.data.password).to.be.undefined;
      // Avoid deep.equal

      expect(getUserStub.calledOnceWith(targetUserId)).to.be.true;
    });

    it('should return 400 for invalid userId format', async () => {
      const invalidUserId = 'not-a-uuid';
      const response = await request(app)
        .get(`/api/v1/admin/users/${invalidUserId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('User ID must be a valid UUID'))).to.be.true;
    });

    it('should return 404 if user not found', async () => {
      const nonExistentUserId = 'admin-user-not-found-uuid';
      const error = new Error('Admin user not found');
      error.status = 404;
      // IMPORTANT: Ensure 'getAdminUserDetails' is correct
      const getUserStub = sandbox.stub(systemAdminService, 'getAdminUserDetails').rejects(error);

      const response = await request(app)
        .get(`/api/v1/admin/users/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).to.equal(404);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(getUserStub.calledOnce).to.be.true;
    });

    it('should return 403 if accessed by non-System Admin', async () => {
      const targetUserId = MOCK_ADMIN_USER_2.id;
      const response = await request(app)
        .get(`/api/v1/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${auditorToken}`); // Use Auditor token

      expect(response.status).to.equal(403);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.contain('Forbidden');
    });

    it('should return 401 if not authenticated', async () => {
        const targetUserId = MOCK_ADMIN_USER_2.id;
        const response = await request(app).get(`/api/v1/admin/users/${targetUserId}`);
        expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors', async () => {
        const targetUserId = MOCK_ADMIN_USER_2.id;
        const error = new Error("DB error fetching user");
        const getUserStub = sandbox.stub(systemAdminService, 'getAdminUserDetails').rejects(error);

         const response = await request(app)
            .get(`/api/v1/admin/users/${targetUserId}`)
            .set('Authorization', `Bearer ${systemAdminToken}`);

        expect(response.status).to.equal(500);
        expect(getUserStub.calledOnce).to.be.true;
    });
  });

  describe('PUT /users/:userId (System Admin)', () => {
    it('should update admin user details successfully', async () => {
      const targetUserId = MOCK_ADMIN_USER_2.id;
      const updateData = { fullName: 'Updated Auditor Name', status: 'inactive' }; // Inline update data
      const updatedUser = { ...MOCK_ADMIN_USER_2, ...updateData }; // Expected result
      delete updatedUser.password;
      // IMPORTANT: Ensure 'updateAdminUser' is correct
      const updateUserStub = sandbox.stub(systemAdminService, 'updateAdminUser').resolves(updatedUser);

      const response = await request(app)
        .put(`/api/v1/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(updateData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.contain('Admin user updated');
      expect(response.body.data).to.exist;
      expect(response.body.data.id).to.equal(targetUserId);
      expect(response.body.data.fullName).to.equal(updateData.fullName);
      expect(response.body.data.status).to.equal(updateData.status);
      expect(response.body.data.password).to.be.undefined;
      // Avoid deep.equal

      expect(updateUserStub.calledOnceWith(targetUserId, updateData)).to.be.true;
    });

    it('should return 400 for invalid update data (e.g., invalid status)', async () => {
      const targetUserId = MOCK_ADMIN_USER_2.id;
      const invalidUpdateData = { status: 'pending' }; // Invalid status
      const response = await request(app)
        .put(`/api/v1/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(invalidUpdateData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Status must be one of: active, inactive'))).to.be.true; // Adjust msg
    });

    it('should return 400 for attempting to update immutable fields (e.g., email)', async () => {
        const targetUserId = MOCK_ADMIN_USER_2.id;
        const invalidUpdateData = { email: 'trying.to.change@test.com' };
        const response = await request(app)
            .put(`/api/v1/admin/users/${targetUserId}`)
            .set('Authorization', `Bearer ${systemAdminToken}`)
            .send(invalidUpdateData);

        expect(response.status).to.equal(400);
        // Assuming validation prevents email updates
        expect(response.body.errors.some(e => e.msg.includes('Email cannot be updated') || e.param === 'email')).to.be.true; 
    });

    it('should return 404 if user to update not found', async () => {
       const nonExistentUserId = 'admin-user-not-found-uuid';
       const updateData = { status: 'active' };
       const error = new Error('Admin user not found');
       error.status = 404;
       // IMPORTANT: Ensure 'updateAdminUser' is correct
       const updateUserStub = sandbox.stub(systemAdminService, 'updateAdminUser').rejects(error);

        const response = await request(app)
            .put(`/api/v1/admin/users/${nonExistentUserId}`)
            .set('Authorization', `Bearer ${systemAdminToken}`)
            .send(updateData);

       expect(response.status).to.equal(404);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal(error.message);
       expect(updateUserStub.calledOnce).to.be.true;
    });

    it('should return 403 if accessed by non-System Admin', async () => {
        const targetUserId = MOCK_ADMIN_USER_2.id;
        const updateData = { status: 'active' };
         const response = await request(app)
            .put(`/api/v1/admin/users/${targetUserId}`)
            .set('Authorization', `Bearer ${auditorToken}`)
            .send(updateData);
        expect(response.status).to.equal(403);
    });

    it('should return 401 if not authenticated', async () => {
        const targetUserId = MOCK_ADMIN_USER_2.id;
        const updateData = { status: 'active' };
        const response = await request(app)
            .put(`/api/v1/admin/users/${targetUserId}`)
            .send(updateData);
        expect(response.status).to.equal(401);
    });

     it('should return 500 for unexpected errors during update', async () => {
        const targetUserId = MOCK_ADMIN_USER_2.id;
        const updateData = { status: 'inactive' };
        const error = new Error("DB error updating user");
        const updateUserStub = sandbox.stub(systemAdminService, 'updateAdminUser').rejects(error);

        const response = await request(app)
            .put(`/api/v1/admin/users/${targetUserId}`)
            .set('Authorization', `Bearer ${systemAdminToken}`)
            .send(updateData);

        expect(response.status).to.equal(500);
        expect(updateUserStub.calledOnce).to.be.true;
    });
  });

  describe('DELETE /users/:userId (System Admin)', () => {
    it('should delete admin user successfully', async () => {
      const targetUserId = 'admin-user-to-delete-uuid';
      // Service might resolve void or a success message object
      const serviceResult = { message: 'Admin user deleted successfully.' };
      // IMPORTANT: Ensure 'deleteAdminUser' is correct function name
      const deleteUserStub = sandbox.stub(systemAdminService, 'deleteAdminUser').resolves(serviceResult);

      const response = await request(app)
        .delete(`/api/v1/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);

      // Expect 204 No Content or 200 OK with message
      expect([200, 204]).to.include(response.status);
      if (response.status === 200) {
        expect(response.body.success).to.be.true;
        expect(response.body.message).to.equal(serviceResult.message);
      }

      expect(deleteUserStub.calledOnceWith(targetUserId)).to.be.true;
    });

     it('should return 400 for invalid userId format', async () => {
       const invalidUserId = 'not-a-uuid';
       const response = await request(app)
        .delete(`/api/v1/admin/users/${invalidUserId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`);
       expect(response.status).to.equal(400);
     });

    it('should return 404 if user to delete not found', async () => {
       const nonExistentUserId = 'admin-user-not-found-uuid';
       const error = new Error('Admin user not found');
       error.status = 404;
       // IMPORTANT: Ensure 'deleteAdminUser' is correct
       const deleteUserStub = sandbox.stub(systemAdminService, 'deleteAdminUser').rejects(error);

        const response = await request(app)
            .delete(`/api/v1/admin/users/${nonExistentUserId}`)
            .set('Authorization', `Bearer ${systemAdminToken}`);

       expect(response.status).to.equal(404);
       expect(response.body.success).to.be.false;
       expect(response.body.message).to.equal(error.message);
       expect(deleteUserStub.calledOnce).to.be.true;
    });

    it('should return 403 if accessed by non-System Admin', async () => {
        const targetUserId = 'admin-user-to-delete-uuid';
         const response = await request(app)
            .delete(`/api/v1/admin/users/${targetUserId}`)
            .set('Authorization', `Bearer ${auditorToken}`);
        expect(response.status).to.equal(403);
    });

     it('should return 401 if not authenticated', async () => {
        const targetUserId = 'admin-user-to-delete-uuid';
        const response = await request(app).delete(`/api/v1/admin/users/${targetUserId}`);
        expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors during deletion', async () => {
         const targetUserId = 'admin-user-to-delete-uuid';
         const error = new Error("DB error deleting user");
         const deleteUserStub = sandbox.stub(systemAdminService, 'deleteAdminUser').rejects(error);

         const response = await request(app)
            .delete(`/api/v1/admin/users/${targetUserId}`)
            .set('Authorization', `Bearer ${systemAdminToken}`);

         expect(response.status).to.equal(500);
         expect(deleteUserStub.calledOnce).to.be.true;
     });
  });

  // --- Audit Logs ---
  describe('GET /audit-logs', () => {
    const auditLogsEndpoint = '/api/v1/admin/audit-logs';

    it('should get audit logs successfully with default params (System Admin)', async () => {
        const expectedLogs = testData.adminRoutes[auditLogsEndpoint].get.successResponse.data;
        const expectedPagination = testData.adminRoutes[auditLogsEndpoint].get.successResponse.pagination;
        const getLogsStub = sandbox.stub(auditLogService, 'getAuditLogs').resolves({
            logs: expectedLogs,
            pagination: expectedPagination
        });

        const response = await request(app)
            .get(auditLogsEndpoint)
            .set('Authorization', `Bearer ${systemAdminToken}`);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.deep.equal(expectedLogs);
        expect(response.body.pagination).to.deep.equal(expectedPagination);
        expect(getLogsStub.calledOnceWith(
            sinon.match({}), // Empty filter
            sinon.match({ page: 1, limit: 50 }) // Default pagination
        )).to.be.true;
    });

    it('should get audit logs successfully with default params (System Auditor)', async () => {
         const getLogsStub = sandbox.stub(auditLogService, 'getAuditLogs').resolves({ logs: [], pagination: {} });
         const response = await request(app)
            .get(auditLogsEndpoint)
            .set('Authorization', `Bearer ${auditorToken}`);
        expect(response.status).to.equal(200);
        expect(getLogsStub.calledOnce).to.be.true;
    });

     it('should get audit logs successfully with default params (Security Officer)', async () => {
        const getLogsStub = sandbox.stub(auditLogService, 'getAuditLogs').resolves({ logs: [], pagination: {} });
        const response = await request(app)
            .get(auditLogsEndpoint)
            .set('Authorization', `Bearer ${securityOfficerToken}`); // Use the new token
        expect(response.status).to.equal(200);
        expect(getLogsStub.calledOnce).to.be.true;
     });

    it('should get audit logs successfully with filters and pagination', async () => {
        const queryParams = testData.adminRoutes[auditLogsEndpoint].get.queryParams.success; // { actionType: 'login', userId: 'uuid', startDate: '...', page: 1, limit: 20 }
        const expectedLogs = [{ actionType: 'login', userId: queryParams.userId }]; // Example
        const expectedPagination = { total: 1, page: 1, limit: 20, totalPages: 1 }; // Example
        const getLogsStub = sandbox.stub(auditLogService, 'getAuditLogs').resolves({
            logs: expectedLogs,
            pagination: expectedPagination
        });

        const response = await request(app)
            .get(auditLogsEndpoint)
            .query(queryParams)
            .set('Authorization', `Bearer ${auditorToken}`); // Auditor can filter

        expect(response.status).to.equal(200);
        expect(response.body.data).to.deep.equal(expectedLogs);
        expect(getLogsStub.calledOnceWith(
            sinon.match({
                actionType: queryParams.actionType,
                userId: queryParams.userId,
                startDate: queryParams.startDate,
                // endDate might be included if present in queryParams
            }),
            sinon.match({ page: queryParams.page, limit: queryParams.limit })
        )).to.be.true;
    });

     it('should return 400 for invalid actionType filter', async () => {
        const response = await request(app)
            .get(auditLogsEndpoint)
            .query({ actionType: 'invalid-action' })
            .set('Authorization', `Bearer ${systemAdminToken}`);

        expect(response.status).to.equal(400);
         expect(response.body.errors[0].msg).to.contain('Invalid action type');
     });

     it('should return 400 for invalid date format', async () => {
         const response = await request(app)
            .get(auditLogsEndpoint)
            .query({ startDate: 'not-a-date' })
            .set('Authorization', `Bearer ${systemAdminToken}`);

         expect(response.status).to.equal(400);
        expect(response.body.errors[0].msg).to.contain('Start date must be a valid ISO date');
     });

      it('should return 400 for invalid userId format (not UUID)', async () => {
         const response = await request(app)
            .get(auditLogsEndpoint)
            .query({ userId: 'not-a-uuid' })
            .set('Authorization', `Bearer ${systemAdminToken}`);

         expect(response.status).to.equal(400);
         expect(response.body.errors[0].msg).to.contain('User ID must be a valid UUID');
      });

      it('should return 400 for invalid pagination (limit too high)', async () => {
          const response = await request(app)
            .get(auditLogsEndpoint)
            .query({ limit: 150 })
            .set('Authorization', `Bearer ${systemAdminToken}`);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Limit must be between 1 and 100');
      });

      it('should return 403 if accessed by a non-permitted admin role (e.g., Commissioner)', async () => {
         const response = await request(app)
            .get(auditLogsEndpoint)
            .set('Authorization', `Bearer ${commissionerToken}`); // Use Commissioner token

         expect(response.status).to.equal(403);
         expect(response.body.message).to.contain('Insufficient permissions'); // Or similar forbidden message
      });

       it('should return 401 if not authenticated', async () => {
          const response = await request(app).get(auditLogsEndpoint);
          expect(response.status).to.equal(401);
      });

     it('should return 500 for unexpected errors', async () => {
        const error = new Error("Audit log service unavailable");
        const getLogsStub = sandbox.stub(auditLogService, 'getAuditLogs').rejects(error);

        const response = await request(app)
            .get(auditLogsEndpoint)
            .set('Authorization', `Bearer ${auditorToken}`);

        expect(response.status).to.equal(500);
        expect(getLogsStub.calledOnce).to.be.true;
     });
  });

  // --- Electoral Commissioner: Election Management ---
  describe('POST /elections (Electoral Commissioner)', () => {
      const electionsEndpoint = '/api/v1/admin/elections';

      it('should create a new election successfully (Commissioner)', async () => {
          const newElectionData = testData.adminRoutes[electionsEndpoint].post.requestBody.success;
          // Example: { name: 'General Election 2024', type: 'National', startDate: '...', endDate: '...' }
          const createdElection = { id: 'election-uuid-123', ...newElectionData };
          const createElectionStub = sandbox.stub(electoralCommissionerService, 'createElection').resolves(createdElection);

          const response = await request(app)
              .post(electionsEndpoint)
              .set('Authorization', `Bearer ${commissionerToken}`) // Use Commissioner token
              .send(newElectionData);

          expect(response.status).to.equal(201);
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.contain('Election created successfully');
          expect(response.body.data).to.deep.equal(createdElection);
          // Verify service called with user ID (creator) and election data
           expect(createElectionStub.calledOnceWith(sinon.match.string, newElectionData)).to.be.true;
      });

      it('should allow System Admin to create an election', async () => {
           const newElectionData = testData.adminRoutes[electionsEndpoint].post.requestBody.success;
           const createElectionStub = sandbox.stub(electoralCommissionerService, 'createElection').resolves({ id: 'election-uuid-456', ...newElectionData });

           const response = await request(app)
              .post(electionsEndpoint)
              .set('Authorization', `Bearer ${systemAdminToken}`) // Use System Admin token
              .send(newElectionData);

           expect(response.status).to.equal(201);
           expect(createElectionStub.calledOnce).to.be.true;
       });


      it('should return 400 for missing required fields (e.g., name)', async () => {
          const invalidData = { ...testData.adminRoutes[electionsEndpoint].post.requestBody.success, name: undefined };
          const response = await request(app)
              .post(electionsEndpoint)
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(invalidData);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Election name is required');
      });

       it('should return 400 for invalid date format (e.g., startDate)', async () => {
           const invalidData = { ...testData.adminRoutes[electionsEndpoint].post.requestBody.success, startDate: 'invalid-date' };
           const response = await request(app)
              .post(electionsEndpoint)
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(invalidData);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Start date must be a valid ISO date');
       });

        it('should return 400 if end date is before start date', async () => {
           const invalidData = testData.adminRoutes[electionsEndpoint].post.requestBody.invalidDates; // { startDate: '2024-12-01', endDate: '2024-11-01' }
           const response = await request(app)
              .post(electionsEndpoint)
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(invalidData);

           expect(response.status).to.equal(400);
            // Assuming a custom validator checks date order
            expect(response.body.errors[0].msg).to.contain('End date must be after start date');
        });

      it('should return 403 if accessed by a non-permitted admin role (e.g., Auditor)', async () => {
          const newElectionData = testData.adminRoutes[electionsEndpoint].post.requestBody.success;
          const response = await request(app)
              .post(electionsEndpoint)
              .set('Authorization', `Bearer ${auditorToken}`) // Use Auditor token
              .send(newElectionData);

          expect(response.status).to.equal(403);
           expect(response.body.message).to.contain('Insufficient permissions');
      });

      it('should return 401 if not authenticated', async () => {
           const newElectionData = testData.adminRoutes[electionsEndpoint].post.requestBody.success;
           const response = await request(app).post(electionsEndpoint).send(newElectionData);
           expect(response.status).to.equal(401);
      });

      it('should return 500 for unexpected errors', async () => {
           const newElectionData = testData.adminRoutes[electionsEndpoint].post.requestBody.success;
           const error = new Error("Failed to create election in DB");
           const createElectionStub = sandbox.stub(electoralCommissionerService, 'createElection').rejects(error);

           const response = await request(app)
               .post(electionsEndpoint)
               .set('Authorization', `Bearer ${commissionerToken}`)
               .send(newElectionData);

           expect(response.status).to.equal(500);
           expect(createElectionStub.calledOnce).to.be.true;
      });
  });

  // --- Electoral Commissioner: Update/Delete Election --- 
  describe('PUT /elections/:electionId (Commissioner/SysAdmin)', () => {
      const updateElectionEndpoint = (id) => `/api/v1/admin/elections/${id}`;
      const MOCK_ELECTION_ID_TO_UPDATE = 'election-to-update-uuid';

      it('should update an election successfully (Commissioner)', async () => {
          const updateData = { description: 'Updated election description', status: 'completed' }; // Inline data
          const updatedElection = { id: MOCK_ELECTION_ID_TO_UPDATE, name: 'Original Name', ...updateData }; // Mock result
          // IMPORTANT: Ensure 'updateElection' is correct
          const updateStub = sandbox.stub(electoralCommissionerService, 'updateElection').resolves(updatedElection);

          const response = await request(app)
              .put(updateElectionEndpoint(MOCK_ELECTION_ID_TO_UPDATE))
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(updateData);

          expect(response.status).to.equal(200);
          // REFINED assertions:
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.contain('Election updated successfully');
          expect(response.body.data).to.exist;
          expect(response.body.data.id).to.equal(MOCK_ELECTION_ID_TO_UPDATE);
          expect(response.body.data.description).to.equal(updateData.description);
          expect(response.body.data.status).to.equal(updateData.status);
          // Avoid deep.equal

          expect(updateStub.calledOnceWith(MOCK_ELECTION_ID_TO_UPDATE, updateData, sinon.match.string /* adminId */)).to.be.true;
      });

      it('should allow System Admin to update an election', async () => {
          const updateData = { status: 'cancelled' };
          const updateStub = sandbox.stub(electoralCommissionerService, 'updateElection').resolves({ id: MOCK_ELECTION_ID_TO_UPDATE, ...updateData });
          const response = await request(app)
              .put(updateElectionEndpoint(MOCK_ELECTION_ID_TO_UPDATE))
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(updateData);
          expect(response.status).to.equal(200);
          expect(updateStub.calledOnce).to.be.true;
      });

      it('should return 400 for invalid update data (e.g., invalid status)', async () => {
          const invalidData = { status: 'in_progress' };
          const response = await request(app)
              .put(updateElectionEndpoint(MOCK_ELECTION_ID_TO_UPDATE))
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(invalidData);
          expect(response.status).to.equal(400);
          expect(response.body.success).to.be.false;
          expect(response.body.message).to.equal('Validation Error');
          expect(response.body.errors.some(e => e.msg.includes('must be one of'))).to.be.true; // Adjust validator msg
      });

      it('should return 404 if election to update not found', async () => {
          const nonExistentId = 'election-not-found-uuid';
          const updateData = { description: 'New Desc' };
          const error = new Error('Election not found');
          error.status = 404;
          const updateStub = sandbox.stub(electoralCommissionerService, 'updateElection').rejects(error);

          const response = await request(app)
              .put(updateElectionEndpoint(nonExistentId))
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(updateData);

          expect(response.status).to.equal(404);
          expect(response.body.success).to.be.false;
          expect(response.body.message).to.equal(error.message);
          expect(updateStub.calledOnce).to.be.true;
      });

      it('should return 403 if accessed by a non-permitted role (e.g., Auditor)', async () => {
          const updateData = { description: 'Attempted Update' };
          const response = await request(app)
              .put(updateElectionEndpoint(MOCK_ELECTION_ID_TO_UPDATE))
              .set('Authorization', `Bearer ${auditorToken}`)
              .send(updateData);
          expect(response.status).to.equal(403);
      });

      it('should return 401 if not authenticated', async () => {
            const updateData = { description: 'Update' };
            const response = await request(app).put(updateElectionEndpoint(MOCK_ELECTION_ID_TO_UPDATE)).send(updateData);
            expect(response.status).to.equal(401);
      });

      it('should return 500 for unexpected errors', async () => {
            const updateData = { description: 'Update' };
            const error = new Error("DB error updating election");
            const updateStub = sandbox.stub(electoralCommissionerService, 'updateElection').rejects(error);

            const response = await request(app)
              .put(updateElectionEndpoint(MOCK_ELECTION_ID_TO_UPDATE))
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(updateData);

            expect(response.status).to.equal(500);
            expect(updateStub.calledOnce).to.be.true;
       });
  });

  describe('DELETE /elections/:electionId (Commissioner/SysAdmin)', () => {
        const deleteElectionEndpoint = (id) => `/api/v1/admin/elections/${id}`;
        const MOCK_ELECTION_ID_TO_DELETE = 'election-to-delete-uuid';

        it('should delete an election successfully (Commissioner)', async () => {
            const serviceResult = { message: 'Election deleted successfully.' };
            // IMPORTANT: Ensure 'deleteElection' is correct
            const deleteStub = sandbox.stub(electoralCommissionerService, 'deleteElection').resolves(serviceResult);

            const response = await request(app)
                .delete(deleteElectionEndpoint(MOCK_ELECTION_ID_TO_DELETE))
                .set('Authorization', `Bearer ${commissionerToken}`);

            expect([200, 204]).to.include(response.status); // Allow 200 or 204
            if (response.status === 200) {
                 expect(response.body.success).to.be.true;
                 expect(response.body.message).to.equal(serviceResult.message);
            }
            expect(deleteStub.calledOnceWith(MOCK_ELECTION_ID_TO_DELETE, sinon.match.string /* adminId */)).to.be.true;
        });

        it('should allow System Admin to delete an election', async () => {
            const deleteStub = sandbox.stub(electoralCommissionerService, 'deleteElection').resolves({});
            const response = await request(app)
                .delete(deleteElectionEndpoint(MOCK_ELECTION_ID_TO_DELETE))
                .set('Authorization', `Bearer ${systemAdminToken}`);
            expect([200, 204]).to.include(response.status);
            expect(deleteStub.calledOnce).to.be.true;
        });

        it('should return 404 if election to delete not found', async () => {
            const nonExistentId = 'election-not-found-uuid';
            const error = new Error('Election not found');
            error.status = 404;
            const deleteStub = sandbox.stub(electoralCommissionerService, 'deleteElection').rejects(error);

            const response = await request(app)
                .delete(deleteElectionEndpoint(nonExistentId))
                .set('Authorization', `Bearer ${commissionerToken}`);

            expect(response.status).to.equal(404);
            expect(response.body.success).to.be.false;
            expect(response.body.message).to.equal(error.message);
            expect(deleteStub.calledOnce).to.be.true;
        });

        // Add 400 test if deleting active/completed elections is forbidden
        it('should return 400 if trying to delete an active/completed election', async () => {
             const activeElectionId = 'active-election-id';
             const error = new Error('Cannot delete an active or completed election.');
             error.status = 400;
             const deleteStub = sandbox.stub(electoralCommissionerService, 'deleteElection').rejects(error);

             const response = await request(app)
                .delete(deleteElectionEndpoint(activeElectionId))
                .set('Authorization', `Bearer ${commissionerToken}`);

            expect(response.status).to.equal(400);
            expect(response.body.message).to.equal(error.message);
            expect(deleteStub.calledOnce).to.be.true;
        });

        it('should return 403 if accessed by a non-permitted role', async () => {
            const response = await request(app)
                .delete(deleteElectionEndpoint(MOCK_ELECTION_ID_TO_DELETE))
                .set('Authorization', `Bearer ${securityOfficerToken}`);
            expect(response.status).to.equal(403);
        });

        it('should return 401 if not authenticated', async () => {
            const response = await request(app).delete(deleteElectionEndpoint(MOCK_ELECTION_ID_TO_DELETE));
            expect(response.status).to.equal(401);
        });

        it('should return 500 for unexpected errors', async () => {
            const error = new Error("DB error deleting election");
            const deleteStub = sandbox.stub(electoralCommissionerService, 'deleteElection').rejects(error);
            const response = await request(app)
                .delete(deleteElectionEndpoint(MOCK_ELECTION_ID_TO_DELETE))
                .set('Authorization', `Bearer ${commissionerToken}`);
            expect(response.status).to.equal(500);
            expect(deleteStub.calledOnce).to.be.true;
        });
  });

  // --- Electoral Commissioner: Candidate Management --- 
  describe('POST /elections/:electionId/candidates (Commissioner/SysAdmin)', () => {
      const addCandidateEndpoint = (electionId) => `/api/v1/admin/elections/${electionId}/candidates`;
      const MOCK_ELECTION_ID_CANDIDATE = 'election-for-candidate-uuid';

      it('should add a candidate to an election successfully (Commissioner)', async () => {
          const candidateData = { name: 'Alice Candidate', party: 'Independent', bio: 'Bio here' }; // Inline data
          const createdCandidate = { id: 'cand-uuid-new', electionId: MOCK_ELECTION_ID_CANDIDATE, ...candidateData };
          // IMPORTANT: Ensure 'addCandidate' is correct
          const addStub = sandbox.stub(electoralCommissionerService, 'addCandidate').resolves(createdCandidate);

          const response = await request(app)
              .post(addCandidateEndpoint(MOCK_ELECTION_ID_CANDIDATE))
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(candidateData);

          expect(response.status).to.equal(201);
          // REFINED assertions:
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.contain('Candidate added successfully');
          expect(response.body.data).to.exist;
          expect(response.body.data.id).to.equal(createdCandidate.id);
          expect(response.body.data.name).to.equal(candidateData.name);
          expect(response.body.data.party).to.equal(candidateData.party);
          expect(response.body.data.electionId).to.equal(MOCK_ELECTION_ID_CANDIDATE);
          // Avoid deep.equal

          expect(addStub.calledOnceWith(MOCK_ELECTION_ID_CANDIDATE, candidateData, sinon.match.string /* adminId */)).to.be.true;
      });

      it('should allow System Admin to add a candidate', async () => {
            const candidateData = { name: 'Bob Candidate', party: 'New Party' };
            const addStub = sandbox.stub(electoralCommissionerService, 'addCandidate').resolves({ id: 'cand-uuid-new-2', ...candidateData });
            const response = await request(app)
                .post(addCandidateEndpoint(MOCK_ELECTION_ID_CANDIDATE))
                .set('Authorization', `Bearer ${systemAdminToken}`)
                .send(candidateData);
            expect(response.status).to.equal(201);
            expect(addStub.calledOnce).to.be.true;
      });

      it('should return 400 for missing required fields (e.g., name)', async () => {
           const invalidData = { party: 'Some Party' }; // Missing name
           const response = await request(app)
              .post(addCandidateEndpoint(MOCK_ELECTION_ID_CANDIDATE))
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(invalidData);
            expect(response.status).to.equal(400);
            expect(response.body.errors.some(e => e.msg.includes('Candidate name is required'))).to.be.true;
      });

      it('should return 404 if election not found', async () => {
            const nonExistentElectionId = 'election-not-found-uuid';
            const candidateData = { name: 'Charlie Candidate', party: 'Third Party' };
            const error = new Error('Election not found');
            error.status = 404;
            const addStub = sandbox.stub(electoralCommissionerService, 'addCandidate').rejects(error);

             const response = await request(app)
              .post(addCandidateEndpoint(nonExistentElectionId))
              .set('Authorization', `Bearer ${commissionerToken}`)
              .send(candidateData);

            expect(response.status).to.equal(404);
            expect(response.body.success).to.be.false;
            expect(response.body.message).to.equal(error.message);
            expect(addStub.calledOnce).to.be.true;
      });

      it('should return 403 if accessed by a non-permitted role (e.g., Security Officer)', async () => {
            const candidateData = { name: 'David Candidate', party: 'Secure Party' };
            const response = await request(app)
                .post(addCandidateEndpoint(MOCK_ELECTION_ID_CANDIDATE))
                .set('Authorization', `Bearer ${securityOfficerToken}`)
                .send(candidateData);
            expect(response.status).to.equal(403);
      });

       it('should return 401 if not authenticated', async () => {
            const candidateData = { name: 'Eve Candidate', party: 'Anon Party' };
            const response = await request(app).post(addCandidateEndpoint(MOCK_ELECTION_ID_CANDIDATE)).send(candidateData);
            expect(response.status).to.equal(401);
      });

       it('should return 500 for unexpected errors', async () => {
            const candidateData = { name: 'Frank Candidate', party: 'Error Party' };
            const error = new Error("DB error adding candidate");
            const addStub = sandbox.stub(electoralCommissionerService, 'addCandidate').rejects(error);

            const response = await request(app)
                .post(addCandidateEndpoint(MOCK_ELECTION_ID_CANDIDATE))
                .set('Authorization', `Bearer ${commissionerToken}`)
                .send(candidateData);

            expect(response.status).to.equal(500);
            expect(addStub.calledOnce).to.be.true;
      });
  });

  describe('PUT /elections/:electionId/candidates/:candidateId (Commissioner/SysAdmin)', () => {
        const updateCandidateEndpoint = (electionId, candidateId) => `/api/v1/admin/elections/${electionId}/candidates/${candidateId}`;
        const ELECTION_ID = 'election-for-candidate-update';
        const CANDIDATE_ID = 'candidate-to-update-uuid';

        it('should update a candidate successfully (Commissioner)', async () => {
            const updateData = { party: 'Updated Party Name', bio: 'Updated bio.' }; // Inline data
            const updatedCandidate = { id: CANDIDATE_ID, electionId: ELECTION_ID, name: 'Original Name', ...updateData };
            // IMPORTANT: Ensure 'updateCandidate' is correct
            const updateStub = sandbox.stub(electoralCommissionerService, 'updateCandidate').resolves(updatedCandidate);

            const response = await request(app)
                .put(updateCandidateEndpoint(ELECTION_ID, CANDIDATE_ID))
                .set('Authorization', `Bearer ${commissionerToken}`)
                .send(updateData);

            expect(response.status).to.equal(200);
            // REFINED assertions:
            expect(response.body.success).to.be.true;
            expect(response.body.message).to.contain('Candidate updated successfully');
            expect(response.body.data).to.exist;
            expect(response.body.data.id).to.equal(CANDIDATE_ID);
            expect(response.body.data.party).to.equal(updateData.party);
            expect(response.body.data.bio).to.equal(updateData.bio);
            // Avoid deep.equal

            expect(updateStub.calledOnceWith(ELECTION_ID, CANDIDATE_ID, updateData, sinon.match.string /* adminId */)).to.be.true;
        });

        it('should allow System Admin to update a candidate', async () => {
            const updateData = { name: 'Updated Name Admin' };
            const updateStub = sandbox.stub(electoralCommissionerService, 'updateCandidate').resolves({ id: CANDIDATE_ID, ...updateData });
            const response = await request(app)
                .put(updateCandidateEndpoint(ELECTION_ID, CANDIDATE_ID))
                .set('Authorization', `Bearer ${systemAdminToken}`)
                .send(updateData);
            expect(response.status).to.equal(200);
            expect(updateStub.calledOnce).to.be.true;
        });

        it('should return 400 for invalid update data (if applicable)', async () => {
            // Example: If name cannot be empty
            const invalidData = { name: '' };
            const response = await request(app)
                .put(updateCandidateEndpoint(ELECTION_ID, CANDIDATE_ID))
                .set('Authorization', `Bearer ${commissionerToken}`)
                .send(invalidData);
            expect(response.status).to.equal(400);
            expect(response.body.errors.some(e => e.msg.includes('Candidate name cannot be empty'))).to.be.true;
        });

        it('should return 404 if election or candidate not found', async () => {
            const nonExistentCandidateId = 'candidate-not-found-uuid';
            const updateData = { party: 'New Party' };
            const error = new Error('Election or Candidate not found');
            error.status = 404;
            const updateStub = sandbox.stub(electoralCommissionerService, 'updateCandidate').rejects(error);

            const response = await request(app)
                .put(updateCandidateEndpoint(ELECTION_ID, nonExistentCandidateId))
                .set('Authorization', `Bearer ${commissionerToken}`)
                .send(updateData);

            expect(response.status).to.equal(404);
             expect(response.body.success).to.be.false;
             expect(response.body.message).to.equal(error.message);
            expect(updateStub.calledOnce).to.be.true;
        });

        it('should return 403 if accessed by non-permitted role', async () => {
            const updateData = { party: 'Auditor Party' };
            const response = await request(app)
                .put(updateCandidateEndpoint(ELECTION_ID, CANDIDATE_ID))
                .set('Authorization', `Bearer ${auditorToken}`)
                .send(updateData);
            expect(response.status).to.equal(403);
        });

        it('should return 401 if not authenticated', async () => {
             const updateData = { party: 'Anon Party' };
             const response = await request(app).put(updateCandidateEndpoint(ELECTION_ID, CANDIDATE_ID)).send(updateData);
             expect(response.status).to.equal(401);
        });

        it('should return 500 for unexpected errors', async () => {
             const updateData = { party: 'Error Party' };
             const error = new Error("DB error updating candidate");
             const updateStub = sandbox.stub(electoralCommissionerService, 'updateCandidate').rejects(error);

             const response = await request(app)
                .put(updateCandidateEndpoint(ELECTION_ID, CANDIDATE_ID))
                .set('Authorization', `Bearer ${commissionerToken}`)
                .send(updateData);

            expect(response.status).to.equal(500);
            expect(updateStub.calledOnce).to.be.true;
        });
  });

   describe('DELETE /elections/:electionId/candidates/:candidateId (Commissioner/SysAdmin)', () => {
        const deleteCandidateEndpoint = (electionId, candidateId) => `/api/v1/admin/elections/${electionId}/candidates/${candidateId}`;
        const ELECTION_ID_DEL = 'election-for-candidate-delete';
        const CANDIDATE_ID_DEL = 'candidate-to-delete-uuid';

        it('should delete a candidate successfully (Commissioner)', async () => {
            const serviceResult = { message: 'Candidate removed successfully.' };
            // IMPORTANT: Ensure 'removeCandidate' is correct
            const deleteStub = sandbox.stub(electoralCommissionerService, 'removeCandidate').resolves(serviceResult);

            const response = await request(app)
                .delete(deleteCandidateEndpoint(ELECTION_ID_DEL, CANDIDATE_ID_DEL))
                .set('Authorization', `Bearer ${commissionerToken}`);

            expect([200, 204]).to.include(response.status); // Allow 200 or 204
            if (response.status === 200) {
                 expect(response.body.success).to.be.true;
                 expect(response.body.message).to.equal(serviceResult.message);
            }
            expect(deleteStub.calledOnceWith(ELECTION_ID_DEL, CANDIDATE_ID_DEL, sinon.match.string /* adminId */)).to.be.true;
        });

        it('should allow System Admin to delete a candidate', async () => {
            const deleteStub = sandbox.stub(electoralCommissionerService, 'removeCandidate').resolves({});
            const response = await request(app)
                .delete(deleteCandidateEndpoint(ELECTION_ID_DEL, CANDIDATE_ID_DEL))
                .set('Authorization', `Bearer ${systemAdminToken}`);
            expect([200, 204]).to.include(response.status);
            expect(deleteStub.calledOnce).to.be.true;
        });

        it('should return 404 if election or candidate not found', async () => {
            const nonExistentCandidateId = 'candidate-not-found-uuid';
            const error = new Error('Election or Candidate not found');
            error.status = 404;
            const deleteStub = sandbox.stub(electoralCommissionerService, 'removeCandidate').rejects(error);

            const response = await request(app)
                .delete(deleteCandidateEndpoint(ELECTION_ID_DEL, nonExistentCandidateId))
                .set('Authorization', `Bearer ${commissionerToken}`);

            expect(response.status).to.equal(404);
            expect(response.body.success).to.be.false;
            expect(response.body.message).to.equal(error.message);
            expect(deleteStub.calledOnce).to.be.true;
        });

        it('should return 403 if accessed by non-permitted role', async () => {
            const response = await request(app)
                .delete(deleteCandidateEndpoint(ELECTION_ID_DEL, CANDIDATE_ID_DEL))
                .set('Authorization', `Bearer ${securityOfficerToken}`); // E.g., Security Officer
            expect(response.status).to.equal(403);
        });

        it('should return 401 if not authenticated', async () => {
             const response = await request(app).delete(deleteCandidateEndpoint(ELECTION_ID_DEL, CANDIDATE_ID_DEL));
             expect(response.status).to.equal(401);
        });

        it('should return 500 for unexpected errors', async () => {
            const error = new Error("DB error removing candidate");
            const deleteStub = sandbox.stub(electoralCommissionerService, 'removeCandidate').rejects(error);
            const response = await request(app)
                .delete(deleteCandidateEndpoint(ELECTION_ID_DEL, CANDIDATE_ID_DEL))
                .set('Authorization', `Bearer ${commissionerToken}`);
            expect(response.status).to.equal(500);
            expect(deleteStub.calledOnce).to.be.true;
        });
  });

  // --- Security Officer: Security Logs ---
  describe('GET /security-logs', () => {
      const secLogsEndpoint = '/api/v1/admin/security-logs';

      it('should get security logs successfully (Security Officer)', async () => {
          const expectedLogs = testData.adminRoutes[secLogsEndpoint].get.successResponse.data; // [{...}, {...}]
          const expectedPagination = testData.adminRoutes[secLogsEndpoint].get.successResponse.pagination;
          const getLogsStub = sandbox.stub(securityOfficerService, 'getSecurityLogs').resolves({
              logs: expectedLogs,
              pagination: expectedPagination
          });

          const response = await request(app)
              .get(secLogsEndpoint)
              .set('Authorization', `Bearer ${securityOfficerToken}`);

          expect(response.status).to.equal(200);
          expect(response.body.success).to.be.true;
          expect(response.body.data).to.deep.equal(expectedLogs);
          expect(response.body.pagination).to.deep.equal(expectedPagination);
          expect(getLogsStub.calledOnceWith(sinon.match({}), sinon.match({ page: 1, limit: 50 }))).to.be.true;
      });

      it('should get security logs successfully (System Admin)', async () => {
          const getLogsStub = sandbox.stub(securityOfficerService, 'getSecurityLogs').resolves({ logs: [], pagination: {} });
          const response = await request(app)
              .get(secLogsEndpoint)
              .set('Authorization', `Bearer ${systemAdminToken}`);
          expect(response.status).to.equal(200);
          expect(getLogsStub.calledOnce).to.be.true;
      });

      it('should get security logs successfully with filters', async () => {
          const queryParams = testData.adminRoutes[secLogsEndpoint].get.queryParams.success; // { severity: 'high', startDate: '...' }
          const expectedLogs = [{ severity: 'high', event: 'Failed Login Attempt Flood' }]; // Example
          const expectedPagination = { total: 1, page: 1, limit: 50, totalPages: 1 }; // Example
          const getLogsStub = sandbox.stub(securityOfficerService, 'getSecurityLogs').resolves({
              logs: expectedLogs,
              pagination: expectedPagination
          });

          const response = await request(app)
              .get(secLogsEndpoint)
              .query(queryParams)
              .set('Authorization', `Bearer ${securityOfficerToken}`);

          expect(response.status).to.equal(200);
          expect(response.body.data).to.deep.equal(expectedLogs);
           expect(getLogsStub.calledOnceWith(
               sinon.match({ severity: queryParams.severity, startDate: queryParams.startDate }),
               sinon.match({ page: queryParams.page, limit: queryParams.limit })
           )).to.be.true;
      });

      it('should return 400 for invalid severity filter', async () => {
          const response = await request(app)
              .get(secLogsEndpoint)
              .query({ severity: 'urgent' }) // Invalid value
              .set('Authorization', `Bearer ${securityOfficerToken}`);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Severity must be one of: low, medium, high, critical');
      });

      it('should return 400 for invalid date format', async () => {
            const response = await request(app)
              .get(secLogsEndpoint)
              .query({ endDate: 'yesterday' }) // Invalid format
              .set('Authorization', `Bearer ${securityOfficerToken}`);

            expect(response.status).to.equal(400);
            expect(response.body.errors[0].msg).to.contain('End date must be a valid ISO date');
      });

      it('should return 403 if accessed by a non-permitted admin role (e.g., Commissioner)', async () => {
          const response = await request(app)
              .get(secLogsEndpoint)
              .set('Authorization', `Bearer ${commissionerToken}`); // Use Commissioner token

          expect(response.status).to.equal(403);
           expect(response.body.message).to.contain('Insufficient permissions');
      });

       it('should return 401 if not authenticated', async () => {
          const response = await request(app).get(secLogsEndpoint);
          expect(response.status).to.equal(401);
      });

       it('should return 500 for unexpected errors', async () => {
           const error = new Error("Security log storage error");
           const getLogsStub = sandbox.stub(securityOfficerService, 'getSecurityLogs').rejects(error);

           const response = await request(app)
               .get(secLogsEndpoint)
               .set('Authorization', `Bearer ${securityOfficerToken}`);

           expect(response.status).to.equal(500);
           expect(getLogsStub.calledOnce).to.be.true;
      });
  });

  // --- Result Verification ---
  describe('POST /results/publish', () => {
    const publishEndpoint = '/api/v1/admin/results/publish';

    it('should publish preliminary results successfully (Result Verifier)', async () => {
        const requestBody = testData.adminRoutes[publishEndpoint].post.requestBody.preliminary; // { electionId: 'uuid' }
        const expectedResult = { message: `Preliminary results for election ${requestBody.electionId} published.` };
        const publishStub = sandbox.stub(resultVerificationService, 'verifyAndPublishResults').resolves(expectedResult);

        const response = await request(app)
            .post(publishEndpoint)
            .set('Authorization', `Bearer ${resultVerifierToken}`) // Use Result Verifier token
            .send(requestBody);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.message).to.equal(expectedResult.message);
        // Verify service called with electionId and default 'preliminary' level
        expect(publishStub.calledOnceWith(requestBody.electionId, 'preliminary')).to.be.true;
    });

    it('should publish final results successfully (Commissioner)', async () => {
        const requestBody = testData.adminRoutes[publishEndpoint].post.requestBody.final; // { electionId: 'uuid', publishLevel: 'final' }
        const expectedResult = { message: `Final results for election ${requestBody.electionId} published.` };
        const publishStub = sandbox.stub(resultVerificationService, 'verifyAndPublishResults').resolves(expectedResult);

        const response = await request(app)
            .post(publishEndpoint)
            .set('Authorization', `Bearer ${commissionerToken}`) // Use Commissioner token
            .send(requestBody);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
         expect(publishStub.calledOnceWith(requestBody.electionId, 'final')).to.be.true;
    });

    it('should return 400 for missing electionId', async () => {
        const requestBody = {}; // Missing electionId
        const response = await request(app)
            .post(publishEndpoint)
            .set('Authorization', `Bearer ${resultVerifierToken}`)
            .send(requestBody);

        expect(response.status).to.equal(400);
        expect(response.body.errors[0].msg).to.contain('Election ID is required');
    });

    it('should return 400 for invalid electionId format', async () => {
        const requestBody = { electionId: 'not-a-uuid' };
        const response = await request(app)
            .post(publishEndpoint)
            .set('Authorization', `Bearer ${resultVerifierToken}`)
            .send(requestBody);

        expect(response.status).to.equal(400);
        expect(response.body.errors[0].msg).to.contain('Election ID must be a valid UUID');
    });

    it('should return 400 for invalid publishLevel', async () => {
         const requestBody = { electionId: testData.adminRoutes[publishEndpoint].post.requestBody.final.electionId, publishLevel: 'unofficial' };
         const response = await request(app)
            .post(publishEndpoint)
            .set('Authorization', `Bearer ${resultVerifierToken}`)
            .send(requestBody);

         expect(response.status).to.equal(400);
         expect(response.body.errors[0].msg).to.contain('Publish level must be either preliminary or final');
     });

     it('should return 400 if election is not completed or results are not ready', async () => {
         const requestBody = testData.adminRoutes[publishEndpoint].post.requestBody.preliminary;
         const error = { status: 400, message: 'Election is still ongoing or results are not yet verified.' };
         const publishStub = sandbox.stub(resultVerificationService, 'verifyAndPublishResults').rejects(error);

         const response = await request(app)
            .post(publishEndpoint)
            .set('Authorization', `Bearer ${resultVerifierToken}`)
            .send(requestBody);

         expect(response.status).to.equal(400);
         expect(response.body).to.deep.equal({ success: false, message: error.message });
         expect(publishStub.calledOnce).to.be.true;
     });

    it('should return 404 if election not found', async () => {
        const requestBody = testData.adminRoutes[publishEndpoint].post.requestBody.notFound; // { electionId: 'non-existent-uuid' }
        const error = { status: 404, message: 'Election not found.' };
        const publishStub = sandbox.stub(resultVerificationService, 'verifyAndPublishResults').rejects(error);

        const response = await request(app)
            .post(publishEndpoint)
            .set('Authorization', `Bearer ${resultVerifierToken}`)
            .send(requestBody);

        expect(response.status).to.equal(404);
        expect(response.body).to.deep.equal({ success: false, message: error.message });
        expect(publishStub.calledOnce).to.be.true;
    });

    it('should return 403 if accessed by a non-permitted admin role (e.g., Security Officer)', async () => {
        const requestBody = testData.adminRoutes[publishEndpoint].post.requestBody.preliminary;
        const response = await request(app)
            .post(publishEndpoint)
            .set('Authorization', `Bearer ${securityOfficerToken}`) // Use Security Officer token
            .send(requestBody);

        expect(response.status).to.equal(403);
         expect(response.body.message).to.contain('Insufficient permissions');
    });

    it('should return 401 if not authenticated', async () => {
         const requestBody = testData.adminRoutes[publishEndpoint].post.requestBody.preliminary;
         const response = await request(app).post(publishEndpoint).send(requestBody);
         expect(response.status).to.equal(401);
    });

     it('should return 500 for unexpected errors', async () => {
        const requestBody = testData.adminRoutes[publishEndpoint].post.requestBody.preliminary;
        const error = new Error("Result publishing service failed");
        const publishStub = sandbox.stub(resultVerificationService, 'verifyAndPublishResults').rejects(error);

        const response = await request(app)
            .post(publishEndpoint)
            .set('Authorization', `Bearer ${resultVerifierToken}`)
            .send(requestBody);

        expect(response.status).to.equal(500);
        expect(publishStub.calledOnce).to.be.true;
     });
  });

  // --- Voter Verification Admin ---
  describe('GET /pending-verifications (Voter Reg Officer)', () => {
    const pendingVerifEndpoint = '/api/v1/admin/pending-verifications';

    it('should get list of pending verifications successfully', async () => {
        const expectedVerifications = testData.adminRoutes[pendingVerifEndpoint].get.successResponse.data;
        const expectedPagination = testData.adminRoutes[pendingVerifEndpoint].get.successResponse.pagination;
        const getPendingStub = sandbox.stub(voterVerificationService, 'getPendingVerifications').resolves({
            verifications: expectedVerifications,
            pagination: expectedPagination
        });

        const response = await request(app)
            .get(pendingVerifEndpoint)
            .set('Authorization', `Bearer ${voterRegOfficerToken}`); // Use Voter Reg Officer token

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.deep.equal(expectedVerifications);
        expect(response.body.pagination).to.deep.equal(expectedPagination);
        expect(getPendingStub.calledOnceWith(sinon.match({ page: 1, limit: 50 }))).to.be.true; // Default pagination
    });

     it('should handle pagination parameters correctly', async () => {
        const queryParams = { page: 2, limit: 10 };
        const getPendingStub = sandbox.stub(voterVerificationService, 'getPendingVerifications').resolves({ verifications: [], pagination: { total: 0, page: 2, limit: 10, totalPages: 0 } });

        const response = await request(app)
            .get(pendingVerifEndpoint)
            .query(queryParams)
            .set('Authorization', `Bearer ${voterRegOfficerToken}`);

        expect(response.status).to.equal(200);
        expect(getPendingStub.calledOnceWith(sinon.match({ page: 2, limit: 10 }))).to.be.true;
     });

     it('should return 400 for invalid pagination (e.g., page 0)', async () => {
         const response = await request(app)
            .get(pendingVerifEndpoint)
            .query({ page: 0 })
            .set('Authorization', `Bearer ${voterRegOfficerToken}`);

         expect(response.status).to.equal(400);
         expect(response.body.errors[0].msg).to.contain('Page must be a positive integer');
     });

      it('should return 400 for invalid pagination (limit > 100)', async () => {
          const response = await request(app)
            .get(pendingVerifEndpoint)
            .query({ limit: 150 })
            .set('Authorization', `Bearer ${voterRegOfficerToken}`);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Limit must be between 1 and 100');
      });


    it('should return 403 if accessed by non-Voter Reg Officer (e.g., System Admin)', async () => {
        const response = await request(app)
            .get(pendingVerifEndpoint)
            .set('Authorization', `Bearer ${systemAdminToken}`); // Use System Admin token

        expect(response.status).to.equal(403);
        expect(response.body.message).to.contain('Forbidden'); // Or specific access denied message
    });

    it('should return 401 if not authenticated', async () => {
        const response = await request(app).get(pendingVerifEndpoint);
        expect(response.status).to.equal(401);
    });

    it('should return 500 for unexpected errors', async () => {
        const error = new Error("Failed to retrieve pending verifications");
        const getPendingStub = sandbox.stub(voterVerificationService, 'getPendingVerifications').rejects(error);

        const response = await request(app)
            .get(pendingVerifEndpoint)
            .set('Authorization', `Bearer ${voterRegOfficerToken}`);

        expect(response.status).to.equal(500);
        expect(getPendingStub.calledOnce).to.be.true;
    });
  });

  describe('POST /approve-verification/:id (Voter Reg Officer)', () => {
      const approveVerifEndpoint = (id) => `/api/v1/admin/approve-verification/${id}`;

      it('should approve verification request successfully', async () => {
          const verificationId = testData.adminRoutes['/api/v1/admin/approve-verification/{id}'].post.pathParams.id;
          const expectedResult = { message: `Voter verification request ${verificationId} approved successfully.` };
          // Assuming the service takes the verification ID and the approving officer's ID
          const approveStub = sandbox.stub(voterVerificationService, 'approveVerification').resolves(expectedResult);

          const response = await request(app)
              .post(approveVerifEndpoint(verificationId))
              .set('Authorization', `Bearer ${voterRegOfficerToken}`); // Voter Reg Officer token

          expect(response.status).to.equal(200);
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.equal(expectedResult.message);
          // Verify service called with verificationId and approving officer's ID (from token)
           expect(approveStub.calledOnceWith(verificationId, sinon.match.string)).to.be.true;
      });

      it('should return 400 for invalid verification ID format', async () => {
          const invalidId = 'not-a-uuid';
          const response = await request(app)
              .post(approveVerifEndpoint(invalidId))
              .set('Authorization', `Bearer ${voterRegOfficerToken}`);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('ID must be a valid UUID');
      });

      it('should return 404 if verification request not found', async () => {
            const nonExistentId = testData.adminRoutes['/api/v1/admin/approve-verification/{id}'].post.pathParams.notFoundId;
            const error = { status: 404, message: 'Verification request not found or already processed.' };
            const approveStub = sandbox.stub(voterVerificationService, 'approveVerification').rejects(error);

            const response = await request(app)
                .post(approveVerifEndpoint(nonExistentId))
                .set('Authorization', `Bearer ${voterRegOfficerToken}`);

            expect(response.status).to.equal(404);
            expect(response.body).to.deep.equal({ success: false, message: error.message });
            expect(approveStub.calledOnce).to.be.true;
      });

      it('should return 403 if accessed by non-Voter Reg Officer', async () => {
            const verificationId = testData.adminRoutes['/api/v1/admin/approve-verification/{id}'].post.pathParams.id;
            const response = await request(app)
                .post(approveVerifEndpoint(verificationId))
                .set('Authorization', `Bearer ${systemAdminToken}`); // Use System Admin token

            expect(response.status).to.equal(403);
      });

       it('should return 401 if not authenticated', async () => {
            const verificationId = testData.adminRoutes['/api/v1/admin/approve-verification/{id}'].post.pathParams.id;
            const response = await request(app).post(approveVerifEndpoint(verificationId));
            expect(response.status).to.equal(401);
      });

      it('should return 500 for unexpected errors during approval', async () => {
            const verificationId = testData.adminRoutes['/api/v1/admin/approve-verification/{id}'].post.pathParams.id;
            const error = new Error("Database error during verification approval");
            const approveStub = sandbox.stub(voterVerificationService, 'approveVerification').rejects(error);

            const response = await request(app)
                .post(approveVerifEndpoint(verificationId))
                .set('Authorization', `Bearer ${voterRegOfficerToken}`);

            expect(response.status).to.equal(500);
            expect(approveStub.calledOnce).to.be.true;
      });
  });

  describe('POST /reject-verification/:id (Voter Reg Officer)', () => {
      const rejectVerifEndpoint = (id) => `/api/v1/admin/reject-verification/${id}`;

      it('should reject verification request successfully with a reason', async () => {
          const verificationId = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.pathParams.id;
          const requestBody = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.requestBody.success; // { reason: 'Document unclear' }
          const expectedResult = { message: `Voter verification request ${verificationId} rejected.` };
           // Assuming service takes verification ID, reason, and officer's ID
          const rejectStub = sandbox.stub(voterVerificationService, 'rejectVerification').resolves(expectedResult);

          const response = await request(app)
              .post(rejectVerifEndpoint(verificationId))
              .set('Authorization', `Bearer ${voterRegOfficerToken}`) // Voter Reg Officer token
              .send(requestBody);

          expect(response.status).to.equal(200);
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.equal(expectedResult.message);
           // Verify service called with ID, reason, and officer ID
           expect(rejectStub.calledOnceWith(verificationId, requestBody.reason, sinon.match.string)).to.be.true;
      });

      it('should return 400 for invalid verification ID format', async () => {
          const invalidId = 'bad-id';
          const requestBody = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.requestBody.success;
          const response = await request(app)
              .post(rejectVerifEndpoint(invalidId))
              .set('Authorization', `Bearer ${voterRegOfficerToken}`)
              .send(requestBody);

          expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('ID must be a valid UUID');
      });

      it('should return 400 for missing rejection reason', async () => {
            const verificationId = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.pathParams.id;
            const requestBody = {}; // Missing reason
            const response = await request(app)
                .post(rejectVerifEndpoint(verificationId))
                .set('Authorization', `Bearer ${voterRegOfficerToken}`)
                .send(requestBody);

            expect(response.status).to.equal(400);
            expect(response.body.errors[0].msg).to.contain('Rejection reason is required');
      });

      it('should return 404 if verification request not found', async () => {
            const nonExistentId = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.pathParams.notFoundId;
            const requestBody = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.requestBody.success;
            const error = { status: 404, message: 'Verification request not found or already processed.' };
            const rejectStub = sandbox.stub(voterVerificationService, 'rejectVerification').rejects(error);

            const response = await request(app)
                .post(rejectVerifEndpoint(nonExistentId))
                .set('Authorization', `Bearer ${voterRegOfficerToken}`)
                .send(requestBody);

            expect(response.status).to.equal(404);
            expect(response.body).to.deep.equal({ success: false, message: error.message });
            expect(rejectStub.calledOnce).to.be.true;
      });

      it('should return 403 if accessed by non-Voter Reg Officer', async () => {
            const verificationId = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.pathParams.id;
            const requestBody = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.requestBody.success;
            const response = await request(app)
                .post(rejectVerifEndpoint(verificationId))
                .set('Authorization', `Bearer ${systemAdminToken}`) // Use System Admin token
                .send(requestBody);

            expect(response.status).to.equal(403);
      });

      it('should return 401 if not authenticated', async () => {
           const verificationId = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.pathParams.id;
           const requestBody = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.requestBody.success;
           const response = await request(app).post(rejectVerifEndpoint(verificationId)).send(requestBody);
           expect(response.status).to.equal(401);
      });

      it('should return 500 for unexpected errors during rejection', async () => {
            const verificationId = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.pathParams.id;
            const requestBody = testData.adminRoutes['/api/v1/admin/reject-verification/{id}'].post.requestBody.success;
            const error = new Error("Database error during verification rejection");
            const rejectStub = sandbox.stub(voterVerificationService, 'rejectVerification').rejects(error);

            const response = await request(app)
                .post(rejectVerifEndpoint(verificationId))
                .set('Authorization', `Bearer ${voterRegOfficerToken}`)
                .send(requestBody);

            expect(response.status).to.equal(500);
            expect(rejectStub.calledOnce).to.be.true;
      });
  });

}); // End of main describe block for adminRoutes 