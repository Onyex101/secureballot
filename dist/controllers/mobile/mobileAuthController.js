"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredCodes = exports.verifyDevice = exports.requestDeviceVerification = exports.mobileLogin = void 0;
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const logger_1 = require("../../config/logger");
const crypto_1 = __importDefault(require("crypto"));
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
// In-memory storage for device verification codes (use Redis in production)
const deviceVerificationCodes = new Map();
/**
 * Login via mobile app
 */
const mobileLogin = async (req, res, next) => {
    const { nin, vin, password, deviceInfo } = req.body;
    let voterId;
    try {
        // Authenticate voter - use identifier, let service find by nin/vin/phone
        const voter = await services_1.authService.authenticateVoter(nin, password);
        voterId = voter.id; // Capture voterId for potential failure log
        // Verify that NIN and VIN match the authenticated voter
        if (voter.nin !== nin || voter.vin !== vin) {
            // Log detailed failure before throwing generic error using contextual logging
            await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.MOBILE_LOGIN, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.VOTER, null, {
                success: false,
                nin,
                vin,
                authenticatedNin: voter.nin,
                authenticatedVin: voter.vin,
                error: 'NIN/VIN mismatch after authentication',
                deviceInfo: deviceInfo || 'Not provided',
            }).catch(logErr => logger_1.logger.error('Failed to log mobile login failure (NIN/VIN mismatch)', logErr));
            throw new errorHandler_1.ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
        }
        // Generate token
        const token = services_1.authService.generateToken(voter.id, 'voter', '30d'); // Longer expiry for mobile
        // Log the successful login with device info using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.MOBILE_LOGIN, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.VOTER, voter.id, {
            success: true,
            deviceInfo: deviceInfo || 'Not provided',
        });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                voter: {
                    id: voter.id,
                    nin: voter.nin,
                    vin: voter.vin,
                    phoneNumber: voter.phoneNumber,
                },
                requiresMfa: voter.requiresMfa,
                requiresDeviceVerification: true, // Flag for client
            },
        });
    }
    catch (error) {
        // Log failed login attempt using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.MOBILE_LOGIN, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.VOTER, voterId, {
            success: false,
            nin,
            error: error.message,
            deviceInfo: deviceInfo || 'Not provided',
        }).catch(logErr => logger_1.logger.error('Failed to log mobile login failure', logErr));
        // Ensure we pass an ApiError to the handler
        if (error instanceof errorHandler_1.ApiError) {
            next(error);
        }
        else {
            // Create a generic one if the error wasn't already an ApiError
            next(new errorHandler_1.ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS'));
        }
    }
};
exports.mobileLogin = mobileLogin;
/**
 * Request device verification code
 */
const requestDeviceVerification = async (req, res, next) => {
    const userId = req.user?.id;
    const { deviceId } = req.body;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!deviceId) {
            throw new errorHandler_1.ApiError(400, 'Device ID is required', 'MISSING_DEVICE_ID');
        }
        // Generate a 6-digit verification code
        const verificationCode = crypto_1.default.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
        // Store the verification code
        const codeKey = `${userId}-${deviceId}`;
        deviceVerificationCodes.set(codeKey, {
            code: verificationCode,
            userId,
            deviceId,
            expiresAt,
            attempts: 0,
        });
        // Get voter's phone number for SMS
        const voter = await services_1.voterService.getVoterProfile(userId);
        if (!voter) {
            throw new errorHandler_1.ApiError(404, 'Voter not found', 'VOTER_NOT_FOUND');
        }
        // Send verification code via SMS
        try {
            await services_1.notificationService.sendSMS(voter.phoneNumber, `SecureBallot: Your device verification code is ${verificationCode}. Valid for 10 minutes.`);
        }
        catch (smsError) {
            logger_1.logger.error('Failed to send device verification SMS', { userId, deviceId, error: smsError });
            // Continue without failing - code is still valid for manual entry
        }
        // Log the request using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.DEVICE_VERIFY, adminLogService_1.AdminAction.ADMIN_USER_UPDATE, // Closest available action for device verification
        adminLogService_1.ResourceType.VOTER, userId, { deviceId, success: true, action: 'request' });
        res.status(200).json({
            success: true,
            message: 'Verification code sent to your registered phone number',
            data: {
                expiresAt,
                phoneNumber: `***${voter.phoneNumber.slice(-4)}`, // Masked phone number
            },
        });
    }
    catch (error) {
        // Log error using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.DEVICE_VERIFY, adminLogService_1.AdminAction.ADMIN_USER_UPDATE, adminLogService_1.ResourceType.VOTER, userId, { deviceId, success: false, error: error.message, action: 'request' }).catch(logErr => logger_1.logger.error('Failed to log device verification request error', logErr));
        next(error);
    }
};
exports.requestDeviceVerification = requestDeviceVerification;
/**
 * Verify mobile device
 */
const verifyDevice = async (req, res, next) => {
    const userId = req.user?.id;
    const { deviceId, verificationCode } = req.body;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!deviceId || !verificationCode) {
            throw new errorHandler_1.ApiError(400, 'deviceId and verificationCode are required', 'MISSING_DEVICE_INFO');
        }
        // Get stored verification code
        const codeKey = `${userId}-${deviceId}`;
        const storedData = deviceVerificationCodes.get(codeKey);
        if (!storedData) {
            throw new errorHandler_1.ApiError(400, 'No verification code found. Please request a new code.', 'NO_VERIFICATION_CODE');
        }
        // Check if code has expired
        if (new Date() > storedData.expiresAt) {
            deviceVerificationCodes.delete(codeKey);
            throw new errorHandler_1.ApiError(400, 'Verification code has expired. Please request a new code.', 'VERIFICATION_CODE_EXPIRED');
        }
        // Check attempt limit (max 3 attempts)
        if (storedData.attempts >= 3) {
            deviceVerificationCodes.delete(codeKey);
            throw new errorHandler_1.ApiError(400, 'Too many failed attempts. Please request a new code.', 'TOO_MANY_ATTEMPTS');
        }
        // Verify the code
        const isValid = storedData.code === verificationCode.toString();
        if (!isValid) {
            // Increment attempts
            storedData.attempts += 1;
            deviceVerificationCodes.set(codeKey, storedData);
            // Log failed verification attempt using contextual logging
            await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.DEVICE_VERIFY, adminLogService_1.AdminAction.ADMIN_USER_UPDATE, adminLogService_1.ResourceType.VOTER, userId, {
                success: false,
                deviceId,
                attempts: storedData.attempts,
                reason: 'Invalid verification code',
            });
            throw new errorHandler_1.ApiError(400, 'Invalid verification code', 'INVALID_VERIFICATION_CODE');
        }
        // Code is valid - clean up and mark device as verified
        deviceVerificationCodes.delete(codeKey);
        // TODO: In production, store device verification in database
        // await DeviceVerification.create({ userId, deviceId, verifiedAt: new Date() });
        // Log successful verification using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.DEVICE_VERIFY, adminLogService_1.AdminAction.ADMIN_USER_UPDATE, adminLogService_1.ResourceType.VOTER, userId, { success: true, deviceId });
        // Generate a new token with extended permissions/expiry
        const token = services_1.authService.generateToken(userId, 'voter', '90d'); // Longer expiry for verified devices
        res.status(200).json({
            success: true,
            message: 'Device verified successfully',
            data: {
                token,
                deviceVerified: true,
                verifiedAt: new Date(),
            },
        });
    }
    catch (error) {
        // Log failure if not already logged
        if (!(error instanceof errorHandler_1.ApiError &&
            error.code &&
            [
                'INVALID_VERIFICATION_CODE',
                'NO_VERIFICATION_CODE',
                'VERIFICATION_CODE_EXPIRED',
                'TOO_MANY_ATTEMPTS',
            ].includes(error.code))) {
            // Log error using contextual logging
            await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.DEVICE_VERIFY, adminLogService_1.AdminAction.ADMIN_USER_UPDATE, adminLogService_1.ResourceType.VOTER, userId, { success: false, deviceId, error: error.message }).catch((logErr) => logger_1.logger.error('Failed to log device verification error', logErr));
        }
        next(error);
    }
};
exports.verifyDevice = verifyDevice;
/**
 * Clean up expired verification codes (should be called periodically)
 */
const cleanupExpiredCodes = () => {
    const now = new Date();
    for (const [key, data] of deviceVerificationCodes.entries()) {
        if (now > data.expiresAt) {
            deviceVerificationCodes.delete(key);
        }
    }
};
exports.cleanupExpiredCodes = cleanupExpiredCodes;
//# sourceMappingURL=mobileAuthController.js.map