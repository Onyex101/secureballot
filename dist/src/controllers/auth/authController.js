"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refreshToken = exports.adminLogin = exports.verifyMfa = exports.login = exports.register = void 0;
const services_1 = require("../../services");
const verificationService = __importStar(require("../../services/verificationService"));
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const logger_1 = require("../../config/logger");
const logger_2 = require("../../utils/logger");
const AdminUser_1 = __importDefault(require("../../db/models/AdminUser"));
const Voter_1 = __importDefault(require("../../db/models/Voter"));
/**
 * Register a new voter
 * @route POST /api/v1/admin/register-voter (Admin access)
 * @route POST /api/v1/auth/register (Legacy - removed)
 * @access Admin only
 */
const register = async (req, res, next) => {
    try {
        const { nin, vin, phoneNumber, dateOfBirth, password, fullName, pollingUnitCode, state, gender, lga, ward, autoVerify = true, // Admin can choose to auto-verify
         } = req.body;
        // Check if voter already exists
        const voterExists = await services_1.authService.checkVoterExists(nin, vin);
        if (voterExists) {
            const error = new errorHandler_1.ApiError(409, 'Voter with this NIN or VIN already exists', 'VOTER_EXISTS', undefined, true);
            throw error;
        }
        // Register new voter
        const voter = await services_1.authService.registerVoter({
            nin,
            vin,
            phoneNumber,
            dateOfBirth: new Date(dateOfBirth),
            password,
            fullName,
            pollingUnitCode,
            state,
            gender,
            lga,
            ward,
        });
        // Log the registration
        await services_1.auditService.createAuditLog(voter.id, AuditLog_1.AuditActionType.REGISTRATION, req.ip || '', req.headers['user-agent'] || '', { nin, phoneNumber, registeredByAdmin: true });
        let verificationStatus = null;
        // Handle auto-verification if requested (admin privilege)
        if (autoVerify && req.user) {
            try {
                // Create initial verification status
                await verificationService.submitVerificationRequest(voter.id, 'admin_registration', 'auto-verified', 'admin-direct-registration');
                // Get the verification ID (we need to find it since submitVerificationRequest doesn't return the ID)
                const verificationRecord = await verificationService.getVerificationStatus(voter.id);
                // Auto-approve the verification
                verificationStatus = await verificationService.approveVerification(verificationRecord.id, req.user.id, 'Auto-verified during admin registration');
                // Log the auto-verification
                await services_1.auditService.createAuditLog(voter.id, AuditLog_1.AuditActionType.VERIFICATION, req.ip || '', req.headers['user-agent'] || '', {
                    autoVerified: true,
                    approvedBy: req.user.id,
                    method: 'admin_auto_verification',
                });
            }
            catch (verificationError) {
                // Log verification error but don't fail the registration
                logger_1.logger.warn('Auto-verification failed during voter registration', {
                    voterId: voter.id,
                    error: verificationError,
                });
            }
        }
        const responseMessage = autoVerify && verificationStatus
            ? 'Voter registered and verified successfully'
            : 'Voter registered successfully';
        res.status(201).json({
            success: true,
            message: responseMessage,
            data: {
                voter: {
                    id: voter.id,
                    nin: voter.decryptedNin,
                    vin: voter.decryptedVin,
                    phoneNumber: voter.phoneNumber,
                    fullName: voter.fullName,
                    dateOfBirth: voter.dateOfBirth,
                    pollingUnitCode: voter.pollingUnitCode,
                    state: voter.state,
                    lga: voter.lga,
                    ward: voter.ward,
                    gender: voter.gender,
                    isActive: voter.isActive,
                    mfaEnabled: voter.mfaEnabled,
                    createdAt: voter.createdAt,
                },
                verification: verificationStatus,
                autoVerified: !!verificationStatus,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
/**
 * Login a voter - Simplified for POC (only NIN and VIN required)
 * @route POST /api/v1/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
    try {
        const { nin, vin } = req.body;
        // Validate required fields
        if (!nin || !vin) {
            throw new errorHandler_1.ApiError(400, 'NIN and VIN are required', 'MISSING_CREDENTIALS');
        }
        // Validate NIN format (11 digits)
        if (!/^\d{11}$/.test(nin)) {
            throw new errorHandler_1.ApiError(400, 'Invalid NIN format', 'INVALID_NIN');
        }
        // Validate VIN format (19 characters)
        if (!/^[A-Z0-9]{19}$/.test(vin)) {
            throw new errorHandler_1.ApiError(400, 'Invalid VIN format', 'INVALID_VIN');
        }
        try {
            // Find voter by NIN and VIN using new encrypted system
            const voter = await services_1.authService.findVoterByIdentity(nin, vin);
            if (!voter) {
                // Log failed login attempt
                await services_1.auditService.createAuditLog(null, AuditLog_1.AuditActionType.LOGIN, req.ip || '', req.headers['user-agent'] || '', {
                    nin: nin.substring(0, 3) + '*'.repeat(8),
                    success: false,
                    reason: 'invalid_credentials',
                });
                throw new errorHandler_1.ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            }
            // Check if voter is active
            if (!voter.isActive) {
                throw new errorHandler_1.ApiError(403, 'Account is not active', 'ACCOUNT_INACTIVE');
            }
            // Generate token (no OTP required for POC)
            const token = services_1.authService.generateVoterToken(voter);
            // Update last login
            await voter.update({ lastLogin: new Date() });
            // Log successful login
            await services_1.auditService.createAuditLog(voter.id, AuditLog_1.AuditActionType.LOGIN, req.ip || '', req.headers['user-agent'] || '', { nin: nin.substring(0, 3) + '*'.repeat(8), success: true, method: 'legacy_route_poc' });
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    voter: {
                        id: voter.id,
                        nin: voter.decryptedNin,
                        vin: voter.decryptedVin,
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
                        createdAt: voter.createdAt,
                    },
                    poc: true,
                    note: 'POC: Login successful without OTP verification',
                },
            });
        }
        catch (error) {
            // Log failed login attempt
            await services_1.auditService.createAuditLog(null, AuditLog_1.AuditActionType.LOGIN, req.ip || '', req.headers['user-agent'] || '', {
                nin: nin.substring(0, 3) + '*'.repeat(8),
                success: false,
                error: error.message,
            });
            if (error instanceof errorHandler_1.ApiError) {
                throw error;
            }
            throw new errorHandler_1.ApiError(401, 'Authentication failed', 'AUTH_FAILED');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
/**
 * Verify MFA token
 * @route POST /api/v1/auth/verify-mfa
 * @access Public
 */
const verifyMfa = async (req, res, next) => {
    try {
        const { userId, token } = req.body;
        // Use mfaService to verify the token against the user's stored secret
        // Assuming mfaService.verifyMfaToken can handle non-admin verification based on userId
        const isValid = await services_1.mfaService.verifyMfaToken(userId, token);
        if (!isValid) {
            // Log failed MFA attempt before throwing
            await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MFA_VERIFY, req.ip || '', req.headers['user-agent'] || '', { success: false, error: 'Invalid MFA token' });
            const error = new errorHandler_1.ApiError(401, 'Invalid MFA token', 'INVALID_MFA_TOKEN', undefined, true);
            throw error;
        }
        // Generate a new token with extended expiry
        // Assuming 'voter' role here, might need adjustment if admins can use this endpoint
        const newToken = services_1.authService.generateToken(userId, 'voter', '24h');
        // Log the MFA verification success
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MFA_VERIFY, req.ip || '', req.headers['user-agent'] || '', { success: true });
        res.status(200).json({
            success: true,
            message: 'MFA verification successful',
            data: {
                token: newToken,
            },
        });
    }
    catch (error) {
        // Ensure failed attempts are logged even if other errors occur before the explicit log call
        let shouldLogFailure = true;
        // Check if the error is the specific ApiError for INVALID_MFA_TOKEN that we already logged
        if (error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'INVALID_MFA_TOKEN') {
            shouldLogFailure = false;
        }
        // Log failure if it wasn't the specific INVALID_MFA_TOKEN error and userId exists
        if (shouldLogFailure && req.body.userId) {
            // Safely get error message
            const errorMessage = error instanceof Error ? error.message : String(error);
            await services_1.auditService
                .createAuditLog(req.body.userId, AuditLog_1.AuditActionType.MFA_VERIFY, req.ip || '', req.headers['user-agent'] || '', { success: false, error: errorMessage })
                .catch(error => (0, logger_2.logError)('Failed to log MFA failure', error)); // Prevent logging error from masking original error
        }
        next(error);
    }
};
exports.verifyMfa = verifyMfa;
/**
 * Login an admin user
 * @route POST /api/v1/auth/admin-login
 * @access Public
 */
const adminLogin = async (req, res, next) => {
    try {
        const { nin, password } = req.body;
        if (!nin || !password) {
            throw new errorHandler_1.ApiError(400, 'NIN and password are required', 'MISSING_FIELDS');
        }
        try {
            // Authenticate admin using NIN and password
            const authenticatedAdmin = await services_1.authService.authenticateAdminByNin(nin, password);
            // Generate token with admin role
            const token = services_1.authService.generateToken(authenticatedAdmin.id, 'admin');
            // Log the login
            await services_1.auditService.createAdminAuditLog(authenticatedAdmin.id, AuditLog_1.AuditActionType.ADMIN_LOGIN, req.ip || '', req.headers['user-agent'] || '', { nin: nin.substring(0, 3) + '*'.repeat(8), success: true });
            res.status(200).json({
                success: true,
                message: 'Admin login successful',
                data: {
                    token,
                    user: {
                        id: authenticatedAdmin.id,
                        nin: authenticatedAdmin.decryptedNin,
                        email: authenticatedAdmin.email,
                        fullName: authenticatedAdmin.fullName,
                        role: authenticatedAdmin.adminType,
                    },
                    requiresMfa: authenticatedAdmin.mfaEnabled,
                },
            });
        }
        catch (error) {
            logger_1.logger.info('Error:', { error });
            // Log failed login attempt
            await services_1.auditService.createAdminAuditLog(null, AuditLog_1.AuditActionType.ADMIN_LOGIN, req.ip || '', req.headers['user-agent'] || '', {
                nin: nin.substring(0, 3) + '*'.repeat(8),
                success: false,
                error: error.message,
            });
            const apiError = new errorHandler_1.ApiError(401, 'Invalid admin credentials', 'INVALID_ADMIN_CREDENTIALS', undefined, true);
            throw apiError;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.adminLogin = adminLogin;
/**
 * Refresh token
 * @route POST /api/v1/auth/refresh-token
 * @access Private
 */
const refreshToken = async (req, res, next) => {
    try {
        // Get user information from authentication middleware
        const userId = req.userId;
        const role = req.role || 'voter';
        const userType = req.userType;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'User ID not found in token', 'INVALID_TOKEN');
        }
        // Verify user still exists and is active
        if (userType === 'admin') {
            const admin = await AdminUser_1.default.findByPk(userId);
            if (!admin || !admin.isActive) {
                throw new errorHandler_1.ApiError(401, 'Admin user not found or inactive', 'USER_INVALID');
            }
        }
        else if (userType === 'voter') {
            const voter = await Voter_1.default.findByPk(userId);
            if (!voter || !voter.isActive) {
                throw new errorHandler_1.ApiError(401, 'Voter not found or inactive', 'USER_INVALID');
            }
        }
        // Generate a new token with longer expiry for refresh
        const token = services_1.authService.generateToken(userId, role, '24h');
        // Log the token refresh
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.TOKEN_REFRESH, req.ip || '', req.headers['user-agent'] || '', { success: true, role, userType });
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token,
                expiresIn: '24h',
                tokenType: 'Bearer',
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.refreshToken = refreshToken;
/**
 * Logout a voter
 * @route POST /api/v1/auth/logout
 * @access Private
 */
const logout = async (req, res, next) => {
    try {
        // The user ID should be available from the authentication middleware
        const userId = req.user.id;
        // Logout the user
        await services_1.authService.logoutUser(userId);
        // Log the logout
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.LOGOUT, req.ip || '', req.headers['user-agent'] || '', { success: true });
        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
//# sourceMappingURL=authController.js.map