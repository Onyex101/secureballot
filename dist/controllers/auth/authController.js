"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.logout = exports.refreshToken = exports.adminLogin = exports.verifyMfa = exports.login = exports.register = void 0;
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const logger_1 = require("../../config/logger");
const logger_2 = require("../../utils/logger");
/**
 * Register a new voter
 * @route POST /api/v1/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
    try {
        const { nin, vin, phoneNumber, dateOfBirth, password, fullName, pollingUnitCode, state, gender, lga, ward, } = req.body;
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
        await services_1.auditService.createAuditLog(voter.id, AuditLog_1.AuditActionType.REGISTRATION, req.ip || '', req.headers['user-agent'] || '', { nin, phoneNumber });
        res.status(201).json({
            success: true,
            message: 'Voter registered successfully',
            data: {
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
                mfaEnabled: voter.mfaEnabled,
                createdAt: voter.createdAt,
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
        const { email, password } = req.body;
        if (!email || !password) {
            throw new errorHandler_1.ApiError(400, 'Email and password are required', 'MISSING_FIELDS');
        }
        try {
            // Authenticate admin
            const admin = await services_1.authService.authenticateAdmin(email, password);
            // Generate token with admin role
            const token = services_1.authService.generateToken(admin.id, 'admin');
            // Log the login
            await services_1.auditService.createAdminAuditLog(admin.id, AuditLog_1.AuditActionType.ADMIN_LOGIN, req.ip || '', req.headers['user-agent'] || '', { email, success: true });
            res.status(200).json({
                success: true,
                message: 'Admin login successful',
                data: {
                    token,
                    user: {
                        id: admin.id,
                        email: admin.email,
                        fullName: admin.fullName,
                        role: admin.adminType,
                    },
                    requiresMfa: admin.mfaEnabled,
                },
            });
        }
        catch (error) {
            logger_1.logger.info('Error:', { error });
            // Log failed login attempt
            await services_1.auditService.createAdminAuditLog(null, AuditLog_1.AuditActionType.ADMIN_LOGIN, req.ip || '', req.headers['user-agent'] || '', { email, success: false, error: error.message });
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
        // The user ID and role should be available from the authentication middleware
        const userId = req.userId;
        const role = req.role || 'voter';
        // Generate a new token with the same role
        const token = services_1.authService.generateToken(userId, role);
        // Log the token refresh
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.TOKEN_REFRESH, req.ip || '', req.headers['user-agent'] || '', { success: true, role });
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token,
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
/**
 * Request password reset
 * @route POST /api/v1/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        try {
            // Generate password reset token
            const result = await services_1.authService.generatePasswordResetToken(email);
            // In a real implementation, you would send an email with the token
            // For now, we'll just log it
            logger_1.logger.debug(`Password reset token for ${email}: ${result.token}`);
            // Log the password reset request
            await services_1.auditService.createAuditLog('system', AuditLog_1.AuditActionType.PASSWORD_RESET, req.ip || '', req.headers['user-agent'] || '', { email });
            res.status(200).json({
                success: true,
                message: 'Password reset instructions sent to your email',
            });
        }
        catch (error) {
            // Don't reveal if the email exists or not
            res.status(200).json({
                success: true,
                message: 'If your email is registered, you will receive password reset instructions',
            });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
/**
 * Reset password
 * @route POST /api/v1/auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        try {
            // Reset the password
            await services_1.authService.resetPassword(token, newPassword);
            // Log the password reset
            await services_1.auditService.createAuditLog('system', AuditLog_1.AuditActionType.PASSWORD_CHANGE, req.ip || '', req.headers['user-agent'] || '', { success: true });
            res.status(200).json({
                success: true,
                message: 'Password reset successful',
            });
        }
        catch (error) {
            const apiError = new errorHandler_1.ApiError(400, 'Invalid or expired token', 'INVALID_RESET_TOKEN', undefined, true);
            throw apiError;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=authController.js.map