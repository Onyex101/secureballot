// tests/integration/authRoutes.test.js
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const app = require('../../src/app'); // Assuming your Express app is exported from src/app.ts (or .js)
// Import necessary models or controllers to stub. Adjust paths as needed.
const userModel = require('../../src/db/models/userModel');
const authService = require('../../src/services/authService'); // Assuming an auth service exists
const ussdAuthService = require('../../src/services/ussdAuthService'); // Assuming a service for USSD auth logic
const mfaService = require('../../src/services/mfaService'); // Assuming MFA service
const userService = require('../../src/services/userService'); // May be needed for /me
const testData = require('../api-test-data.json'); // Assuming test data structure exists

describe('Auth Routes Integration Tests - /api/v1/auth', () => {
  let sandbox;
  let generatedAuthToken; // For testing protected routes if needed later

  beforeEach(() => {
    // Create a sandbox for Sinon stubs
    sandbox = sinon.createSandbox();

    // Generate a generic test auth token (if needed for other tests in this file)
    const payload = { id: 'test-user-id', role: 'voter', isVerified: true };
    generatedAuthToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '1h',
    });

    // Common stubs needed across tests can go here if any
  });

  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });

  // --- Registration Route ---
  describe('POST /register', () => {
    it('should register a new voter successfully and return user data and token', async () => {
      const registrationData = {
        nin: '12345678901',
        vin: 'VIN987654321',
        phoneNumber: '08012345678',
        dateOfBirth: '1990-01-15',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Voter',
        email: 'test.voter.reg@example.com',
      };
      const serviceResult = {
        user: { id: 'new-user-uuid', email: registrationData.email, nin: registrationData.nin },
        token: 'mock_jwt_token_for_registration',
      };

      // IMPORTANT: Ensure 'registerVoter' is the correct function name in authService
      const registerStub = sandbox.stub(authService, 'registerVoter').resolves(serviceResult);

      const response = await request(app).post('/api/v1/auth/register').send(registrationData);

      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Registration successful'); // Match actual success message
      expect(response.body.data).to.exist;
      expect(response.body.data.token).to.equal(serviceResult.token);
      expect(response.body.data.user).to.exist;
      expect(response.body.data.user.id).to.equal(serviceResult.user.id);
      expect(response.body.data.user.nin).to.equal(registrationData.nin);
      expect(response.body.data.user.email).to.equal(registrationData.email);

      expect(registerStub.calledOnceWith(registrationData)).to.be.true;
    });

    it('should return 400 if required fields (e.g., NIN) are missing', async () => {
      const invalidData = {
        vin: 'VIN987654321',
        password: 'P1' /* ...other valid fields except NIN */,
      };

      const response = await request(app).post('/api/v1/auth/register').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error'); // Assuming validation middleware response
      expect(response.body.errors).to.be.an('array').that.has.length.greaterThan(0);
      expect(response.body.errors.some(e => e.msg.includes('NIN is required'))).to.be.true; // Check specific error
    });

    it('should return 400 for invalid input format (e.g., invalid NIN length)', async () => {
      const invalidData = {
        nin: '123',
        vin: 'VIN987654321',
        password: 'P1' /* ...other valid fields */,
      };

      const response = await request(app).post('/api/v1/auth/register').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.errors).to.be.an('array').that.has.length.greaterThan(0);
      expect(response.body.errors.some(e => e.msg.includes('NIN must be 11 characters'))).to.be
        .true; // Adjust expected message
    });

    it('should return 409 if voter (NIN/VIN) already exists', async () => {
      const registrationData = {
        nin: 'EXISTINGNIN',
        vin: 'EXISTINGVIN' /* ...other valid fields */,
      };
      const conflictError = new Error('A voter with this NIN or VIN already exists.');
      conflictError.status = 409;
      conflictError.code = 'USER_ALREADY_EXISTS'; // Match potential error code

      // IMPORTANT: Ensure 'registerVoter' is correct
      const registerStub = sandbox.stub(authService, 'registerVoter').rejects(conflictError);

      const response = await request(app).post('/api/v1/auth/register').send(registrationData);

      expect(response.status).to.equal(409);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(conflictError.message);
      // expect(response.body.code).to.equal(conflictError.code); // Assert code if present
      expect(registerStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected server errors during registration', async () => {
      const registrationData = {
        /* ... valid registration data ... */
      };
      const serverError = new Error('Database connection failed');
      // IMPORTANT: Ensure 'registerVoter' is correct
      const registerStub = sandbox.stub(authService, 'registerVoter').rejects(serverError);

      const response = await request(app).post('/api/v1/auth/register').send(registrationData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error'); // Match generic error handler message
      expect(registerStub.calledOnce).to.be.true;
    });
  });

  // --- Login Route ---
  describe('POST /login', () => {
    it('should login a user successfully and return user data and token (MFA not required initially)', async () => {
      const loginData = { identifier: 'test.login@example.com', password: 'Password123!' };
      const serviceResult = {
        user: { id: 'logged-in-user-uuid', email: loginData.identifier, role: 'voter' },
        token: 'mock_jwt_token_for_login',
        mfaRequired: false,
      };
      // IMPORTANT: Ensure 'authenticateVoter' is the correct function name in authService
      const loginStub = sandbox.stub(authService, 'authenticateVoter').resolves(serviceResult);

      const response = await request(app).post('/api/v1/auth/login').send(loginData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Login successful');
      expect(response.body.data).to.exist;
      expect(response.body.data.token).to.equal(serviceResult.token);
      expect(response.body.data.mfaRequired).to.equal(false);
      expect(response.body.data.user).to.exist;
      expect(response.body.data.user.id).to.equal(serviceResult.user.id);
      expect(response.body.data.user.email).to.equal(loginData.identifier);

      expect(loginStub.calledOnceWith(loginData.identifier, loginData.password)).to.be.true;
    });

    it('should indicate MFA is required if enabled for the user', async () => {
      const loginData = { identifier: 'mfa-user@example.com', password: 'Password123!' };
      const serviceResult = {
        mfaRequired: true,
        userId: 'mfa-user-uuid', // Service might return userId to facilitate MFA step
      };
      // IMPORTANT: Ensure 'authenticateVoter' is correct
      const loginStub = sandbox.stub(authService, 'authenticateVoter').resolves(serviceResult);

      const response = await request(app).post('/api/v1/auth/login').send(loginData);

      expect(response.status).to.equal(200); // Successful request, indicates next step
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('MFA verification required');
      expect(response.body.data).to.exist;
      expect(response.body.data.mfaRequired).to.equal(true);
      expect(response.body.data.userId).to.equal(serviceResult.userId);
      expect(response.body.data.token).to.be.undefined; // No token returned yet
      expect(loginStub.calledOnce).to.be.true;
    });

    it('should return 400 for missing identifier or password', async () => {
      const invalidData = { password: 'Password123!' }; // Missing identifier
      const response = await request(app).post('/api/v1/auth/login').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors).to.be.an('array').that.has.length.greaterThan(0);
      expect(response.body.errors.some(e => e.msg.includes('Identifier is required'))).to.be.true;
    });

    it('should return 401 for invalid credentials (user not found or wrong password)', async () => {
      const loginData = { identifier: 'not-found@example.com', password: 'wrongpass' };
      const authError = new Error('Invalid credentials provided.');
      authError.status = 401;
      authError.code = 'INVALID_CREDENTIALS'; // Match potential error code
      // IMPORTANT: Ensure 'authenticateVoter' is correct
      const loginStub = sandbox.stub(authService, 'authenticateVoter').rejects(authError);

      const response = await request(app).post('/api/v1/auth/login').send(loginData);

      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(authError.message);
      expect(loginStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected server errors during login', async () => {
      const loginData = { identifier: 'test@example.com', password: 'Password123!' };
      const serverError = new Error('Cache service unavailable');
      // IMPORTANT: Ensure 'authenticateVoter' is correct
      const loginStub = sandbox.stub(authService, 'authenticateVoter').rejects(serverError);

      const response = await request(app).post('/api/v1/auth/login').send(loginData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(loginStub.calledOnce).to.be.true;
    });
  });

  // --- USSD Authentication Route ---
  describe('POST /ussd/authenticate', () => {
    it('should initiate USSD authentication successfully', async () => {
      const ussdAuthData = { identifier: '08012345678', phoneNumber: '08012345678' }; // Minimal data
      const serviceResult = { message: 'Authentication initiated via USSD. Check your phone.' };
      // IMPORTANT: Ensure 'authenticateVoterForUssd' is the correct function name
      const ussdAuthStub = sandbox
        .stub(authService, 'authenticateVoterForUssd')
        .resolves(serviceResult);

      const response = await request(app).post('/api/v1/auth/ussd/authenticate').send(ussdAuthData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      // No specific data expected in body based on this serviceResult

      // Verify service arguments
      expect(ussdAuthStub.calledOnceWith(ussdAuthData.identifier, ussdAuthData.phoneNumber)).to.be
        .true;
    });

    it('should return 400 for missing fields (e.g., phoneNumber)', async () => {
      const invalidData = { identifier: '08012345678' }; // Missing phoneNumber
      const response = await request(app).post('/api/v1/auth/ussd/authenticate').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors).to.be.an('array').that.has.length.greaterThan(0);
      expect(response.body.errors.some(e => e.msg.includes('Phone number is required'))).to.be.true;
    });

    it('should return 401 if voter credentials (NIN/VIN) are invalid in service', async () => {
      const ussdAuthData = { identifier: 'INVALID_ID', phoneNumber: '08099999999' }; // Example invalid data
      const error = new Error('Invalid NIN or VIN provided.');
      error.status = 401;
      // IMPORTANT: Verify service/method name
      const ussdAuthStub = sandbox
        .stub(authService, 'authenticateVoterForUssd') // Using authService as per first test case
        .rejects(error);

      const response = await request(app).post('/api/v1/auth/ussd/authenticate').send(ussdAuthData);

      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(ussdAuthStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during USSD initiation', async () => {
      const ussdAuthData = { identifier: '08012345678', phoneNumber: '08012345678' }; // Inline data
      const error = new Error('USSD Gateway Timeout');
      // IMPORTANT: Verify service/method name
      const ussdAuthStub = sandbox
        .stub(authService, 'authenticateVoterForUssd') // Sticking to authService
        .rejects(error);

      const response = await request(app).post('/api/v1/auth/ussd/authenticate').send(ussdAuthData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false; // REFINED assertion
      expect(response.body.message).to.equal('Internal Server Error'); // REFINED assertion
      expect(ussdAuthStub.calledOnce).to.be.true;
    });
  });

  // --- USSD Verify Session Route ---
  describe('POST /ussd/verify-session', () => {
    it('should verify USSD session and return auth token successfully', async () => {
      const verifyData = { sessionCode: 'VALID-USSD-SESSION-CODE' }; // Inline data
      const expectedResult = {
        user: { id: 'verified-ussd-user-uuid', nin: '12345678901', role: 'voter' },
        token: 'mock_jwt_token_for_ussd_verification',
      };
      // IMPORTANT: Ensure 'verifyUssdSessionAndLogin' is the correct function name
      const verifyStub = sandbox
        .stub(ussdAuthService, 'verifyUssdSessionAndLogin') // Assuming separate service for this
        .resolves(expectedResult);

      const response = await request(app).post('/api/v1/auth/ussd/verify-session').send(verifyData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('USSD session verified successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.token).to.equal(expectedResult.token);
      expect(response.body.data.user).to.exist;
      expect(response.body.data.user.id).to.equal(expectedResult.user.id);
      expect(response.body.data.user.role).to.equal(expectedResult.user.role);

      expect(verifyStub.calledOnceWith(verifyData.sessionCode)).to.be.true;
    });

    it('should return 400 for missing sessionCode', async () => {
      const invalidData = {}; // Missing sessionCode
      const response = await request(app)
        .post('/api/v1/auth/ussd/verify-session')
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Session code is required'))).to.be.true; // Refined error check
    });

    it('should return 401 for invalid or expired session code', async () => {
      const verifyData = { sessionCode: 'INVALID-OR-EXPIRED-CODE' }; // Inline data
      const error = new Error('Invalid or expired USSD session code.');
      error.status = 401;
      const verifyStub = sandbox.stub(ussdAuthService, 'verifyUssdSessionAndLogin').rejects(error);

      const response = await request(app).post('/api/v1/auth/ussd/verify-session').send(verifyData);

      expect(response.status).to.equal(401);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(verifyStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during session verification', async () => {
      const verifyData = { sessionCode: 'VALID-CODE-SERVER-ERROR' }; // Inline data
      const error = new Error('Redis connection error');
      const verifyStub = sandbox.stub(ussdAuthService, 'verifyUssdSessionAndLogin').rejects(error);

      const response = await request(app).post('/api/v1/auth/ussd/verify-session').send(verifyData);

      expect(response.status).to.equal(500);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error'); // Standard message
      expect(verifyStub.calledOnce).to.be.true;
    });
  });

  // --- Verify MFA Route ---
  describe('POST /verify-mfa', () => {
    it('should verify MFA token successfully and return auth token', async () => {
      const mfaData = { userId: 'mfa-user-uuid', token: '123456' }; // Inline data
      const expectedResult = {
        user: { id: mfaData.userId, role: 'voter', email: 'mfa-user@test.com' },
        token: 'mock_jwt_token_after_mfa_verification',
      };
      // IMPORTANT: Ensure 'verifyMfaLoginToken' is correct function name
      const verifyStub = sandbox.stub(mfaService, 'verifyMfaLoginToken').resolves(expectedResult);

      const response = await request(app).post('/api/v1/auth/verify-mfa').send(mfaData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('MFA verification successful.');
      expect(response.body.data).to.exist;
      expect(response.body.data.token).to.equal(expectedResult.token);
      expect(response.body.data.user?.id).to.equal(expectedResult.user.id);
      expect(response.body.data.user?.role).to.equal(expectedResult.user.role);

      expect(verifyStub.calledOnceWith(mfaData.userId, mfaData.token)).to.be.true;
    });

    it('should return 400 for missing userId or token', async () => {
      const invalidData = { userId: 'mfa-user-uuid' }; // Missing token
      const response = await request(app).post('/api/v1/auth/verify-mfa').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('MFA token is required'))).to.be.true; // Refined check
    });

    it('should return 401 for invalid or expired MFA token', async () => {
      const mfaData = { userId: 'mfa-user-uuid', token: 'invalid-token' }; // Inline data
      const error = new Error('Invalid or expired MFA token.');
      error.status = 401;
      const verifyStub = sandbox.stub(mfaService, 'verifyMfaLoginToken').rejects(error);

      const response = await request(app).post('/api/v1/auth/verify-mfa').send(mfaData);

      expect(response.status).to.equal(401);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(verifyStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during MFA verification', async () => {
      const mfaData = { userId: 'mfa-user-uuid', token: '123456' }; // Inline data
      const error = new Error('SMS provider error');
      const verifyStub = sandbox.stub(mfaService, 'verifyMfaLoginToken').rejects(error);

      const response = await request(app).post('/api/v1/auth/verify-mfa').send(mfaData);

      expect(response.status).to.equal(500);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(verifyStub.calledOnce).to.be.true;
    });
  });

  // --- Resend MFA Route ---
  describe('POST /resend-mfa', () => {
    it('should resend MFA token successfully', async () => {
      const resendData = { userId: 'mfa-user-uuid-resend' }; // Inline data
      // Service likely just resolves a simple message or void
      const serviceResult = { message: 'MFA token resent successfully.' };
      // IMPORTANT: Ensure 'resendMfaToken' is correct function name
      const resendStub = sandbox.stub(mfaService, 'resendMfaToken').resolves(serviceResult);

      const response = await request(app).post('/api/v1/auth/resend-mfa').send(resendData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      // Data might be null or empty, don't assert deep.equal
      expect(response.body.data).to.not.exist; // Or .be.null or .deep.equal({}) if defined

      expect(resendStub.calledOnceWith(resendData.userId)).to.be.true;
    });

    it('should return 400 for missing userId', async () => {
      const invalidData = {}; // Missing userId
      const response = await request(app).post('/api/v1/auth/resend-mfa').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('User ID is required'))).to.be.true; // Refined check
    });

    it('should return 404 if user ID not found', async () => {
      const resendData = { userId: 'not-found-user-uuid' }; // Inline data
      const error = new Error('User not found.');
      error.status = 404;
      const resendStub = sandbox.stub(mfaService, 'resendMfaToken').rejects(error);

      const response = await request(app).post('/api/v1/auth/resend-mfa').send(resendData);

      expect(response.status).to.equal(404);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(resendStub.calledOnce).to.be.true;
    });

    it('should return 429 if rate limited', async () => {
      const resendData = { userId: 'rate-limited-user-uuid' }; // Inline data
      const error = new Error('Too many MFA resend requests. Please try again later.');
      error.status = 429;
      const resendStub = sandbox.stub(mfaService, 'resendMfaToken').rejects(error);

      const response = await request(app).post('/api/v1/auth/resend-mfa').send(resendData);

      expect(response.status).to.equal(429);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(resendStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during MFA resend', async () => {
      const resendData = { userId: 'mfa-user-uuid-resend' }; // Inline data
      const error = new Error('Notification service failure');
      const resendStub = sandbox.stub(mfaService, 'resendMfaToken').rejects(error);

      const response = await request(app).post('/api/v1/auth/resend-mfa').send(resendData);

      expect(response.status).to.equal(500);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(resendStub.calledOnce).to.be.true;
    });
  });

  // --- Forgot Password Route ---
  describe('POST /forgot-password', () => {
    it('should initiate password reset successfully', async () => {
      const forgotData = { identifier: 'user.exists@example.com' }; // Inline data
      const serviceResult = {
        message: 'Password reset instructions sent to registered contact method.',
      };
      // IMPORTANT: Ensure 'forgotPassword' is correct function name
      const forgotStub = sandbox.stub(authService, 'forgotPassword').resolves(serviceResult);

      const response = await request(app).post('/api/v1/auth/forgot-password').send(forgotData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      expect(response.body.data).to.not.exist; // Usually no data returned

      expect(forgotStub.calledOnceWith(forgotData.identifier)).to.be.true;
    });

    it('should return 400 for missing identifier', async () => {
      const invalidData = {}; // Missing identifier
      const response = await request(app).post('/api/v1/auth/forgot-password').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Identifier is required'))).to.be.true; // Refined check
    });

    it('should return 404 if identifier not found', async () => {
      const forgotData = { identifier: 'not.found@example.com' }; // Inline data
      const error = new Error('Identifier not found.');
      error.status = 404;
      const forgotStub = sandbox.stub(authService, 'forgotPassword').rejects(error);

      const response = await request(app).post('/api/v1/auth/forgot-password').send(forgotData);

      expect(response.status).to.equal(404);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(forgotStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during forgot password process', async () => {
      const forgotData = { identifier: 'user.exists@example.com' }; // Inline data
      const error = new Error('Email service error');
      const forgotStub = sandbox.stub(authService, 'forgotPassword').rejects(error);

      const response = await request(app).post('/api/v1/auth/forgot-password').send(forgotData);

      expect(response.status).to.equal(500);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(forgotStub.calledOnce).to.be.true;
    });
  });

  // --- Reset Password Route ---
  describe('POST /reset-password', () => {
    it('should reset password successfully', async () => {
      const resetData = { token: 'valid-reset-token', newPassword: 'NewSecurePassword123!' }; // Inline data
      const serviceResult = { message: 'Password has been reset successfully.' };
      // IMPORTANT: Ensure 'resetPassword' is correct function name
      const resetStub = sandbox.stub(authService, 'resetPassword').resolves(serviceResult);

      const response = await request(app).post('/api/v1/auth/reset-password').send(resetData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      expect(response.body.data).to.not.exist; // Usually no data

      expect(resetStub.calledOnceWith(resetData.token, resetData.newPassword)).to.be.true;
    });

    it('should return 400 for missing token or newPassword', async () => {
      const invalidData = { token: 'valid-reset-token' }; // Missing newPassword
      const response = await request(app).post('/api/v1/auth/reset-password').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('New password is required'))).to.be.true; // Refined check
    });

    it('should return 400 for weak password', async () => {
      const invalidData = { token: 'valid-reset-token', newPassword: 'weak' }; // Inline data
      const response = await request(app).post('/api/v1/auth/reset-password').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(
        response.body.errors.some(e => e.msg.includes('Password must be at least 8 characters')),
      ).to.be.true; // Refined check
    });

    it('should return 401 for invalid or expired reset token', async () => {
      const resetData = { token: 'invalid-reset-token', newPassword: 'NewSecurePassword123!' }; // Inline data
      const error = new Error('Invalid or expired password reset token.');
      error.status = 401;
      const resetStub = sandbox.stub(authService, 'resetPassword').rejects(error);

      const response = await request(app).post('/api/v1/auth/reset-password').send(resetData);

      expect(response.status).to.equal(401);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(resetStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during password reset', async () => {
      const resetData = { token: 'valid-reset-token', newPassword: 'NewSecurePassword123!' }; // Inline data
      const error = new Error('Database update failed');
      const resetStub = sandbox.stub(authService, 'resetPassword').rejects(error);

      const response = await request(app).post('/api/v1/auth/reset-password').send(resetData);

      expect(response.status).to.equal(500);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(resetStub.calledOnce).to.be.true;
    });
  });

  // --- Refresh Token Route ---
  describe('POST /refresh-token', () => {
    it('should refresh token successfully', async () => {
      const refreshData = { refreshToken: 'valid-refresh-token-string' }; // Inline data
      const expectedResult = {
        accessToken: 'new_mock_access_token',
        // Optionally include user data if needed by frontend
        user: { id: 'user-id-refreshed', role: 'voter' },
      };
      // IMPORTANT: Ensure 'refreshToken' is correct function name
      const refreshStub = sandbox.stub(authService, 'refreshToken').resolves(expectedResult);

      const response = await request(app).post('/api/v1/auth/refresh-token').send(refreshData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Token refreshed successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.accessToken).to.equal(expectedResult.accessToken);
      expect(response.body.data.user?.id).to.equal(expectedResult.user.id);

      expect(refreshStub.calledOnceWith(refreshData.refreshToken)).to.be.true;
    });

    it('should return 400 for missing refresh token', async () => {
      const invalidData = {}; // Missing refreshToken
      const response = await request(app).post('/api/v1/auth/refresh-token').send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('Refresh token is required'))).to.be
        .true; // Refined check
    });

    it('should return 401 for invalid or expired refresh token', async () => {
      const refreshData = { refreshToken: 'invalid-refresh-token' }; // Inline data
      const error = new Error('Invalid or expired refresh token.');
      error.status = 401;
      const refreshStub = sandbox.stub(authService, 'refreshToken').rejects(error);

      const response = await request(app).post('/api/v1/auth/refresh-token').send(refreshData);

      expect(response.status).to.equal(401);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(refreshStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during token refresh', async () => {
      const refreshData = { refreshToken: 'valid-refresh-token-string' }; // Inline data
      const error = new Error('Token signing error');
      const refreshStub = sandbox.stub(authService, 'refreshToken').rejects(error);

      const response = await request(app).post('/api/v1/auth/refresh-token').send(refreshData);

      expect(response.status).to.equal(500);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(refreshStub.calledOnce).to.be.true;
    });
  });

  // --- Get Current User Route (Protected) ---
  describe('GET /me', () => {
    it('should return current user details successfully', async () => {
      const userIdFromToken = 'test-user-id'; // From generatedAuthToken payload
      const expectedUser = {
        id: userIdFromToken,
        role: 'voter',
        nin: 'mock-nin-for-me',
        vin: 'mock-vin-for-me',
        email: 'test.user@example.com',
        // ... other relevant fields, excluding password
      };
      // Assuming a service method to fetch user details by ID
      const getUserStub = sandbox.stub(userService, 'getUserById').resolves(expectedUser);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${generatedAuthToken}`);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Current user retrieved successfully.');
      expect(response.body.data).to.exist;
      expect(response.body.data.id).to.equal(expectedUser.id);
      expect(response.body.data.role).to.equal(expectedUser.role);
      expect(response.body.data.email).to.equal(expectedUser.email);
      expect(response.body.data.nin).to.equal(expectedUser.nin);
      // Avoid checking password or sensitive fields not present in expectedUser

      expect(getUserStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 401 if no token is provided', async () => {
      const response = await request(app).get('/api/v1/auth/me');
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token'); // Or specific middleware message
    });

    it('should return 401 if token is invalid or expired', async () => {
      const invalidToken = 'Bearer invalid.token.string';
      const response = await request(app).get('/api/v1/auth/me').set('Authorization', invalidToken);
      expect(response.status).to.equal(401);
      // Message might vary based on JWT library/error handling
      expect(response.body.message).to.contain('Invalid token'); // Or specific middleware message
    });

    it('should return 404 if user from token not found in DB', async () => {
      const userIdFromToken = 'test-user-id';
      const getUserStub = sandbox.stub(userService, 'getUserById').resolves(null); // Simulate user not found

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${generatedAuthToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false; // REFINED assertion
      expect(response.body.message).to.contain('User not found'); // Match error handler message
      expect(getUserStub.calledOnceWith(userIdFromToken)).to.be.true;
    });
  });

  // --- Logout Route (Protected) ---
  describe('POST /logout', () => {
    it('should logout user successfully (invalidate token if using blacklist)', async () => {
      // Stub the service method (if any logic exists, e.g., blacklisting refresh token)
      const serviceResult = { message: 'Logout successful.' };
      // IMPORTANT: Ensure 'logoutUser' is correct function name
      const logoutStub = sandbox.stub(authService, 'logoutUser').resolves(serviceResult);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(); // No body needed usually

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      expect(response.body.data).to.not.exist; // Usually no data

      // Check if service method was called with user ID from token
      const userIdFromToken = 'test-user-id';
      expect(logoutStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 401 if no token is provided', async () => {
      const response = await request(app).post('/api/v1/auth/logout').send();
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    // Add test for invalid token if needed
    it('should return 401 if token is invalid', async () => {
      const invalidToken = 'Bearer invalid.token';
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', invalidToken)
        .send();
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('Invalid token');
    });
  });

  // --- MFA Setup Route (Protected) ---
  describe('POST /mfa/setup', () => {
    it('should initiate MFA setup successfully and return setup details (e.g., QR code URI)', async () => {
      const userIdFromToken = 'test-user-id';
      const expectedSetupDetails = {
        secret: 'MOCKSECRETGENERATED', // The generated secret
        qrCodeUri:
          'otpauth://totp/YourApp:test.user@example.com?secret=MOCKSECRETGENERATED&issuer=YourApp', // Example URI
      };
      // IMPORTANT: Ensure 'initiateMfaSetup' is correct function name
      const setupStub = sandbox.stub(mfaService, 'initiateMfaSetup').resolves(expectedSetupDetails);

      const response = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(); // No body needed

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(
        'MFA setup initiated. Scan QR code or enter secret in your authenticator app.',
      );
      expect(response.body.data).to.exist;
      expect(response.body.data.secret).to.equal(expectedSetupDetails.secret);
      expect(response.body.data.qrCodeUri).to.equal(expectedSetupDetails.qrCodeUri);

      expect(setupStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 400 if MFA is already enabled for the user', async () => {
      const userIdFromToken = 'test-user-id';
      const error = new Error('MFA is already enabled for this account.');
      error.status = 400;
      const setupStub = sandbox.stub(mfaService, 'initiateMfaSetup').rejects(error);

      const response = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send();

      expect(response.status).to.equal(400);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(setupStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).post('/api/v1/auth/mfa/setup').send();
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected service errors', async () => {
      const error = new Error('QR Code Generation Failed');
      const setupStub = sandbox.stub(mfaService, 'initiateMfaSetup').rejects(error);

      const response = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send();

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(setupStub.calledOnce).to.be.true;
    });
  });

  // --- MFA Verify Setup Route (Protected) ---
  describe('POST /mfa/verify-setup', () => {
    it('should verify MFA setup token successfully and enable MFA', async () => {
      const userIdFromToken = 'test-user-id';
      const verifyData = { token: '123456' }; // Inline data for MFA code
      const serviceResult = { message: 'MFA enabled successfully.' };
      // IMPORTANT: Ensure 'verifyAndEnableMfa' is correct function name
      const verifyStub = sandbox.stub(mfaService, 'verifyAndEnableMfa').resolves(serviceResult);

      const response = await request(app)
        .post('/api/v1/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(verifyData);

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      expect(response.body.data).to.not.exist; // Usually no data returned

      expect(verifyStub.calledOnceWith(userIdFromToken, verifyData.token)).to.be.true;
    });

    it('should return 400 for missing token', async () => {
      const invalidData = {}; // Missing token
      const response = await request(app)
        .post('/api/v1/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.some(e => e.msg.includes('MFA token is required'))).to.be.true; // Refined check
    });

    it('should return 401 for invalid MFA setup token', async () => {
      const userIdFromToken = 'test-user-id';
      const verifyData = { token: 'invalid-token' }; // Inline data
      const error = new Error('Invalid MFA token provided.');
      error.status = 401;
      const verifyStub = sandbox.stub(mfaService, 'verifyAndEnableMfa').rejects(error);

      const response = await request(app)
        .post('/api/v1/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(verifyData);

      expect(response.status).to.equal(401);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(verifyStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const verifyData = { token: '123456' }; // Inline data
      const response = await request(app).post('/api/v1/auth/mfa/verify-setup').send(verifyData);
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected service errors', async () => {
      const userIdFromToken = 'test-user-id';
      const verifyData = { token: '123456' };
      const error = new Error('Database update error');
      const verifyStub = sandbox.stub(mfaService, 'verifyAndEnableMfa').rejects(error);

      const response = await request(app)
        .post('/api/v1/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(verifyData);

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(verifyStub.calledOnce).to.be.true;
    });
  });

  // --- MFA Disable Route (Protected) ---
  describe('DELETE /mfa/disable', () => {
    // Note: This route might require current password or MFA token in body for security.
    // Adjust tests based on your actual implementation and validation rules.
    it('should disable MFA successfully (assuming no extra verification needed)', async () => {
      const userIdFromToken = 'test-user-id';
      const serviceResult = { message: 'MFA disabled successfully.' };
      // IMPORTANT: Ensure 'disableMfa' is correct function name
      const disableStub = sandbox.stub(mfaService, 'disableMfa').resolves(serviceResult);

      const response = await request(app)
        .delete('/api/v1/auth/mfa/disable')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(); // Assuming no body needed for this test case

      expect(response.status).to.equal(200);
      // REFINED assertions:
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal(serviceResult.message);
      expect(response.body.data).to.not.exist;

      // Adjust stub call check based on service requirements (e.g., might need password)
      expect(disableStub.calledOnceWith(userIdFromToken /*, potentially password or token */)).to.be
        .true;
    });

    // Example test IF password is required in body:
    // it('should disable MFA successfully with correct password', async () => {
    //   const userIdFromToken = 'test-user-id';
    //   const disableData = { currentPassword: 'correctPassword1!' }; // Password needed
    //   const serviceResult = { message: 'MFA disabled successfully.' };
    //   const disableStub = sandbox.stub(mfaService, 'disableMfa').resolves(serviceResult);

    //   const response = await request(app)
    //     .delete('/api/v1/auth/mfa/disable')
    //     .set('Authorization', `Bearer ${generatedAuthToken}`)
    //     .send(disableData);

    //   expect(response.status).to.equal(200);
    //   // ... assertions ...
    //   expect(disableStub.calledOnceWith(userIdFromToken, disableData.currentPassword)).to.be.true;
    // });

    // Example test IF password is required AND is incorrect:
    // it('should return 401 if password validation fails', async () => {
    //   const userIdFromToken = 'test-user-id';
    //   const disableData = { currentPassword: 'wrongPassword' };
    //   const error = new Error('Incorrect password provided.');
    //   error.status = 401;
    //   const disableStub = sandbox.stub(mfaService, 'disableMfa').rejects(error);

    //   const response = await request(app)
    //     .delete('/api/v1/auth/mfa/disable')
    //     .set('Authorization', `Bearer ${generatedAuthToken}`)
    //     .send(disableData);

    //   expect(response.status).to.equal(401);
    //   // ... assertions ...
    // });

    it('should return 400 if MFA is not currently enabled', async () => {
      const userIdFromToken = 'test-user-id';
      const error = new Error('MFA is not enabled for this account.');
      error.status = 400;
      const disableStub = sandbox.stub(mfaService, 'disableMfa').rejects(error);

      const response = await request(app)
        .delete('/api/v1/auth/mfa/disable')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(); // Assuming no body needed

      expect(response.status).to.equal(400);
      // REFINED assertions:
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(error.message);
      expect(disableStub.calledOnce).to.be.true;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).delete('/api/v1/auth/mfa/disable').send();
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 500 for unexpected service errors', async () => {
      const error = new Error('DB update failed');
      const disableStub = sandbox.stub(mfaService, 'disableMfa').rejects(error);

      const response = await request(app)
        .delete('/api/v1/auth/mfa/disable')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send();

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Internal Server Error');
      expect(disableStub.calledOnce).to.be.true;
    });
  });
}); // End describe block for Auth Routes
