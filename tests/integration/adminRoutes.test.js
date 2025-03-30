// tests/integration/adminRoutes.test.js
import request from 'supertest';
import { expect } from 'chai';
import sinon from 'sinon';
import { app } from '../../src/app'; // Assuming your Express app is exported from here
import { UserRole } from '../../src/types';
import { generateTestToken } from '../utils/authTestUtils'; // Helper to generate tokens
import { testData } from '../utils/testData'; // Your test data source
import * as systemAdminService from '../../src/services/admin/systemAdminService'; // Assuming service layer exists
import * as auditLogService from '../../src/services/auditLogService'; // For audit log tests later
import * as electoralCommissionerService from '../../src/services/admin/electoralCommissionerService'; // Assuming service exists
import * as securityOfficerService from '../../src/services/admin/securityOfficerService'; // Assuming service exists
import * as resultVerificationService from '../../src/services/admin/resultVerificationService'; // Assuming service exists
import * as voterVerificationService from '../../src/services/voterVerificationService'; // Or wherever the controller methods' logic resides
// Import other necessary services as needed...

describe('Admin Routes Integration Tests (/api/v1/admin)', () => {
  let sandbox: sinon.SinonSandbox;
  let systemAdminToken: string; // Token for a System Admin user
  let auditorToken: string; // Token for a System Auditor user
  let commissionerToken: string; // Token for an Electoral Commissioner
  let securityOfficerToken: string; // Token for a Security Officer
  let resultVerifierToken: string; // <-- Add this line
  let voterRegOfficerToken: string; // <-- Add this line
  let regularUserToken: string; // Token for a non-admin user (e.g., Voter)


  before(() => {
    // Generate tokens for different roles before all tests run
    systemAdminToken = generateTestToken({ userId: 'admin-user-id-sysadmin', role: UserRole.SYSTEM_ADMIN });
    auditorToken = generateTestToken({ userId: 'admin-user-id-auditor', role: UserRole.SYSTEM_AUDITOR });
    commissionerToken = generateTestToken({ userId: 'admin-user-id-comm', role: UserRole.ELECTORAL_COMMISSIONER });
    securityOfficerToken = generateTestToken({ userId: 'admin-user-id-sec', role: UserRole.SECURITY_OFFICER });
    regularUserToken = generateTestToken({ userId: 'voter-user-id', role: UserRole.VOTER });
    // Add new tokens
    resultVerifierToken = generateTestToken({ userId: 'admin-user-id-verifier', role: UserRole.RESULT_VERIFICATION_OFFICER }); // <-- Add this line
    voterRegOfficerToken = generateTestToken({ userId: 'admin-user-id-reg', role: UserRole.VOTER_REGISTRATION_OFFICER }); // <-- Add this line
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
      const expectedUsers = testData.adminRoutes['/api/v1/admin/users'].get.successResponse.data; // [{...}, {...}]
      const expectedPagination = testData.adminRoutes['/api/v1/admin/users'].get.successResponse.pagination; // { total, page, limit, ... }
      // Stub the service method
      const listUsersStub = sandbox.stub(systemAdminService, 'getAllAdminUsers').resolves({
          users: expectedUsers,
          pagination: expectedPagination
      });

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(expectedUsers);
      expect(response.body.pagination).to.deep.equal(expectedPagination);
      // Verify service called with default/empty filters and pagination
       expect(listUsersStub.calledOnceWith(
           sinon.match({}), // Empty filter object
           sinon.match({ page: 1, limit: 50 }) // Default pagination
       )).to.be.true;
    });

     it('should list admin users successfully with filters and pagination', async () => {
        const queryParams = testData.adminRoutes['/api/v1/admin/users'].get.queryParams.success; // { role: 'Auditor', status: 'active', page: 2, limit: 10 }
        const expectedUsers = [{ id: 'user-3', role: UserRole.SYSTEM_AUDITOR, status: 'active' }]; // Example filtered data
        const expectedPagination = { total: 5, page: 2, limit: 10, totalPages: 1 }; // Example pagination
        const listUsersStub = sandbox.stub(systemAdminService, 'getAllAdminUsers').resolves({
            users: expectedUsers,
            pagination: expectedPagination
        });

        const response = await request(app)
            .get('/api/v1/admin/users')
            .query(queryParams)
            .set('Authorization', `Bearer ${systemAdminToken}`);

        expect(response.status).to.equal(200);
        expect(response.body.data).to.deep.equal(expectedUsers);
        expect(response.body.pagination).to.deep.equal(expectedPagination);
        // Verify service called with specific filters and pagination
        expect(listUsersStub.calledOnceWith(
            sinon.match({ role: queryParams.role, status: queryParams.status }),
            sinon.match({ page: queryParams.page, limit: queryParams.limit })
        )).to.be.true;
     });

    it('should return 400 for invalid pagination parameters (e.g., limit > 100)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ limit: 200 }) // Invalid limit
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.errors[0].msg).to.contain('Limit must be between 1 and 100');
    });

    it('should return 400 for invalid status filter', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ status: 'pending' }) // Invalid status
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.errors[0].msg).to.contain('Status must be one of: active, inactive, all');
    });

    it('should return 403 if accessed by non-System Admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${auditorToken}`); // Use Auditor token

      expect(response.status).to.equal(403);
       expect(response.body.message).to.contain('Forbidden');
    });

     it('should return 401 if not authenticated', async () => {
        const response = await request(app).get('/api/v1/admin/users');
        expect(response.status).to.equal(401);
     });

     it('should return 500 for unexpected errors', async () => {
        const error = new Error("Database connection error");
        const listUsersStub = sandbox.stub(systemAdminService, 'getAllAdminUsers').rejects(error);

        const response = await request(app)
            .get('/api/v1/admin/users')
            .set('Authorization', `Bearer ${systemAdminToken}`);

        expect(response.status).to.equal(500);
        expect(listUsersStub.calledOnce).to.be.true;
     });
  });

  describe('POST /users (System Admin)', () => {
      it('should create a new admin user successfully', async () => {
          const newUserDetails = testData.adminRoutes['/api/v1/admin/users'].post.requestBody.success; // { email, fullName, ... role: 'SecurityOfficer' }
          const createdUser = { id: 'new-admin-id', ...newUserDetails };
          delete createdUser.password; // Don't return password
          const createUserStub = sandbox.stub(systemAdminService, 'createAdminUser').resolves(createdUser);

          const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(newUserDetails);

          expect(response.status).to.equal(201);
          expect(response.body.success).to.be.true;
          expect(response.body.message).to.contain('Admin user created successfully');
          expect(response.body.data).to.deep.equal(createdUser);
          expect(createUserStub.calledOnceWith(newUserDetails)).to.be.true;
      });

      it('should return 400 for missing required fields (e.g., email)', async () => {
          const invalidDetails = { ...testData.adminRoutes['/api/v1/admin/users'].post.requestBody.success, email: undefined };
          const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Email is required');
      });

      it('should return 400 for invalid email format', async () => {
           const invalidDetails = { ...testData.adminRoutes['/api/v1/admin/users'].post.requestBody.success, email: 'not-an-email' };
            const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Provide a valid email address');
      });

       it('should return 400 for invalid phone number format', async () => {
           const invalidDetails = { ...testData.adminRoutes['/api/v1/admin/users'].post.requestBody.success, phoneNumber: '123' };
            const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Provide a valid phone number');
      });

      it('should return 400 for weak password', async () => {
          const invalidDetails = { ...testData.adminRoutes['/api/v1/admin/users'].post.requestBody.success, password: 'weak' };
           const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

          expect(response.status).to.equal(400);
          expect(response.body.errors[0].msg).to.contain('Password must be at least 8 characters');
      });

       it('should return 400 for invalid admin role', async () => {
           const invalidDetails = { ...testData.adminRoutes['/api/v1/admin/users'].post.requestBody.success, role: 'InvalidRole' };
           const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(invalidDetails);

           expect(response.status).to.equal(400);
           expect(response.body.errors[0].msg).to.contain('Invalid admin role');
       });

      it('should return 409 if user email already exists', async () => {
          const newUserDetails = testData.adminRoutes['/api/v1/admin/users'].post.requestBody.conflict;
           const error = { status: 409, message: 'User with this email already exists' };
          const createUserStub = sandbox.stub(systemAdminService, 'createAdminUser').rejects(error);

          const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${systemAdminToken}`)
              .send(newUserDetails);

          expect(response.status).to.equal(409);
          expect(response.body.success).to.be.false;
          expect(response.body.message).to.equal(error.message);
          expect(createUserStub.calledOnce).to.be.true;
      });

      it('should return 403 if accessed by non-System Admin', async () => {
          const newUserDetails = testData.adminRoutes['/api/v1/admin/users'].post.requestBody.success;
          const response = await request(app)
              .post('/api/v1/admin/users')
              .set('Authorization', `Bearer ${commissionerToken}`) // Use Commissioner token
              .send(newUserDetails);

          expect(response.status).to.equal(403);
      });

      it('should return 401 if not authenticated', async () => {
          const newUserDetails = testData.adminRoutes['/api/v1/admin/users'].post.requestBody.success;
          const response = await request(app).post('/api/v1/admin/users').send(newUserDetails);
          expect(response.status).to.equal(401);
      });

      it('should return 500 for unexpected errors', async () => {
           const newUserDetails = testData.adminRoutes['/api/v1/admin/users'].post.requestBody.success;
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

       it('should return 403 if accessed by a non-admin user (Voter)', async () => {
          const response = await request(app)
            .get(auditLogsEndpoint)
            .set('Authorization', `Bearer ${regularUserToken}`); // Use Voter token

          expect(response.status).to.equal(403);
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
               sinon.match({ page: 1, limit: 50 }) // Default pagination assumed here
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
            .query({ limit: 101 })
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