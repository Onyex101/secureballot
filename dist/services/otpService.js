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
exports.resendOtp = exports.getOtpStatistics = exports.cleanupExpiredOtps = exports.verifyOtp = exports.generateAndSendOtp = exports.checkRateLimit = exports.calculateExpiryTime = exports.generateOtpCode = void 0;
const crypto_1 = __importDefault(require("crypto"));
const OtpLog_1 = __importStar(require("../db/models/OtpLog"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
const sequelize_1 = require("sequelize");
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const notificationService = __importStar(require("./notificationService"));
// OTP configuration
const OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
const MAX_OTP_ATTEMPTS = 3; // Maximum attempts to verify OTP
const RATE_LIMIT_MINUTES = 5; // Rate limit for OTP generation
const MAX_OTP_PER_PERIOD = 3; // Max OTPs per rate limit period
/**
 * Generate a 6-digit OTP code
 */
const generateOtpCode = () => {
    return crypto_1.default.randomInt(100000, 999999).toString();
};
exports.generateOtpCode = generateOtpCode;
/**
 * Calculate OTP expiry time
 */
const calculateExpiryTime = () => {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
    return expiry;
};
exports.calculateExpiryTime = calculateExpiryTime;
/**
 * Check rate limiting for OTP generation
 */
const checkRateLimit = async (userId, ipAddress = null) => {
    const rateLimitStart = new Date();
    rateLimitStart.setMinutes(rateLimitStart.getMinutes() - RATE_LIMIT_MINUTES);
    // Check by user ID
    const userOtpCount = await OtpLog_1.default.count({
        where: {
            userId,
            createdAt: {
                [sequelize_1.Op.gte]: rateLimitStart,
            },
        },
    });
    if (userOtpCount >= MAX_OTP_PER_PERIOD) {
        return false;
    }
    // Check by IP address if provided
    if (ipAddress) {
        const ipOtpCount = await OtpLog_1.default.count({
            where: {
                ipAddress,
                createdAt: {
                    [sequelize_1.Op.gte]: rateLimitStart,
                },
            },
        });
        if (ipOtpCount >= MAX_OTP_PER_PERIOD) {
            return false;
        }
    }
    return true;
};
exports.checkRateLimit = checkRateLimit;
/**
 * Generate and send OTP to voter's email
 */
const generateAndSendOtp = async (userId, email, ipAddress = null, userAgent = null) => {
    try {
        // Check rate limiting
        const canGenerate = await (0, exports.checkRateLimit)(userId, ipAddress);
        if (!canGenerate) {
            throw new errorHandler_1.ApiError(429, 'Too many OTP requests. Please wait before requesting a new OTP.', 'OTP_RATE_LIMIT_EXCEEDED');
        }
        // Verify voter exists and email matches
        const voter = await Voter_1.default.findByPk(userId);
        if (!voter) {
            throw new errorHandler_1.ApiError(404, 'Voter not found', 'VOTER_NOT_FOUND');
        }
        if (voter.email !== email) {
            throw new errorHandler_1.ApiError(400, 'Email does not match voter record', 'EMAIL_MISMATCH');
        }
        // Invalidate any existing pending OTPs for this user
        await OtpLog_1.default.update({ status: OtpLog_1.OtpStatus.EXPIRED }, {
            where: {
                userId,
                status: OtpLog_1.OtpStatus.SENT,
                expiresAt: {
                    [sequelize_1.Op.gt]: new Date(),
                },
            },
        });
        // Generate new OTP
        const otpCode = (0, exports.generateOtpCode)();
        const expiresAt = (0, exports.calculateExpiryTime)();
        // Create OTP log entry
        const otpLog = await OtpLog_1.default.create({
            userId,
            otpCode,
            email,
            ipAddress,
            userAgent,
            status: OtpLog_1.OtpStatus.SENT,
            attempts: 0,
            expiresAt,
        });
        // Update voter's OTP fields
        await voter.update({
            otpCode,
            otpExpiresAt: expiresAt,
            otpVerified: false,
        });
        // Send OTP via email
        const emailSent = await notificationService.sendOtpEmail(email, otpCode, voter.fullName);
        if (!emailSent) {
            // Mark OTP as failed if email couldn't be sent
            await otpLog.update({ status: OtpLog_1.OtpStatus.FAILED });
            throw new errorHandler_1.ApiError(500, 'Failed to send OTP email', 'OTP_EMAIL_FAILED');
        }
        logger_1.logger.info('OTP generated and sent successfully', {
            userId,
            email,
            ipAddress,
            expiresAt,
        });
        return {
            success: true,
            message: 'OTP sent successfully to your email address',
            expiresAt,
        };
    }
    catch (error) {
        logger_1.logger.error('Error generating and sending OTP', {
            userId,
            email,
            error: error.message,
        });
        throw error;
    }
};
exports.generateAndSendOtp = generateAndSendOtp;
/**
 * Verify OTP code
 */
const verifyOtp = async (userId, otpCode, ipAddress = null) => {
    try {
        // Find the most recent valid OTP log for this user
        const otpLog = await OtpLog_1.default.findOne({
            where: {
                userId,
                status: OtpLog_1.OtpStatus.SENT,
                expiresAt: {
                    [sequelize_1.Op.gt]: new Date(),
                },
            },
            order: [['createdAt', 'DESC']],
        });
        if (!otpLog) {
            throw new errorHandler_1.ApiError(400, 'No valid OTP found or OTP has expired', 'INVALID_OTP');
        }
        // Check if maximum attempts exceeded
        if (otpLog.attempts >= MAX_OTP_ATTEMPTS) {
            await otpLog.update({ status: OtpLog_1.OtpStatus.FAILED });
            throw new errorHandler_1.ApiError(400, 'Maximum OTP verification attempts exceeded', 'OTP_MAX_ATTEMPTS');
        }
        // Increment attempt count
        await otpLog.update({ attempts: otpLog.attempts + 1 });
        // Verify OTP code
        if (otpLog.otpCode !== otpCode) {
            logger_1.logger.warn('Invalid OTP attempt', {
                userId,
                ipAddress,
                attempts: otpLog.attempts + 1,
            });
            // If this was the last attempt, mark as failed
            if (otpLog.attempts >= MAX_OTP_ATTEMPTS) {
                await otpLog.update({ status: OtpLog_1.OtpStatus.FAILED });
                throw new errorHandler_1.ApiError(400, 'Invalid OTP. Maximum attempts exceeded.', 'OTP_INVALID_MAX_ATTEMPTS');
            }
            throw new errorHandler_1.ApiError(400, 'Invalid OTP code', 'OTP_INVALID');
        }
        // OTP is valid - mark as verified
        await otpLog.update({
            status: OtpLog_1.OtpStatus.VERIFIED,
            verifiedAt: new Date(),
        });
        // Update voter's OTP verification status
        const voter = await Voter_1.default.findByPk(userId);
        if (voter) {
            await voter.update({
                otpVerified: true,
                lastLogin: new Date(),
            });
        }
        logger_1.logger.info('OTP verified successfully', {
            userId,
            ipAddress,
        });
        return {
            success: true,
            message: 'OTP verified successfully',
        };
    }
    catch (error) {
        logger_1.logger.error('Error verifying OTP', {
            userId,
            otpCode: otpCode.replace(/./g, '*'),
            error: error.message,
        });
        throw error;
    }
};
exports.verifyOtp = verifyOtp;
/**
 * Cleanup expired OTPs
 */
const cleanupExpiredOtps = async () => {
    try {
        const [updatedCount] = await OtpLog_1.default.update({ status: OtpLog_1.OtpStatus.EXPIRED }, {
            where: {
                status: OtpLog_1.OtpStatus.SENT,
                expiresAt: {
                    [sequelize_1.Op.lt]: new Date(),
                },
            },
        });
        // Also cleanup voter OTP fields for expired OTPs
        await Voter_1.default.update({
            otpCode: null,
            otpExpiresAt: null,
            otpVerified: false,
        }, {
            where: {
                otpExpiresAt: {
                    [sequelize_1.Op.lt]: new Date(),
                },
                otpVerified: false,
            },
        });
        if (updatedCount > 0) {
            logger_1.logger.info(`Cleaned up ${updatedCount} expired OTPs`);
        }
        return updatedCount;
    }
    catch (error) {
        logger_1.logger.error('Error cleaning up expired OTPs', { error: error.message });
        throw error;
    }
};
exports.cleanupExpiredOtps = cleanupExpiredOtps;
/**
 * Get OTP statistics for monitoring
 */
const getOtpStatistics = async (hours = 24) => {
    const since = new Date();
    since.setHours(since.getHours() - hours);
    const stats = await OtpLog_1.default.findAll({
        attributes: [
            'status',
            [OtpLog_1.default.sequelize.fn('COUNT', OtpLog_1.default.sequelize.col('OtpLog.id')), 'count'],
        ],
        where: {
            createdAt: {
                [sequelize_1.Op.gte]: since,
            },
        },
        group: ['status'],
        raw: true,
    });
    const result = {
        total: 0,
        sent: 0,
        verified: 0,
        expired: 0,
        failed: 0,
    };
    stats.forEach((stat) => {
        const count = parseInt(stat.count, 10);
        result.total += count;
        result[stat.status] = count;
    });
    return result;
};
exports.getOtpStatistics = getOtpStatistics;
/**
 * Resend OTP (with rate limiting)
 */
const resendOtp = async (userId, email, ipAddress = null, userAgent = null) => {
    // Mark any existing pending OTPs as expired before generating new one
    await OtpLog_1.default.update({ status: OtpLog_1.OtpStatus.EXPIRED }, {
        where: {
            userId,
            status: OtpLog_1.OtpStatus.SENT,
        },
    });
    // Generate new OTP
    return (0, exports.generateAndSendOtp)(userId, email, ipAddress, userAgent);
};
exports.resendOtp = resendOtp;
//# sourceMappingURL=otpService.js.map