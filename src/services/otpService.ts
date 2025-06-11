import crypto from 'crypto';
import OtpLog, { OtpStatus } from '../db/models/OtpLog';
import Voter from '../db/models/Voter';
import { Op } from 'sequelize';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/errorHandler';
import * as notificationService from './notificationService';

// OTP configuration
const OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
const MAX_OTP_ATTEMPTS = 3; // Maximum attempts to verify OTP
const RATE_LIMIT_MINUTES = 5; // Rate limit for OTP generation
const MAX_OTP_PER_PERIOD = 3; // Max OTPs per rate limit period

/**
 * Generate a 6-digit OTP code
 */
export const generateOtpCode = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Calculate OTP expiry time
 */
export const calculateExpiryTime = (): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
};

/**
 * Check rate limiting for OTP generation
 */
export const checkRateLimit = async (
  userId: string,
  ipAddress: string | null = null,
): Promise<boolean> => {
  const rateLimitStart = new Date();
  rateLimitStart.setMinutes(rateLimitStart.getMinutes() - RATE_LIMIT_MINUTES);

  // Check by user ID
  const userOtpCount = await OtpLog.count({
    where: {
      userId,
      createdAt: {
        [Op.gte]: rateLimitStart,
      },
    },
  });

  if (userOtpCount >= MAX_OTP_PER_PERIOD) {
    return false;
  }

  // Check by IP address if provided
  if (ipAddress) {
    const ipOtpCount = await OtpLog.count({
      where: {
        ipAddress,
        createdAt: {
          [Op.gte]: rateLimitStart,
        },
      },
    });

    if (ipOtpCount >= MAX_OTP_PER_PERIOD) {
      return false;
    }
  }

  return true;
};

/**
 * Generate and send OTP to voter's email
 */
export const generateAndSendOtp = async (
  userId: string,
  email: string,
  ipAddress: string | null = null,
  userAgent: string | null = null,
): Promise<{ success: boolean; message: string; expiresAt?: Date }> => {
  try {
    // Check rate limiting
    const canGenerate = await checkRateLimit(userId, ipAddress);
    if (!canGenerate) {
      throw new ApiError(
        429,
        'Too many OTP requests. Please wait before requesting a new OTP.',
        'OTP_RATE_LIMIT_EXCEEDED',
      );
    }

    // Verify voter exists and email matches
    const voter = await Voter.findByPk(userId);
    if (!voter) {
      throw new ApiError(404, 'Voter not found', 'VOTER_NOT_FOUND');
    }

    if (voter.email !== email) {
      throw new ApiError(400, 'Email does not match voter record', 'EMAIL_MISMATCH');
    }

    // Invalidate any existing pending OTPs for this user
    await OtpLog.update(
      { status: OtpStatus.EXPIRED },
      {
        where: {
          userId,
          status: OtpStatus.SENT,
          expiresAt: {
            [Op.gt]: new Date(),
          },
        },
      },
    );

    // Generate new OTP
    const otpCode = generateOtpCode();
    const expiresAt = calculateExpiryTime();

    // Create OTP log entry
    const otpLog = await OtpLog.create({
      userId,
      otpCode,
      email,
      ipAddress,
      userAgent,
      status: OtpStatus.SENT,
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
      await otpLog.update({ status: OtpStatus.FAILED });
      throw new ApiError(500, 'Failed to send OTP email', 'OTP_EMAIL_FAILED');
    }

    logger.info('OTP generated and sent successfully', {
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
  } catch (error) {
    logger.error('Error generating and sending OTP', {
      userId,
      email,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Verify OTP code
 */
export const verifyOtp = async (
  userId: string,
  otpCode: string,
  ipAddress: string | null = null,
): Promise<{ success: boolean; message: string }> => {
  try {
    // Find the most recent valid OTP log for this user
    const otpLog = await OtpLog.findOne({
      where: {
        userId,
        status: OtpStatus.SENT,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!otpLog) {
      throw new ApiError(400, 'No valid OTP found or OTP has expired', 'INVALID_OTP');
    }

    // Check if maximum attempts exceeded
    if (otpLog.attempts >= MAX_OTP_ATTEMPTS) {
      await otpLog.update({ status: OtpStatus.FAILED });
      throw new ApiError(400, 'Maximum OTP verification attempts exceeded', 'OTP_MAX_ATTEMPTS');
    }

    // Increment attempt count
    await otpLog.update({ attempts: otpLog.attempts + 1 });

    // Verify OTP code
    if (otpLog.otpCode !== otpCode) {
      logger.warn('Invalid OTP attempt', {
        userId,
        ipAddress,
        attempts: otpLog.attempts + 1,
      });

      // If this was the last attempt, mark as failed
      if (otpLog.attempts >= MAX_OTP_ATTEMPTS) {
        await otpLog.update({ status: OtpStatus.FAILED });
        throw new ApiError(
          400,
          'Invalid OTP. Maximum attempts exceeded.',
          'OTP_INVALID_MAX_ATTEMPTS',
        );
      }

      throw new ApiError(400, 'Invalid OTP code', 'OTP_INVALID');
    }

    // OTP is valid - mark as verified
    await otpLog.update({
      status: OtpStatus.VERIFIED,
      verifiedAt: new Date(),
    });

    // Update voter's OTP verification status
    const voter = await Voter.findByPk(userId);
    if (voter) {
      await voter.update({
        otpVerified: true,
        lastLogin: new Date(),
      });
    }

    logger.info('OTP verified successfully', {
      userId,
      ipAddress,
    });

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    logger.error('Error verifying OTP', {
      userId,
      otpCode: otpCode.replace(/./g, '*'), // Mask OTP in logs
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Cleanup expired OTPs
 */
export const cleanupExpiredOtps = async (): Promise<number> => {
  try {
    const [updatedCount] = await OtpLog.update(
      { status: OtpStatus.EXPIRED },
      {
        where: {
          status: OtpStatus.SENT,
          expiresAt: {
            [Op.lt]: new Date(),
          },
        },
      },
    );

    // Also cleanup voter OTP fields for expired OTPs
    await Voter.update(
      {
        otpCode: null,
        otpExpiresAt: null,
        otpVerified: false,
      },
      {
        where: {
          otpExpiresAt: {
            [Op.lt]: new Date(),
          },
          otpVerified: false,
        },
      },
    );

    if (updatedCount > 0) {
      logger.info(`Cleaned up ${updatedCount} expired OTPs`);
    }

    return updatedCount;
  } catch (error) {
    logger.error('Error cleaning up expired OTPs', { error: (error as Error).message });
    throw error;
  }
};

/**
 * Get OTP statistics for monitoring
 */
export const getOtpStatistics = async (
  hours: number = 24,
): Promise<{
  total: number;
  sent: number;
  verified: number;
  expired: number;
  failed: number;
}> => {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const stats = await OtpLog.findAll({
    attributes: [
      'status',
      [OtpLog.sequelize!.fn('COUNT', OtpLog.sequelize!.col('OtpLog.id')), 'count'],
    ],
    where: {
      createdAt: {
        [Op.gte]: since,
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

  stats.forEach((stat: any) => {
    const count = parseInt(stat.count, 10);
    result.total += count;
    result[stat.status as keyof typeof result] = count;
  });

  return result;
};

/**
 * Resend OTP (with rate limiting)
 */
export const resendOtp = async (
  userId: string,
  email: string,
  ipAddress: string | null = null,
  userAgent: string | null = null,
): Promise<{ success: boolean; message: string; expiresAt?: Date }> => {
  // Mark any existing pending OTPs as expired before generating new one
  await OtpLog.update(
    { status: OtpStatus.EXPIRED },
    {
      where: {
        userId,
        status: OtpStatus.SENT,
      },
    },
  );

  // Generate new OTP
  return generateAndSendOtp(userId, email, ipAddress, userAgent);
};
