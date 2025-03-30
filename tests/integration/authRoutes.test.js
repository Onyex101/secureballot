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
    generatedAuthToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

    // Common stubs needed across tests can go here if any
  });

  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });

  // --- Registration Route ---
  describe('POST /register', () => {
    it('should register a new voter successfully and return user data and token', async () => {
      const registrationData = testData.authRoutes['/api/v1/auth/register'].requestBody.success;
      const expectedResult = {
        user: { id: 'new-user-uuid', email: registrationData.email, nin: registrationData.nin /* ... other fields ... */ },
        token: 'mock_jwt_token_for_registration',
      };

      // Stub the service method
      const registerStub = sandbox.stub(authService, 'registerUser').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registrationData);

      expect(response.status).to.equal(201);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Registration successful. Please check your phone for MFA setup instructions.', // Adjust message if needed
        data: expectedResult,
      });
      expect(registerStub.calledOnceWith(registrationData)).to.be.true;
    });

    it('should return 400 if required fields (e.g., NIN) are missing', async () => {
       const invalidData = { ...testData.authRoutes['/api/v1/auth/register'].requestBody.success, nin: undefined };

       const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData);

       expect(response.status).to.equal(400);
       expect(response.body.success).to.be.false;
       expect(response.body.message).to.equal('Validation Error');
       expect(response.body.errors).to.be.an('array').that.is.not.empty;
       // Check for specific error message if possible
       expect(response.body.errors[0].msg).to.contain('NIN is required');
    });

     it('should return 400 for invalid input format (e.g., invalid NIN length)', async () => {
       const invalidData = { ...testData.authRoutes['/api/v1/auth/register'].requestBody.success, nin: '123' };

       const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData);

       expect(response.status).to.equal(400);
       expect(response.body.success).to.be.false;
       expect(response.body.errors[0].msg).to.contain('NIN must be 11 characters');
    });

    // Test case from skeleton - enhanced slightly
     it('should return 409 if voter (NIN/VIN) already exists', async () => {
      const registrationData = testData.authRoutes['/api/v1/auth/register'].requestBody.existingNIN;

      // Stub the service method to simulate conflict
       const registerStub = sandbox.stub(authService, 'registerUser').rejects({ status: 409, message: 'A voter with this NIN or VIN already exists.' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registrationData);

      expect(response.status).to.equal(409);
      expect(response.body).to.deep.equal({
        success: false,
        message: 'A voter with this NIN or VIN already exists.',
      });
      expect(registerStub.calledOnce).to.be.true;
    });

     it('should return 500 for unexpected server errors during registration', async () => {
        const registrationData = testData.authRoutes['/api/v1/auth/register'].requestBody.success;
        const error = new Error('Database connection failed');
        const registerStub = sandbox.stub(authService, 'registerUser').rejects(error);

        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(registrationData);

        expect(response.status).to.equal(500);
        expect(response.body).to.deep.equal({
            success: false,
            message: 'An unexpected error occurred',
            // error: error.message // Depending on error handling middleware configuration
        });
        expect(registerStub.calledOnce).to.be.true;
    });
  });

  // --- Login Route ---
  describe('POST /login', () => {
    it('should login a user successfully and return user data and token (MFA not required initially)', async () => {
      const loginData = testData.authRoutes['/api/v1/auth/login'].requestBody.success;
      const expectedResult = {
        user: { id: 'logged-in-user-uuid', email: 'test@example.com', role: 'voter' /* other fields */ },
        token: 'mock_jwt_token_for_login',
        mfaRequired: false, // Assuming MFA verification is a separate step
      };

       const loginStub = sandbox.stub(authService, 'loginUser').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Login successful',
        data: expectedResult,
      });
      expect(loginStub.calledOnceWith(loginData.identifier, loginData.password)).to.be.true;
    });

     it('should indicate MFA is required if enabled for the user', async () => {
      const loginData = testData.authRoutes['/api/v1/auth/login'].requestBody.successMfaEnabled;
       const expectedResult = {
         mfaRequired: true,
         userId: 'mfa-user-uuid', // Need userId to proceed with MFA verification
       };

       const loginStub = sandbox.stub(authService, 'loginUser').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).to.equal(200); // Still 200, but indicates MFA step needed
      expect(response.body).to.deep.equal({
        success: true,
        message: 'MFA verification required',
        data: expectedResult,
      });
      expect(loginStub.calledOnce).to.be.true;
    });

    it('should return 400 for missing identifier or password', async () => {
        const invalidData = { ...testData.authRoutes['/api/v1/auth/login'].requestBody.success, identifier: undefined };
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(invalidData);

        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal('Validation Error');
        expect(response.body.errors[0].msg).to.contain('Identifier is required');
    });

    // Test case from skeleton - enhanced slightly
    it('should return 401 for invalid credentials (user not found or wrong password)', async () => {
      const loginData = testData.authRoutes['/api/v1/auth/login'].requestBody.notFound;

      const loginStub = sandbox.stub(authService, 'loginUser').rejects({ status: 401, message: 'Invalid credentials provided.' });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).to.equal(401);
      expect(response.body).to.deep.equal({
        success: false,
        message: 'Invalid credentials provided.',
      });
      expect(loginStub.calledOnce).to.be.true;
    });

     it('should return 500 for unexpected server errors during login', async () => {
        const loginData = testData.authRoutes['/api/v1/auth/login'].requestBody.success;
        const error = new Error('Cache service unavailable');
        const loginStub = sandbox.stub(authService, 'loginUser').rejects(error);

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(loginData);

        expect(response.status).to.equal(500);
        expect(response.body).to.deep.equal({
            success: false,
            message: 'An unexpected error occurred',
        });
        expect(loginStub.calledOnce).to.be.true;
    });
  });

  // --- USSD Authentication Route ---
  describe('POST /ussd/authenticate', () => {
      it('should initiate USSD authentication successfully', async () => {
          const ussdAuthData = testData.authRoutes['/api/v1/auth/ussd/authenticate'].requestBody.success;
          const expectedResult = { message: "Authentication initiated via USSD. Check your phone." }; // Example success message from service

          const ussdAuthStub = sandbox.stub(ussdAuthService, 'initiateUssdAuthentication').resolves(expectedResult);

          const response = await request(app)
              .post('/api/v1/auth/ussd/authenticate')
              .send(ussdAuthData);

          expect(response.status).to.equal(200);
          expect(response.body).to.deep.equal({
              success: true,
              message: expectedResult.message,
              // data might be null or contain minimal info
          });
          expect(ussdAuthStub.calledOnceWith(ussdAuthData)).to.be.true;
      });

      it('should return 400 for missing fields (e.g., phoneNumber)', async () => {
          const invalidData = { ...testData.authRoutes['/api/v1/auth/ussd/authenticate'].requestBody.success, phoneNumber: undefined };
          const response = await request(app)
              .post('/api/v1/auth/ussd/authenticate')
              .send(invalidData);

          expect(response.status).to.equal(400);
          expect(response.body.success).to.be.false;
          expect(response.body.message).to.equal('Validation Error');
          expect(response.body.errors[0].msg).to.contain('Phone number is required');
      });

      it('should return 401 if voter credentials (NIN/VIN) are invalid', async () => {
          const ussdAuthData = testData.authRoutes['/api/v1/auth/ussd/authenticate'].requestBody.invalidCredentials;
          const error = { status: 401, message: 'Invalid NIN or VIN provided.' };
          const ussdAuthStub = sandbox.stub(ussdAuthService, 'initiateUssdAuthentication').rejects(error);

          const response = await request(app)
              .post('/api/v1/auth/ussd/authenticate')
              .send(ussdAuthData);

          expect(response.status).to.equal(401);
          expect(response.body).to.deep.equal({
              success: false,
              message: error.message,
          });
          expect(ussdAuthStub.calledOnce).to.be.true;
      });

       it('should return 500 for unexpected errors during USSD initiation', async () => {
          const ussdAuthData = testData.authRoutes['/api/v1/auth/ussd/authenticate'].requestBody.success;
          const error = new Error('USSD Gateway Timeout');
          const ussdAuthStub = sandbox.stub(ussdAuthService, 'initiateUssdAuthentication').rejects(error);

           const response = await request(app)
              .post('/api/v1/auth/ussd/authenticate')
              .send(ussdAuthData);

          expect(response.status).to.equal(500);
          expect(response.body).to.deep.equal({
              success: false,
              message: 'An unexpected error occurred',
          });
          expect(ussdAuthStub.calledOnce).to.be.true;
      });
  });

  // --- USSD Verify Session Route ---
  describe('POST /ussd/verify-session', () => {
      it('should verify USSD session and return auth token successfully', async () => {
          const verifyData = testData.authRoutes['/api/v1/auth/ussd/verify-session'].requestBody.success;
          const expectedResult = {
              user: { id: 'verified-ussd-user-uuid', nin: '12345678901', role: 'voter' },
              token: 'mock_jwt_token_for_ussd_verification'
          };
          const verifyStub = sandbox.stub(ussdAuthService, 'verifyUssdSessionAndLogin').resolves(expectedResult);

          const response = await request(app)
              .post('/api/v1/auth/ussd/verify-session')
              .send(verifyData);

          expect(response.status).to.equal(200);
           expect(response.body).to.deep.equal({
              success: true,
              message: 'USSD session verified successfully.',
              data: expectedResult
          });
          expect(verifyStub.calledOnceWith(verifyData.sessionCode)).to.be.true;
      });

      it('should return 400 for missing sessionCode', async () => {
          const invalidData = { sessionCode: undefined };
          const response = await request(app)
              .post('/api/v1/auth/ussd/verify-session')
              .send(invalidData);

          expect(response.status).to.equal(400);
           expect(response.body.success).to.be.false;
           expect(response.body.message).to.equal('Validation Error');
           expect(response.body.errors[0].msg).to.contain('Session code is required');
      });

      it('should return 401 for invalid or expired session code', async () => {
          const verifyData = testData.authRoutes['/api/v1/auth/ussd/verify-session'].requestBody.invalidCode;
           const error = { status: 401, message: 'Invalid or expired USSD session code.' };
           const verifyStub = sandbox.stub(ussdAuthService, 'verifyUssdSessionAndLogin').rejects(error);

           const response = await request(app)
              .post('/api/v1/auth/ussd/verify-session')
              .send(verifyData);

          expect(response.status).to.equal(401);
          expect(response.body).to.deep.equal({
              success: false,
              message: error.message,
          });
          expect(verifyStub.calledOnce).to.be.true;
      });

      it('should return 500 for unexpected errors during session verification', async () => {
           const verifyData = testData.authRoutes['/api/v1/auth/ussd/verify-session'].requestBody.success;
           const error = new Error('Redis connection error');
           const verifyStub = sandbox.stub(ussdAuthService, 'verifyUssdSessionAndLogin').rejects(error);

            const response = await request(app)
              .post('/api/v1/auth/ussd/verify-session')
              .send(verifyData);

          expect(response.status).to.equal(500);
           expect(response.body).to.deep.equal({
              success: false,
              message: 'An unexpected error occurred',
          });
          expect(verifyStub.calledOnce).to.be.true;
      });
  });

  // --- Verify MFA Route ---
  describe('POST /verify-mfa', () => {
    it('should verify MFA token successfully and return auth token', async () => {
      const mfaData = testData.authRoutes['/api/v1/auth/verify-mfa'].requestBody.success;
      const expectedResult = {
        user: { id: mfaData.userId, role: 'voter', /* other user details */ },
        token: 'mock_jwt_token_after_mfa_verification',
      };
      const verifyStub = sandbox.stub(mfaService, 'verifyMfaLoginToken').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/auth/verify-mfa')
        .send(mfaData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'MFA verification successful.',
        data: expectedResult,
      });
      expect(verifyStub.calledOnceWith(mfaData.userId, mfaData.token)).to.be.true;
    });

    it('should return 400 for missing userId or token', async () => {
      const invalidData = { ...testData.authRoutes['/api/v1/auth/verify-mfa'].requestBody.success, token: undefined };
      const response = await request(app)
        .post('/api/v1/auth/verify-mfa')
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.errors[0].msg).to.contain('MFA token is required');
    });

     it('should return 401 for invalid or expired MFA token', async () => {
      const mfaData = testData.authRoutes['/api/v1/auth/verify-mfa'].requestBody.invalidToken;
      const error = { status: 401, message: 'Invalid or expired MFA token.' };
      const verifyStub = sandbox.stub(mfaService, 'verifyMfaLoginToken').rejects(error);

       const response = await request(app)
        .post('/api/v1/auth/verify-mfa')
        .send(mfaData);

      expect(response.status).to.equal(401);
       expect(response.body).to.deep.equal({
        success: false,
        message: error.message,
      });
      expect(verifyStub.calledOnce).to.be.true;
    });

     it('should return 500 for unexpected errors during MFA verification', async () => {
      const mfaData = testData.authRoutes['/api/v1/auth/verify-mfa'].requestBody.success;
       const error = new Error('SMS provider error');
       const verifyStub = sandbox.stub(mfaService, 'verifyMfaLoginToken').rejects(error);

        const response = await request(app)
        .post('/api/v1/auth/verify-mfa')
        .send(mfaData);

      expect(response.status).to.equal(500);
      expect(response.body).to.deep.equal({
        success: false,
        message: 'An unexpected error occurred',
      });
      expect(verifyStub.calledOnce).to.be.true;
    });
  });

  // --- Resend MFA Route ---
  describe('POST /resend-mfa', () => {
     it('should resend MFA token successfully', async () => {
      const resendData = testData.authRoutes['/api/v1/auth/resend-mfa'].requestBody.success;
      const resendStub = sandbox.stub(mfaService, 'resendMfaToken').resolves({ message: 'MFA token resent successfully.' });

      const response = await request(app)
        .post('/api/v1/auth/resend-mfa')
        .send(resendData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'MFA token resent successfully.',
        // data might be null or empty
      });
      expect(resendStub.calledOnceWith(resendData.userId)).to.be.true;
    });

     it('should return 400 for missing userId', async () => {
      const invalidData = { userId: undefined };
       const response = await request(app)
        .post('/api/v1/auth/resend-mfa')
        .send(invalidData);

      expect(response.status).to.equal(400);
       expect(response.body.success).to.be.false;
       expect(response.body.errors[0].msg).to.contain('User ID is required');
    });

     it('should return 404 if user ID not found', async () => {
       const resendData = testData.authRoutes['/api/v1/auth/resend-mfa'].requestBody.notFound;
       const error = { status: 404, message: 'User not found.' };
       const resendStub = sandbox.stub(mfaService, 'resendMfaToken').rejects(error);

       const response = await request(app)
        .post('/api/v1/auth/resend-mfa')
        .send(resendData);

       expect(response.status).to.equal(404);
       expect(response.body).to.deep.equal({
        success: false,
        message: error.message,
      });
       expect(resendStub.calledOnce).to.be.true;
    });

     it('should return 429 if rate limited', async () => {
        // Note: Testing actual rate limiting might require specific setup or mocking of the rate limiter middleware itself.
        // This example assumes the service layer handles and throws a specific error for rate limits.
       const resendData = testData.authRoutes['/api/v1/auth/resend-mfa'].requestBody.rateLimited;
       const error = { status: 429, message: 'Too many MFA resend requests. Please try again later.' };
       const resendStub = sandbox.stub(mfaService, 'resendMfaToken').rejects(error);

        const response = await request(app)
        .post('/api/v1/auth/resend-mfa')
        .send(resendData);

       expect(response.status).to.equal(429);
        expect(response.body).to.deep.equal({
        success: false,
        message: error.message,
      });
       expect(resendStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during MFA resend', async () => {
       const resendData = testData.authRoutes['/api/v1/auth/resend-mfa'].requestBody.success;
       const error = new Error('Notification service failure');
       const resendStub = sandbox.stub(mfaService, 'resendMfaToken').rejects(error);

        const response = await request(app)
        .post('/api/v1/auth/resend-mfa')
        .send(resendData);

      expect(response.status).to.equal(500);
       expect(response.body).to.deep.equal({
        success: false,
        message: 'An unexpected error occurred',
      });
       expect(resendStub.calledOnce).to.be.true;
    });
  });

  // --- Forgot Password Route ---
  describe('POST /forgot-password', () => {
    it('should initiate password reset successfully', async () => {
      const forgotData = testData.authRoutes['/api/v1/auth/forgot-password'].requestBody.success;
      const forgotStub = sandbox.stub(authService, 'forgotPassword').resolves({ message: 'Password reset instructions sent to registered contact method.' });

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send(forgotData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Password reset instructions sent to registered contact method.',
      });
      expect(forgotStub.calledOnceWith(forgotData.identifier)).to.be.true;
    });

    it('should return 400 for missing identifier', async () => {
      const invalidData = { identifier: undefined };
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.errors[0].msg).to.contain('Identifier is required');
    });

    it('should return 404 if identifier not found', async () => {
      const forgotData = testData.authRoutes['/api/v1/auth/forgot-password'].requestBody.notFound;
      const error = { status: 404, message: 'Identifier not found.' };
      const forgotStub = sandbox.stub(authService, 'forgotPassword').rejects(error);

       const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send(forgotData);

      expect(response.status).to.equal(404);
       expect(response.body).to.deep.equal({
        success: false,
        message: error.message,
      });
      expect(forgotStub.calledOnce).to.be.true;
    });

     it('should return 500 for unexpected errors during forgot password process', async () => {
       const forgotData = testData.authRoutes['/api/v1/auth/forgot-password'].requestBody.success;
       const error = new Error('Email service error');
       const forgotStub = sandbox.stub(authService, 'forgotPassword').rejects(error);

       const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send(forgotData);

      expect(response.status).to.equal(500);
        expect(response.body).to.deep.equal({
        success: false,
        message: 'An unexpected error occurred',
      });
      expect(forgotStub.calledOnce).to.be.true;
    });
  });

  // --- Reset Password Route ---
  describe('POST /reset-password', () => {
     it('should reset password successfully', async () => {
      const resetData = testData.authRoutes['/api/v1/auth/reset-password'].requestBody.success;
      const resetStub = sandbox.stub(authService, 'resetPassword').resolves({ message: 'Password has been reset successfully.' });

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send(resetData);

      expect(response.status).to.equal(200);
       expect(response.body).to.deep.equal({
        success: true,
        message: 'Password has been reset successfully.',
      });
      expect(resetStub.calledOnceWith(resetData.token, resetData.newPassword)).to.be.true;
    });

     it('should return 400 for missing token or newPassword', async () => {
       const invalidData = { ...testData.authRoutes['/api/v1/auth/reset-password'].requestBody.success, token: undefined };
       const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
       expect(response.body.errors[0].msg).to.contain('Reset token is required');
    });

     it('should return 400 for weak password', async () => {
        const invalidData = { ...testData.authRoutes['/api/v1/auth/reset-password'].requestBody.success, newPassword: 'weak' };
       const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send(invalidData);

        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.errors[0].msg).to.contain('Password must be at least 8 characters');
    });

     it('should return 401 for invalid or expired reset token', async () => {
       const resetData = testData.authRoutes['/api/v1/auth/reset-password'].requestBody.invalidToken;
       const error = { status: 401, message: 'Invalid or expired password reset token.' };
       const resetStub = sandbox.stub(authService, 'resetPassword').rejects(error);

       const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send(resetData);

      expect(response.status).to.equal(401);
        expect(response.body).to.deep.equal({
        success: false,
        message: error.message,
      });
       expect(resetStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during password reset', async () => {
       const resetData = testData.authRoutes['/api/v1/auth/reset-password'].requestBody.success;
       const error = new Error('Database update failed');
       const resetStub = sandbox.stub(authService, 'resetPassword').rejects(error);

        const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send(resetData);

      expect(response.status).to.equal(500);
       expect(response.body).to.deep.equal({
        success: false,
        message: 'An unexpected error occurred',
      });
       expect(resetStub.calledOnce).to.be.true;
    });
  });

  // --- Refresh Token Route ---
  describe('POST /refresh-token', () => {
    it('should refresh token successfully', async () => {
      const refreshData = testData.authRoutes['/api/v1/auth/refresh-token'].requestBody.success;
      const expectedResult = {
        accessToken: 'new_mock_access_token',
        // Optionally include user data if needed by frontend
        // user: { id: 'user-id', role: 'voter' }
      };
      const refreshStub = sandbox.stub(authService, 'refreshToken').resolves(expectedResult);

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send(refreshData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Token refreshed successfully.',
        data: expectedResult,
      });
      expect(refreshStub.calledOnceWith(refreshData.refreshToken)).to.be.true;
    });

    it('should return 400 for missing refresh token', async () => {
      const invalidData = { refreshToken: undefined };
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.errors[0].msg).to.contain('Refresh token is required');
    });

     it('should return 401 for invalid or expired refresh token', async () => {
      const refreshData = testData.authRoutes['/api/v1/auth/refresh-token'].requestBody.invalidToken;
      const error = { status: 401, message: 'Invalid or expired refresh token.' };
      const refreshStub = sandbox.stub(authService, 'refreshToken').rejects(error);

       const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send(refreshData);

      expect(response.status).to.equal(401);
       expect(response.body).to.deep.equal({
        success: false,
        message: error.message,
      });
      expect(refreshStub.calledOnce).to.be.true;
    });

    it('should return 500 for unexpected errors during token refresh', async () => {
       const refreshData = testData.authRoutes['/api/v1/auth/refresh-token'].requestBody.success;
       const error = new Error('Token signing error');
        const refreshStub = sandbox.stub(authService, 'refreshToken').rejects(error);

        const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send(refreshData);

      expect(response.status).to.equal(500);
       expect(response.body).to.deep.equal({
        success: false,
        message: 'An unexpected error occurred',
      });
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
        nin: 'mock-nin',
        vin: 'mock-vin',
        // ... other relevant fields, excluding password
      };
      // Assuming a service method to fetch user details by ID
      const getUserStub = sandbox.stub(userService, 'getUserById').resolves(expectedUser);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${generatedAuthToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Current user retrieved successfully.',
        data: expectedUser,
      });
      expect(getUserStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 401 if no token is provided', async () => {
      const response = await request(app).get('/api/v1/auth/me');
      expect(response.status).to.equal(401);
      expect(response.body.message).to.contain('No authorization token');
    });

    it('should return 401 if token is invalid or expired', async () => {
      const invalidToken = 'Bearer invalid.token.string';
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', invalidToken);
      expect(response.status).to.equal(401);
      // Message might vary based on JWT library/error handling
      expect(response.body.message).to.contain('Invalid token');
    });

    it('should return 404 if user from token not found in DB', async () => {
      const userIdFromToken = 'test-user-id';
      const getUserStub = sandbox.stub(userService, 'getUserById').resolves(null); // Simulate user not found

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${generatedAuthToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.message).to.contain('User not found');
      expect(getUserStub.calledOnceWith(userIdFromToken)).to.be.true;
    });
  });

  // --- Logout Route (Protected) ---
  describe('POST /logout', () => {
    it('should logout user successfully (invalidate token if using blacklist)', async () => {
       // Stub the service method (if any logic exists, e.g., blacklisting refresh token)
      const logoutStub = sandbox.stub(authService, 'logoutUser').resolves({ message: 'Logout successful.' });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(); // No body needed usually

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'Logout successful.',
      });
      // Check if service method was called with user ID from token
      const userIdFromToken = 'test-user-id';
      expect(logoutStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

     it('should return 401 if no token is provided', async () => {
      const response = await request(app).post('/api/v1/auth/logout').send();
      expect(response.status).to.equal(401);
    });

    // Add test for invalid token if needed
  });

  // --- MFA Setup Route (Protected) ---
  describe('POST /mfa/setup', () => {
     it('should initiate MFA setup successfully and return setup details (e.g., QR code URI)', async () => {
      const userIdFromToken = 'test-user-id';
      const expectedSetupDetails = {
        secret: 'MOCKSECRET', // The generated secret
        qrCodeUri: 'otpauth://totp/YourApp:user?secret=MOCKSECRET&issuer=YourApp', // Example URI
      };
      const setupStub = sandbox.stub(mfaService, 'initiateMfaSetup').resolves(expectedSetupDetails);

      const response = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(); // No body needed

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'MFA setup initiated. Scan QR code or enter secret in your authenticator app.',
        data: expectedSetupDetails,
      });
      expect(setupStub.calledOnceWith(userIdFromToken)).to.be.true;
    });

    it('should return 400 if MFA is already enabled for the user', async () => {
        const userIdFromToken = 'test-user-id';
        const error = { status: 400, message: 'MFA is already enabled for this account.' };
        const setupStub = sandbox.stub(mfaService, 'initiateMfaSetup').rejects(error);

        const response = await request(app)
            .post('/api/v1/auth/mfa/setup')
            .set('Authorization', `Bearer ${generatedAuthToken}`)
            .send();

        expect(response.status).to.equal(400);
        expect(response.body).to.deep.equal({ success: false, message: error.message });
        expect(setupStub.calledOnce).to.be.true;
    });

     it('should return 401 if not authenticated', async () => {
      const response = await request(app).post('/api/v1/auth/mfa/setup').send();
      expect(response.status).to.equal(401);
    });
  });

  // --- MFA Verify Setup Route (Protected) ---
  describe('POST /mfa/verify-setup', () => {
     it('should verify MFA setup token successfully and enable MFA', async () => {
      const userIdFromToken = 'test-user-id';
      const verifyData = testData.authRoutes['/api/v1/auth/mfa/verify-setup'].requestBody.success;
      const verifyStub = sandbox.stub(mfaService, 'verifyAndEnableMfa').resolves({ message: 'MFA enabled successfully.' });

      const response = await request(app)
        .post('/api/v1/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(verifyData);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'MFA enabled successfully.',
      });
      expect(verifyStub.calledOnceWith(userIdFromToken, verifyData.token)).to.be.true;
    });

     it('should return 400 for missing token', async () => {
       const invalidData = { token: undefined };
       const response = await request(app)
        .post('/api/v1/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
       expect(response.body.success).to.be.false;
       expect(response.body.errors[0].msg).to.contain('MFA token is required');
    });

    it('should return 401 for invalid MFA setup token', async () => {
       const userIdFromToken = 'test-user-id';
       const verifyData = testData.authRoutes['/api/v1/auth/mfa/verify-setup'].requestBody.invalidToken;
       const error = { status: 401, message: 'Invalid MFA token provided.' };
       const verifyStub = sandbox.stub(mfaService, 'verifyAndEnableMfa').rejects(error);

       const response = await request(app)
        .post('/api/v1/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(verifyData);

       expect(response.status).to.equal(401);
       expect(response.body).to.deep.equal({ success: false, message: error.message });
       expect(verifyStub.calledOnce).to.be.true;
    });

     it('should return 401 if not authenticated', async () => {
        const verifyData = testData.authRoutes['/api/v1/auth/mfa/verify-setup'].requestBody.success;
        const response = await request(app).post('/api/v1/auth/mfa/verify-setup').send(verifyData);
        expect(response.status).to.equal(401);
    });
  });

  // --- MFA Disable Route (Protected) ---
  describe('DELETE /mfa/disable', () => {
     it('should disable MFA successfully', async () => {
      const userIdFromToken = 'test-user-id';
      // Body might require current password or MFA token for security
      const disableData = testData.authRoutes['/api/v1/auth/mfa/disable'].requestBody.success;
      const disableStub = sandbox.stub(mfaService, 'disableMfa').resolves({ message: 'MFA disabled successfully.' });

      const response = await request(app)
        .delete('/api/v1/auth/mfa/disable')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(disableData); // Send password/token if required by route validation

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        success: true,
        message: 'MFA disabled successfully.',
      });
      // Adjust stub call check based on required data (e.g., include password/token)
      expect(disableStub.calledOnceWith(userIdFromToken /*, disableData.password */)).to.be.true;
    });

     it('should return 400 if MFA is not currently enabled', async () => {
       const userIdFromToken = 'test-user-id';
       const disableData = testData.authRoutes['/api/v1/auth/mfa/disable'].requestBody.success;
       const error = { status: 400, message: 'MFA is not enabled for this account.' };
       const disableStub = sandbox.stub(mfaService, 'disableMfa').rejects(error);

        const response = await request(app)
        .delete('/api/v1/auth/mfa/disable')
        .set('Authorization', `Bearer ${generatedAuthToken}`)
        .send(disableData);

       expect(response.status).to.equal(400);
       expect(response.body).to.deep.equal({ success: false, message: error.message });
       expect(disableStub.calledOnce).to.be.true;
    });

     // Add test for incorrect password/token if required for disabling
     // it('should return 401 if verification (password/token) fails', async () => { ... });

     it('should return 401 if not authenticated', async () => {
        const disableData = testData.authRoutes['/api/v1/auth/mfa/disable'].requestBody.success;
        const response = await request(app).delete('/api/v1/auth/mfa/disable').send(disableData);
        expect(response.status).to.equal(401);
    });
  });

}); 