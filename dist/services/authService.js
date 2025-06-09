"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = exports.resetPassword = exports.generatePasswordResetToken = exports.generateToken = exports.authenticateAdmin = exports.authenticateVoterForUssd = exports.authenticateVoter = exports.registerVoter = exports.checkVoterExists = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const Voter_1 = __importDefault(require("../db/models/Voter"));
const AdminUser_1 = __importDefault(require("../db/models/AdminUser"));
const config_1 = require("../config");
const logger_1 = require("../config/logger");
/**
 * Check if a voter exists with the given NIN or VIN
 */
const checkVoterExists = async (nin, vin) => {
    const existingVoter = await Voter_1.default.findOne({
        where: {
            [sequelize_1.Op.or]: [{ nin }, { vin }],
        },
    });
    return existingVoter !== null;
};
exports.checkVoterExists = checkVoterExists;
/**
 * Register a new voter
 */
const registerVoter = async (data) => {
    const existingVoter = await (0, exports.checkVoterExists)(data.nin, data.vin);
    if (existingVoter) {
        throw new Error('Voter already exists');
    }
    const voter = await Voter_1.default.create({
        nin: data.nin,
        vin: data.vin,
        phoneNumber: data.phoneNumber,
        dateOfBirth: data.dateOfBirth,
        password: data.password,
        fullName: data.fullName,
        pollingUnitCode: data.pollingUnitCode,
        state: data.state,
        gender: data.gender,
        lga: data.lga,
        ward: data.ward,
    });
    return voter;
};
exports.registerVoter = registerVoter;
/**
 * Authenticate a voter
 */
const authenticateVoter = async (identifier, password) => {
    // Find voter by NIN, VIN, or phone number
    const voter = await Voter_1.default.findOne({
        where: {
            [sequelize_1.Op.or]: [{ nin: identifier }, { vin: identifier }, { phoneNumber: identifier }],
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
    const isPasswordValid = await bcrypt_1.default.compare(password, voter.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }
    // Update last login
    await voter.update({
        lastLogin: new Date(),
    });
    // Determine if MFA is required based on voter's MFA settings
    const requiresMfa = voter.mfaEnabled;
    return {
        id: voter.id,
        nin: voter.nin,
        vin: voter.vin,
        phoneNumber: voter.phoneNumber,
        fullName: voter.fullName,
        dateOfBirth: voter.dateOfBirth,
        pollingUnitCode: voter.pollingUnitCode,
        state: voter.state,
        lga: voter.lga,
        ward: voter.ward,
        gender: voter.gender,
        isActive: voter.isActive,
        lastLogin: voter.lastLogin,
        mfaEnabled: voter.mfaEnabled,
        requiresMfa,
        createdAt: voter.createdAt,
    };
};
exports.authenticateVoter = authenticateVoter;
/**
 * Authenticate a voter for USSD
 */
const authenticateVoterForUssd = async (nin, vin, phoneNumber) => {
    // In a real implementation, this would verify the NIN, VIN, and phone number against the database
    // For now, returning mock data
    // Check if NIN and VIN match
    const voterExists = await (0, exports.checkVoterExists)(nin, vin);
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
exports.authenticateVoterForUssd = authenticateVoterForUssd;
/**
 * Authenticate an admin user
 */
const authenticateAdmin = async (email, password) => {
    // Find admin by email
    const admin = await AdminUser_1.default.findOne({
        where: { email },
    });
    if (!admin) {
        logger_1.logger.debug(`Admin authentication failed: No admin found with email ${email}`);
        throw new Error('Invalid credentials');
    }
    // Check if admin is active
    if (!admin.isActive) {
        logger_1.logger.debug(`Admin authentication failed: Admin account is inactive for email ${email}`);
        throw new Error('Account is inactive');
    }
    // Verify password
    const isPasswordValid = await admin.validatePassword(password);
    if (!isPasswordValid) {
        logger_1.logger.debug(`Admin authentication failed: Invalid password for email ${email}`);
        throw new Error('Invalid credentials');
    }
    // Update last login
    await admin.update({
        lastLogin: new Date(),
    });
    return admin;
};
exports.authenticateAdmin = authenticateAdmin;
/**
 * Generate JWT token
 */
const generateToken = (userId, role = 'voter', expiresIn = '1h') => {
    const payload = {
        id: userId,
        role,
    };
    const secret = config_1.config.jwt.secret || process.env.JWT_SECRET;
    if (!secret) {
        logger_1.logger.error('JWT secret is not defined');
        throw new Error('JWT secret is not configured');
    }
    const options = {
        expiresIn: expiresIn,
        issuer: 'secureBallot',
    };
    return jsonwebtoken_1.default.sign(payload, secret, options);
};
exports.generateToken = generateToken;
/**
 * Generate password reset token
 */
const generatePasswordResetToken = async (phoneNumber) => {
    // Find voter by phone number
    const voter = await Voter_1.default.findOne({
        where: { phoneNumber },
    });
    if (!voter) {
        throw new Error('Voter not found');
    }
    // Generate token
    const token = crypto_1.default.randomBytes(32).toString('hex');
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
exports.generatePasswordResetToken = generatePasswordResetToken;
/**
 * Reset password using token
 */
const resetPassword = async (token, newPassword) => {
    // Find voter with valid token
    const voter = await Voter_1.default.findOne({
        where: {
            recoveryToken: token,
            recoveryTokenExpiry: {
                [sequelize_1.Op.gt]: new Date(),
            },
        },
    });
    if (!voter) {
        throw new Error('Invalid or expired token');
    }
    // Hash new password - Use the virtual field approach
    await voter.update({
        password: newPassword,
        recoveryToken: null,
        recoveryTokenExpiry: null,
    });
    return true;
};
exports.resetPassword = resetPassword;
/**
 * Log user out (invalidate token)
 * Note: In a real implementation, you might use a token blacklist or Redis
 */
const logoutUser = (userId) => {
    // In a real implementation, you would invalidate the token
    // For now, we'll just return true
    return Promise.resolve(true);
};
exports.logoutUser = logoutUser;
//# sourceMappingURL=authService.js.map