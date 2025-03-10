import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import Voter from '../db/models/Voter';
import AuditLog, { AuditActionType } from '../db/models/AuditLog';

/**
 * Check if a voter exists with the given NIN or VIN
 */
export const checkVoterExists = async (nin: string, vin: string): Promise<boolean> => {
  const existingVoter = await Voter.findOne({
    where: {
      [Op.or]: [{ nin }, { vin }],
    },
  });

  return existingVoter !== null;
};

/**
 * Register a new voter
 */
export const registerVoter = async (
  nin: string,
  vin: string,
  phoneNumber: string,
  dateOfBirth: Date,
  password: string
): Promise<{
  id: string;
  nin: string;
  vin: string;
  phoneNumber: string;
}> => {
  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create new voter
  const voter = await Voter.create({
    id: uuidv4(),
    nin,
    vin,
    phoneNumber,
    dateOfBirth,
    passwordHash,
    isActive: true,
    mfaEnabled: false,
    password // This is required by the interface but not stored
  });

  return {
    id: voter.id,
    nin: voter.nin,
    vin: voter.vin,
    phoneNumber: voter.phoneNumber
  };
};

/**
 * Authenticate a voter
 */
export const authenticateVoter = async (
  identifier: string,
  password: string
): Promise<{
  id: string;
  nin: string;
  vin: string;
  phoneNumber: string;
  requiresMfa: boolean;
}> => {
  // Find voter by NIN, VIN, or phone number
  const voter = await Voter.findOne({
    where: {
      [Op.or]: [
        { nin: identifier },
        { vin: identifier },
        { phoneNumber: identifier }
      ]
    }
  });

  if (!voter) {
    throw new Error('Invalid credentials');
  }

  // Check if voter is active
  if (!voter.isActive) {
    throw new Error('Account is inactive');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, voter.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await voter.update({
    lastLogin: new Date()
  });

  // Determine if MFA is required (could be based on settings or user preferences)
  const requiresMfa = false; // Placeholder logic

  return {
    id: voter.id,
    nin: voter.nin,
    vin: voter.vin,
    phoneNumber: voter.phoneNumber,
    requiresMfa
  };
};

/**
 * Authenticate a voter for USSD
 */
export const authenticateVoterForUssd = async (nin: string, vin: string, phoneNumber: string) => {
  // In a real implementation, this would verify the NIN, VIN, and phone number against the database
  // For now, returning mock data
  
  // Check if NIN and VIN match
  const voterExists = await checkVoterExists(nin, vin);
  
  if (!voterExists) {
    throw new Error('Invalid credentials');
  }
  
  // Check if phone number matches the voter's registered phone number
  // This is a simplified check for demonstration purposes
  if (phoneNumber !== '+2348012345678') {
    throw new Error('Phone number does not match records');
  }
  
  return {
    id: 'voter-' + Math.random().toString(36).substring(2, 15),
    nin,
    vin,
    phoneNumber
  };
};

/**
 * Generate JWT token
 */
export const generateToken = (
  userId: string,
  role: string = 'voter',
  expiresIn: string = '1h'
): string => {
  const payload = {
    id: userId,
    role
  };

  const secret = process.env.JWT_SECRET || 'default-secret-key';
  const options: SignOptions = {
    expiresIn: expiresIn as any
  };

  return jwt.sign(payload, secret as Secret, options);
};

/**
 * Generate MFA secret and token
 */
export const generateMfaSecret = (): {
  secret: string;
  token: string;
} => {
  const secret = speakeasy.generateSecret({ length: 20 });
  const token = speakeasy.totp({
    secret: secret.base32,
    encoding: 'base32'
  });

  return {
    secret: secret.base32,
    token
  };
};

/**
 * Verify MFA token
 */
export const verifyMfaToken = (
  secret: string,
  token: string
): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1 // Allow 1 step before and after current time
  });
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = async (
  phoneNumber: string
): Promise<{
  token: string;
  expiryDate: Date;
}> => {
  // Find voter by phone number
  const voter = await Voter.findOne({
    where: { phoneNumber }
  });

  if (!voter) {
    throw new Error('Voter not found');
  }

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiry (1 hour from now)
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 1);

  // Update voter with token
  await voter.update({
    recoveryToken: token,
    recoveryTokenExpiry: expiryDate
  });

  return {
    token,
    expiryDate
  };
};

/**
 * Reset password using token
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<boolean> => {
  // Find voter with valid token
  const voter = await Voter.findOne({
    where: {
      recoveryToken: token,
      recoveryTokenExpiry: {
        [Op.gt]: new Date()
      }
    }
  });

  if (!voter) {
    throw new Error('Invalid or expired token');
  }

  // Hash new password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update voter
  await voter.update({
    passwordHash,
    recoveryToken: null,
    recoveryTokenExpiry: null
  });

  return true;
};

/**
 * Log user out (invalidate token)
 * Note: In a real implementation, you might use a token blacklist or Redis
 */
export const logoutUser = async (
  userId: string
): Promise<boolean> => {
  // In a real implementation, you would invalidate the token
  // For now, we'll just return true
  return true;
};
