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
exports.adminLogin = exports.resendOtp = exports.verifyOtpAndLogin = exports.requestVoterLogin = void 0;
const authService = __importStar(require("../../services/authService"));
const otpService = __importStar(require("../../services/otpService"));
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const Voter_1 = __importDefault(require("../../db/models/Voter"));
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
const auditHelpers_2 = require("../../utils/auditHelpers");
// Constant OTP for proof of concept
const CONSTANT_OTP = '723111';
// Skip OTP in development mode or for POC
const SKIP_OTP = process.env.NODE_ENV === 'development' || process.env.SKIP_OTP === 'true';
/**
 * Step 1: Voter login request with NIN and VIN
 * POC: Returns constant OTP for testing, no email required
 */
const requestVoterLogin = async (req, res, next) => {
    try {
        const { nin, vin } = req.body;
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
        // Check if voter exists first
        const voter = await authService.findVoterByIdentity(nin, vin);
        if (!voter) {
            // Log failed authentication attempt using contextual logging
            await (0, auditHelpers_2.createContextualLog)(req, AuditLog_1.AuditActionType.LOGIN, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.VOTER, null, {
                success: false,
                reason: 'invalid_credentials',
                nin_attempted: nin.substring(0, 3) + '*'.repeat(8), // Partial NIN for logging
            });
            throw new errorHandler_1.ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
        }
        // Check if voter is active (now that property shadowing is fixed)
        if (!voter.isActive) {
            throw new errorHandler_1.ApiError(403, 'Account is not active', 'ACCOUNT_INACTIVE');
        }
        // POC Mode: Always return constant OTP information
        logger_1.logger.info('POC: OTP request processed', { voterId: voter.get('id') });
        // Log OTP request using contextual logging
        await (0, auditHelpers_2.createContextualLog)(req, AuditLog_1.AuditActionType.LOGIN, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.VOTER, voter.id, {
            step: 'otp_requested_poc',
            success: true,
            mode: 'poc',
        });
        res.status(200).json({
            success: true,
            message: 'POC: Use constant OTP 723111 for verification',
            data: {
                userId: voter.id,
                email: voter.email || 'poc-mode@example.com',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                constantOtp: CONSTANT_OTP,
                poc: true,
                instruction: 'Use OTP code 723111 in the next step',
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error in voter login request', {
            error: error.message,
            ip: req.ip,
        });
        next(error);
    }
};
exports.requestVoterLogin = requestVoterLogin;
/**
 * Step 2: Verify OTP and complete login
 * POC: Accepts constant OTP 723111 or any code in development mode
 */
const verifyOtpAndLogin = async (req, res, next) => {
    try {
        const { userId, otpCode } = req.body;
        if (!userId) {
            throw new errorHandler_1.ApiError(400, 'User ID is required', 'MISSING_USER_ID');
        }
        if (!otpCode) {
            throw new errorHandler_1.ApiError(400, 'OTP code is required', 'MISSING_OTP_CODE');
        }
        // Get voter details first
        const voter = await Voter_1.default.findByPk(userId);
        if (!voter) {
            throw new errorHandler_1.ApiError(404, 'Voter not found', 'VOTER_NOT_FOUND');
        }
        // POC: Accept constant OTP or any code in development
        let otpValid = false;
        let loginMethod = '';
        if (otpCode === CONSTANT_OTP) {
            otpValid = true;
            loginMethod = 'constant_otp_poc';
            logger_1.logger.info('POC: Constant OTP used', { voterId: voter.id });
        }
        else if (SKIP_OTP) {
            otpValid = true;
            loginMethod = 'development_bypass';
            logger_1.logger.info('Development: OTP verification bypassed', { voterId: voter.id });
        }
        else {
            // In production, verify against real OTP service
            try {
                const otpResult = await otpService.verifyOtp(userId, otpCode, req.ip);
                otpValid = otpResult.success;
                loginMethod = 'real_otp';
            }
            catch (error) {
                otpValid = false;
                logger_1.logger.warn('OTP verification failed, falling back to constant OTP check', {
                    voterId: voter.id,
                    error: error.message,
                });
                // Fallback to constant OTP for POC
                if (otpCode === CONSTANT_OTP) {
                    otpValid = true;
                    loginMethod = 'constant_otp_fallback';
                }
            }
        }
        if (!otpValid) {
            throw new errorHandler_1.ApiError(400, `Invalid OTP code. For POC, use: ${CONSTANT_OTP}`, 'OTP_VERIFICATION_FAILED');
        }
        // Generate JWT token
        const token = await authService.generateVoterToken(voter);
        // Update last login
        await voter.update({ lastLogin: new Date() });
        // Log successful login using contextual logging
        await (0, auditHelpers_2.createContextualLog)(req, AuditLog_1.AuditActionType.LOGIN, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.VOTER, voter.id, {
            success: true,
            login_method: loginMethod,
            mode: 'poc',
            otp_used: otpCode === CONSTANT_OTP ? 'constant' : 'other',
        });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: voter.id,
                    fullName: voter.fullName,
                    email: voter.email,
                    pollingUnitCode: voter.pollingUnitCode,
                    state: voter.state,
                    lga: voter.lga,
                    ward: voter.ward,
                    lastLogin: voter.lastLogin,
                },
                poc: true,
                loginMethod,
                constantOtp: CONSTANT_OTP,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error in OTP verification', {
            error: error.message,
            ip: req.ip,
        });
        next(error);
    }
};
exports.verifyOtpAndLogin = verifyOtpAndLogin;
/**
 * Resend OTP
 */
const resendOtp = async (req, res, next) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            throw new errorHandler_1.ApiError(400, 'User ID is required', 'MISSING_USER_ID');
        }
        // Get voter details
        const voter = await Voter_1.default.findByPk(userId);
        if (!voter) {
            throw new errorHandler_1.ApiError(404, 'Voter not found', 'VOTER_NOT_FOUND');
        }
        if (!voter.email) {
            throw new errorHandler_1.ApiError(400, 'No email address registered', 'NO_EMAIL');
        }
        // Resend OTP
        const otpResult = await otpService.resendOtp(voter.id, voter.email, req.ip, req.headers['user-agent']);
        // Log OTP resend using contextual logging
        await (0, auditHelpers_2.createContextualLog)(req, AuditLog_1.AuditActionType.LOGIN, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.VOTER, voter.id, {
            action: 'otp_resend',
            success: true,
            email: voter.email,
        });
        res.status(200).json({
            success: true,
            message: otpResult.message,
            data: {
                userId: voter.id,
                email: voter.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
                expiresAt: otpResult.expiresAt,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error in OTP resend', {
            error: error.message,
            ip: req.ip,
        });
        next(error);
    }
};
exports.resendOtp = resendOtp;
/**
 * Admin login with NIN and password (no OTP required)
 */
const adminLogin = async (req, res, next) => {
    try {
        const { nin, password } = req.body;
        if (!nin || !password) {
            throw new errorHandler_1.ApiError(400, 'NIN and password are required', 'MISSING_CREDENTIALS');
        }
        // Validate NIN format (11 digits)
        if (!/^\d{11}$/.test(nin)) {
            throw new errorHandler_1.ApiError(400, 'Invalid NIN format', 'INVALID_NIN');
        }
        // Find admin by NIN hash
        const admin = await authService.findAdminByNin(nin);
        if (!admin) {
            // Log failed attempt using admin logs
            await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.ADMIN_USER, null, {
                success: false,
                reason: 'invalid_credentials',
                nin_attempted: nin.substring(0, 3) + '*'.repeat(8),
            });
            throw new errorHandler_1.ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
        }
        // Verify password
        const isValidPassword = await admin.validatePassword(password);
        if (!isValidPassword) {
            // Log failed password attempt using admin logs
            await (0, auditHelpers_1.createAdminLog)({ ...req, user: { id: admin.id } }, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.ADMIN_USER, admin.id, {
                success: false,
                reason: 'invalid_password',
            });
            throw new errorHandler_1.ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
        }
        // Check if admin is active
        if (!admin.isActive) {
            throw new errorHandler_1.ApiError(403, 'Account is not active', 'ACCOUNT_INACTIVE');
        }
        // Generate JWT token
        const token = await authService.generateAdminToken(admin);
        // Update last login
        await admin.update({ lastLogin: new Date() });
        // Log successful login using admin logs
        await (0, auditHelpers_1.createAdminLog)({ ...req, user: { id: admin.id } }, adminLogService_1.AdminAction.ADMIN_USER_LOGIN, adminLogService_1.ResourceType.ADMIN_USER, admin.id, {
            success: true,
            login_method: 'password',
        });
        res.status(200).json({
            success: true,
            message: 'Admin login successful',
            data: {
                token,
                user: {
                    id: admin.id,
                    fullName: admin.fullName,
                    email: admin.email,
                    role: admin.adminType,
                    lastLogin: admin.lastLogin,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error in admin login', {
            error: error.message,
            ip: req.ip,
        });
        next(error);
    }
};
exports.adminLogin = adminLogin;
//# sourceMappingURL=otpAuthController.js.map