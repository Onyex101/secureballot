const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import the service to test
const authService = require('../../src/services/auth/authService');
const voterModel = require('../../src/db/models/voterModel');
const mfaService = require('../../src/services/auth/mfaService');
const { AuthenticationError } = require('../../src/utils/errors');

describe('Auth Service Unit Tests', () => {
  let sandbox;
  
  beforeEach(() => {
    // Create a sandbox for Sinon stubs
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('register', () => {
    it('should register a new voter successfully', async () => {
      // Test data
      const voterData = {
        nin: '12345678901',
        vin: '1234567890123456789',
        phoneNumber: '+2348012345678',
        dateOfBirth: '1990-01-01',
        password: 'Password123!'
      };
      
      const userId = uuidv4();
      
      // Stub database calls
      const findVoterStub = sandbox.stub(voterModel, 'findVoterByIdentifier').resolves(null);
      const createVoterStub = sandbox.stub(voterModel, 'createVoter').resolves({
        id: userId,
        ...voterData,
        password: 'hashedPassword'
      });
      
      // Stub bcrypt
      const hashStub = sandbox.stub(bcrypt, 'hash').resolves('hashedPassword');
      
      // Call the service method
      const result = await authService.register(voterData);
      
      // Assertions
      expect(findVoterStub.calledTwice).to.be.true;
      expect(hashStub.calledOnce).to.be.true;
      expect(createVoterStub.calledOnce).to.be.true;
      expect(result).to.have.property('userId', userId);
      expect(result).to.have.property('success', true);
    });
    
    it('should throw an error if voter already exists', async () => {
      // Test data
      const voterData = {
        nin: '12345678901',
        vin: '1234567890123456789',
        phoneNumber: '+2348012345678',
        dateOfBirth: '1990-01-01',
        password: 'Password123!'
      };
      
      // Stub database calls to simulate existing voter
      const findVoterStub = sandbox.stub(voterModel, 'findVoterByIdentifier').resolves({
        id: uuidv4(),
        ...voterData
      });
      
      // Call the service method and expect it to throw
      try {
        await authService.register(voterData);
        // If we get here, fail the test
        expect.fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error.message).to.include('already registered');
      }
      
      // Verify stubs were called
      expect(findVoterStub.calledOnce).to.be.true;
    });
  });
  
  describe('login', () => {
    it('should login a voter successfully without MFA', async () => {
      // Test data
      const loginData = {
        identifier: '12345678901',
        password: 'Password123!'
      };
      
      const userId = uuidv4();
      const voter = {
        id: userId,
        nin: '12345678901',
        vin: '1234567890123456789',
        phoneNumber: '+2348012345678',
        password: 'hashedPassword',
        mfaEnabled: false
      };
      
      // Stub database calls
      const findVoterStub = sandbox.stub(voterModel, 'findVoterByIdentifier').resolves(voter);
      
      // Stub bcrypt compare
      const compareStub = sandbox.stub(bcrypt, 'compare').resolves(true);
      
      // Stub JWT sign
      const jwtStub = sandbox.stub(jwt, 'sign').returns('fake-jwt-token');
      
      // Call the service method
      const result = await authService.login(loginData);
      
      // Assertions
      expect(findVoterStub.calledOnce).to.be.true;
      expect(compareStub.calledOnce).to.be.true;
      expect(jwtStub.calledOnce).to.be.true;
      expect(result).to.have.property('token', 'fake-jwt-token');
      expect(result).to.have.property('mfaRequired', false);
    });
    
    it('should return MFA required for a voter with MFA enabled', async () => {
      // Test data
      const loginData = {
        identifier: '12345678901',
        password: 'Password123!'
      };
      
      const userId = uuidv4();
      const voter = {
        id: userId,
        nin: '12345678901',
        vin: '1234567890123456789',
        phoneNumber: '+2348012345678',
        password: 'hashedPassword',
        mfaEnabled: true
      };
      
      // Stub database calls
      const findVoterStub = sandbox.stub(voterModel, 'findVoterByIdentifier').resolves(voter);
      
      // Stub bcrypt compare
      const compareStub = sandbox.stub(bcrypt, 'compare').resolves(true);
      
      // Stub MFA service
      const generateMfaStub = sandbox.stub(mfaService, 'generateAndSendMfaToken').resolves({
        success: true
      });
      
      // Call the service method
      const result = await authService.login(loginData);
      
      // Assertions
      expect(findVoterStub.calledOnce).to.be.true;
      expect(compareStub.calledOnce).to.be.true;
      expect(generateMfaStub.calledOnce).to.be.true;
      expect(result).to.have.property('mfaRequired', true);
      expect(result).to.have.property('userId', userId);
      expect(result).to.not.have.property('token');
    });
    
    it('should throw an error for invalid credentials', async () => {
      // Test data
      const loginData = {
        identifier: '12345678901',
        password: 'WrongPassword'
      };
      
      const voter = {
        id: uuidv4(),
        nin: '12345678901',
        vin: '1234567890123456789',
        phoneNumber: '+2348012345678',
        password: 'hashedPassword'
      };
      
      // Stub database calls
      const findVoterStub = sandbox.stub(voterModel, 'findVoterByIdentifier').resolves(voter);
      
      // Stub bcrypt compare to fail
      const compareStub = sandbox.stub(bcrypt, 'compare').resolves(false);
      
      // Call the service method and expect it to throw
      try {
        await authService.login(loginData);
        // If we get here, fail the test
        expect.fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(AuthenticationError);
        expect(error.message).to.include('Invalid credentials');
      }
      
      // Verify stubs were called
      expect(findVoterStub.calledOnce).to.be.true;
      expect(compareStub.calledOnce).to.be.true;
    });
  });
  
  describe('verifyMfa', () => {
    it('should verify MFA and return a token', async () => {
      // Test data
      const mfaData = {
        userId: uuidv4(),
        token: '123456'
      };
      
      const voter = {
        id: mfaData.userId,
        nin: '12345678901',
        vin: '1234567890123456789',
        phoneNumber: '+2348012345678'
      };
      
      // Stub database calls
      const findVoterStub = sandbox.stub(voterModel, 'findVoterById').resolves(voter);
      
      // Stub MFA verification
      const verifyMfaStub = sandbox.stub(mfaService, 'verifyMfaToken').resolves(true);
      
      // Stub JWT sign
      const jwtStub = sandbox.stub(jwt, 'sign').returns('fake-jwt-token');
      
      // Call the service method
      const result = await authService.verifyMfa(mfaData);
      
      // Assertions
      expect(findVoterStub.calledOnce).to.be.true;
      expect(verifyMfaStub.calledOnce).to.be.true;
      expect(jwtStub.calledOnce).to.be.true;
      expect(result).to.have.property('token', 'fake-jwt-token');
      expect(result).to.have.property('success', true);
    });
    
    it('should throw an error for invalid MFA token', async () => {
      // Test data
      const mfaData = {
        userId: uuidv4(),
        token: '123456'
      };
      
      const voter = {
        id: mfaData.userId,
        nin: '12345678901',
        vin: '1234567890123456789',
        phoneNumber: '+2348012345678'
      };
      
      // Stub database calls
      const findVoterStub = sandbox.stub(voterModel, 'findVoterById').resolves(voter);
      
      // Stub MFA verification to fail
      const verifyMfaStub = sandbox.stub(mfaService, 'verifyMfaToken').resolves(false);
      
      // Call the service method and expect it to throw
      try {
        await authService.verifyMfa(mfaData);
        // If we get here, fail the test
        expect.fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(AuthenticationError);
        expect(error.message).to.include('Invalid MFA token');
      }
      
      // Verify stubs were called
      expect(findVoterStub.calledOnce).to.be.true;
      expect(verifyMfaStub.calledOnce).to.be.true;
    });
  });
}); 