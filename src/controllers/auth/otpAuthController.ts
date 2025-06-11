import { Request, Response, NextFunction } from 'express';
import * as authService from '../../services/authService';
import * as otpService from '../../services/otpService';
import * as auditService from '../../services/auditService';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import Voter from '../../db/models/Voter';
import { createAdminLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';

// Constant OTP for proof of concept
const CONSTANT_OTP = '723111';
// Skip OTP in development mode or for POC
const SKIP_OTP = process.env.NODE_ENV === 'development' || process.env.SKIP_OTP === 'true';

/**
 * Step 1: Voter login request with NIN and VIN
 * POC: Returns constant OTP for testing, no email required
 */
export const requestVoterLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { nin, vin } = req.body;

    if (!nin || !vin) {
      throw new ApiError(400, 'NIN and VIN are required', 'MISSING_CREDENTIALS');
    }

    // Validate NIN format (11 digits)
    if (!/^\d{11}$/.test(nin)) {
      throw new ApiError(400, 'Invalid NIN format', 'INVALID_NIN');
    }

    // Validate VIN format (19 characters)
    if (!/^[A-Z0-9]{19}$/.test(vin)) {
      throw new ApiError(400, 'Invalid VIN format', 'INVALID_VIN');
    }

    // Check if voter exists first
    const voter = await authService.findVoterByIdentity(nin, vin);

    if (!voter) {
      // Log failed authentication attempt for audit
      await auditService.createAuditLog(
        'unknown', // No voter ID available
        AuditActionType.LOGIN,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          reason: 'invalid_credentials',
          nin_attempted: nin.substring(0, 3) + '*'.repeat(8), // Partial NIN for logging
        },
      );

      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if voter is active (now that property shadowing is fixed)
    if (!voter.isActive) {
      throw new ApiError(403, 'Account is not active', 'ACCOUNT_INACTIVE');
    }

    // POC Mode: Always return constant OTP information
    logger.info('POC: OTP request processed', { voterId: voter.get('id') });

    await auditService.createAuditLog(
      voter.id,
      AuditActionType.LOGIN,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        step: 'otp_requested_poc',
        success: true,
        mode: 'poc',
      },
    );

    res.status(200).json({
      success: true,
      message: 'POC: Use constant OTP 723111 for verification',
      data: {
        userId: voter.id,
        email: voter.email || 'poc-mode@example.com',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        constantOtp: CONSTANT_OTP,
        poc: true,
        instruction: 'Use OTP code 723111 in the next step',
      },
    });
  } catch (error) {
    logger.error('Error in voter login request', {
      error: (error as Error).message,
      ip: req.ip,
    });
    next(error);
  }
};

/**
 * Step 2: Verify OTP and complete login
 * POC: Accepts constant OTP 723111 or any code in development mode
 */
export const verifyOtpAndLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, otpCode } = req.body;

    if (!userId) {
      throw new ApiError(400, 'User ID is required', 'MISSING_USER_ID');
    }

    if (!otpCode) {
      throw new ApiError(400, 'OTP code is required', 'MISSING_OTP_CODE');
    }

    // Get voter details first
    const voter = await Voter.findByPk(userId);
    if (!voter) {
      throw new ApiError(404, 'Voter not found', 'VOTER_NOT_FOUND');
    }

    // POC: Accept constant OTP or any code in development
    let otpValid = false;
    let loginMethod = '';

    if (otpCode === CONSTANT_OTP) {
      otpValid = true;
      loginMethod = 'constant_otp_poc';
      logger.info('POC: Constant OTP used', { voterId: voter.id });
    } else if (SKIP_OTP) {
      otpValid = true;
      loginMethod = 'development_bypass';
      logger.info('Development: OTP verification bypassed', { voterId: voter.id });
    } else {
      // In production, verify against real OTP service
      try {
        const otpResult = await otpService.verifyOtp(userId, otpCode, req.ip);
        otpValid = otpResult.success;
        loginMethod = 'real_otp';
      } catch (error) {
        otpValid = false;
        logger.warn('OTP verification failed, falling back to constant OTP check', {
          voterId: voter.id,
          error: (error as Error).message,
        });

        // Fallback to constant OTP for POC
        if (otpCode === CONSTANT_OTP) {
          otpValid = true;
          loginMethod = 'constant_otp_fallback';
        }
      }
    }

    if (!otpValid) {
      throw new ApiError(
        400,
        `Invalid OTP code. For POC, use: ${CONSTANT_OTP}`,
        'OTP_VERIFICATION_FAILED',
      );
    }

    // Generate JWT token
    const token = await authService.generateVoterToken(voter);

    // Update last login
    await voter.update({ lastLogin: new Date() });

    // Log successful login
    await auditService.createAuditLog(
      voter.id,
      AuditActionType.LOGIN,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        login_method: loginMethod,
        mode: 'poc',
        otp_used: otpCode === CONSTANT_OTP ? 'constant' : 'other',
      },
    );

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
  } catch (error) {
    logger.error('Error in OTP verification', {
      error: (error as Error).message,
      ip: req.ip,
    });
    next(error);
  }
};

/**
 * Resend OTP
 */
export const resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new ApiError(400, 'User ID is required', 'MISSING_USER_ID');
    }

    // Get voter details
    const voter = await Voter.findByPk(userId);
    if (!voter) {
      throw new ApiError(404, 'Voter not found', 'VOTER_NOT_FOUND');
    }

    if (!voter.email) {
      throw new ApiError(400, 'No email address registered', 'NO_EMAIL');
    }

    // Resend OTP
    const otpResult = await otpService.resendOtp(
      voter.id,
      voter.email,
      req.ip,
      req.headers['user-agent'],
    );

    // Log OTP resend
    await auditService.createAuditLog(
      voter.id,
      AuditActionType.LOGIN,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        action: 'otp_resend',
        success: true,
        email: voter.email,
      },
    );

    res.status(200).json({
      success: true,
      message: otpResult.message,
      data: {
        userId: voter.id,
        email: voter.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
        expiresAt: otpResult.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Error in OTP resend', {
      error: (error as Error).message,
      ip: req.ip,
    });
    next(error);
  }
};

/**
 * Admin login with NIN and password (no OTP required)
 */
export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { nin, password } = req.body;

    if (!nin || !password) {
      throw new ApiError(400, 'NIN and password are required', 'MISSING_CREDENTIALS');
    }

    // Validate NIN format (11 digits)
    if (!/^\d{11}$/.test(nin)) {
      throw new ApiError(400, 'Invalid NIN format', 'INVALID_NIN');
    }

    // Find admin by NIN hash
    const admin = await authService.findAdminByNin(nin);

    if (!admin) {
      // Log failed attempt using admin logs
      await createAdminLog(
        req as any,
        AdminAction.ADMIN_USER_LOGIN,
        ResourceType.ADMIN_USER,
        null,
        {
          success: false,
          reason: 'invalid_credentials',
          nin_attempted: nin.substring(0, 3) + '*'.repeat(8),
        },
      );

      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await admin.validatePassword(password);
    if (!isValidPassword) {
      // Log failed password attempt using admin logs
      await createAdminLog(
        { ...req, user: { id: admin.id } } as any,
        AdminAction.ADMIN_USER_LOGIN,
        ResourceType.ADMIN_USER,
        admin.id,
        {
          success: false,
          reason: 'invalid_password',
        },
      );

      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new ApiError(403, 'Account is not active', 'ACCOUNT_INACTIVE');
    }

    // Generate JWT token
    const token = await authService.generateAdminToken(admin);

    // Update last login
    await admin.update({ lastLogin: new Date() });

    // Log successful login using admin logs
    await createAdminLog(
      { ...req, user: { id: admin.id } } as any,
      AdminAction.ADMIN_USER_LOGIN,
      ResourceType.ADMIN_USER,
      admin.id,
      {
        success: true,
        login_method: 'password',
      },
    );

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
  } catch (error) {
    logger.error('Error in admin login', {
      error: (error as Error).message,
      ip: req.ip,
    });
    next(error);
  }
};
