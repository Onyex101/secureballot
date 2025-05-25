/* eslint-disable @typescript-eslint/no-unused-vars */
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import Voter from '../db/models/Voter';
import AdminUser from '../db/models/AdminUser';
import { config } from '../config';
import { logger } from '../config/logger';

interface VoterRegistrationData {
  nin: string;
  vin: string;
  phoneNumber: string;
  dateOfBirth: Date;
  password: string;
  fullName: string;
  pollingUnitCode: string;
  state: string;
  gender: string;
  lga: string;
  ward: string;
}

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
export const registerVoter = async (data: VoterRegistrationData): Promise<Voter> => {
  const existingVoter = await checkVoterExists(data.nin, data.vin);
  if (existingVoter) {
    throw new Error('Voter already exists');
  }

  const voter = await Voter.create({
    nin: data.nin,
    vin: data.vin,
    phoneNumber: data.phoneNumber,
    dateOfBirth: data.dateOfBirth,
    password: data.password,
    passwordHash: '', // Will be set by beforeCreate hook
    fullName: data.fullName,
    pollingUnitCode: data.pollingUnitCode,
    state: data.state,
    gender: data.gender,
    lga: data.lga,
    ward: data.ward,
  });

  return voter;
};

/**
 * Authenticate a voter
 */
export const authenticateVoter = async (
  identifier: string,
  password: string,
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
      [Op.or]: [{ nin: identifier }, { vin: identifier }, { phoneNumber: identifier }],
    },
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
    lastLogin: new Date(),
  });

  // Determine if MFA is required (could be based on settings or user preferences)
  const requiresMfa = false; // Placeholder logic

  return {
    id: voter.id,
    nin: voter.nin,
    vin: voter.vin,
    phoneNumber: voter.phoneNumber,
    requiresMfa,
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
    phoneNumber,
  };
};

/**
 * Authenticate an admin user
 */
export const authenticateAdmin = async (email: string, password: string): Promise<AdminUser> => {
  // Find admin by email
  const admin = await AdminUser.findOne({
    where: { email },
    include: ['roles', 'permissions'],
  });

  if (!admin) {
    logger.debug(`Admin authentication failed: No admin found with email ${email}`);
    throw new Error('Invalid credentials');
  }

  // Check if admin is active
  if (!admin.isActive) {
    logger.debug(`Admin authentication failed: Admin account is inactive for email ${email}`);
    throw new Error('Account is inactive');
  }

  // Verify password
  const isPasswordValid = await admin.validatePassword(password);
  if (!isPasswordValid) {
    logger.debug(`Admin authentication failed: Invalid password for email ${email}`);
    throw new Error('Invalid credentials');
  }

  // Update last login
  await admin.update({
    lastLogin: new Date(),
  });

  return admin;
};

/**
 * Generate JWT token
 */
export const generateToken = (
  userId: string,
  role: string = 'voter',
  expiresIn: string = '1h',
): string => {
  const payload = {
    id: userId,
    role,
  };

  const secret = config.jwt.secret || process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT secret is not defined');
    throw new Error('JWT secret is not configured');
  }

  const options: SignOptions = {
    expiresIn: expiresIn as any,
    issuer: 'secureBallot',
  };

  return jwt.sign(payload, secret as Secret, options);
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = async (
  phoneNumber: string,
): Promise<{
  token: string;
  expiryDate: Date;
}> => {
  // Find voter by phone number
  const voter = await Voter.findOne({
    where: { phoneNumber },
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
    recoveryTokenExpiry: expiryDate,
  });

  return {
    token,
    expiryDate,
  };
};

/**
 * Reset password using token
 */
export const resetPassword = async (token: string, newPassword: string): Promise<boolean> => {
  // Find voter with valid token
  const voter = await Voter.findOne({
    where: {
      recoveryToken: token,
      recoveryTokenExpiry: {
        [Op.gt]: new Date(),
      },
    },
  });

  if (!voter) {
    throw new Error('Invalid or expired token');
  }

  // Hash new password - Use the virtual field approach
  await (voter as any).update({
    password: newPassword,
    recoveryToken: null, // Clear token after use
    recoveryTokenExpiry: null,
  });

  return true;
};

/**
 * Log user out (invalidate token)
 * Note: In a real implementation, you might use a token blacklist or Redis
 */
export const logoutUser = (userId: string): Promise<boolean> => {
  // In a real implementation, you would invalidate the token
  // For now, we'll just return true
  return Promise.resolve(true);
};
