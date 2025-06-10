import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { authService, auditService, mfaService } from '../../services';
import * as verificationService from '../../services/verificationService';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { logger } from '../../config/logger';
import { logError } from '../../utils/logger';
import AdminUser from '../../db/models/AdminUser';
import Voter from '../../db/models/Voter';

/**
 * Register a new voter
 * @route POST /api/v1/admin/register-voter (Admin access)
 * @route POST /api/v1/auth/register (Legacy - removed)
 * @access Admin only
 */
export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      nin,
      vin,
      phoneNumber,
      dateOfBirth,
      password,
      fullName,
      pollingUnitCode,
      state,
      gender,
      lga,
      ward,
      autoVerify = true, // Admin can choose to auto-verify
    } = req.body;

    // Check if voter already exists
    const voterExists = await authService.checkVoterExists(nin, vin);
    if (voterExists) {
      const error = new ApiError(
        409,
        'Voter with this NIN or VIN already exists',
        'VOTER_EXISTS',
        undefined,
        true,
      );
      throw error;
    }

    // Register new voter
    const voter = await authService.registerVoter({
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
    await auditService.createAuditLog(
      voter.id,
      AuditActionType.REGISTRATION,
      req.ip || '',
      req.headers['user-agent'] || '',
      { nin, phoneNumber, registeredByAdmin: true },
    );

    let verificationStatus = null;

    // Handle auto-verification if requested (admin privilege)
    if (autoVerify && req.user) {
      try {
        // Create initial verification status
        await verificationService.submitVerificationRequest(
          voter.id,
          'admin_registration',
          'auto-verified',
          'admin-direct-registration',
        );

        // Get the verification ID (we need to find it since submitVerificationRequest doesn't return the ID)
        const verificationRecord = await verificationService.getVerificationStatus(voter.id);

        // Auto-approve the verification
        verificationStatus = await verificationService.approveVerification(
          verificationRecord.id,
          req.user.id,
          'Auto-verified during admin registration',
        );

        // Log the auto-verification
        await auditService.createAuditLog(
          voter.id,
          AuditActionType.VERIFICATION,
          req.ip || '',
          req.headers['user-agent'] || '',
          {
            autoVerified: true,
            approvedBy: req.user.id,
            method: 'admin_auto_verification',
          },
        );
      } catch (verificationError) {
        // Log verification error but don't fail the registration
        logger.warn('Auto-verification failed during voter registration', {
          voterId: voter.id,
          error: verificationError,
        });
      }
    }

    const responseMessage =
      autoVerify && verificationStatus
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
  } catch (error) {
    next(error);
  }
};

/**
 * Login a voter - Simplified for POC (only NIN and VIN required)
 * @route POST /api/v1/auth/login
 * @access Public
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nin, vin } = req.body;

    // Validate required fields
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

    try {
      // Find voter by NIN and VIN using new encrypted system
      const voter = await authService.findVoterByIdentity(nin, vin);

      if (!voter) {
        // Log failed login attempt
        await auditService.createAuditLog(
          null,
          AuditActionType.LOGIN,
          req.ip || '',
          req.headers['user-agent'] || '',
          {
            nin: nin.substring(0, 3) + '*'.repeat(8),
            success: false,
            reason: 'invalid_credentials',
          },
        );

        throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Check if voter is active
      if (!voter.isActive) {
        throw new ApiError(403, 'Account is not active', 'ACCOUNT_INACTIVE');
      }

      // Generate token (no OTP required for POC)
      const token = authService.generateVoterToken(voter);

      // Update last login
      await voter.update({ lastLogin: new Date() });

      // Log successful login
      await auditService.createAuditLog(
        voter.id,
        AuditActionType.LOGIN,
        req.ip || '',
        req.headers['user-agent'] || '',
        { nin: nin.substring(0, 3) + '*'.repeat(8), success: true, method: 'legacy_route_poc' },
      );

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
          poc: true, // Indicates this is POC mode
          note: 'POC: Login successful without OTP verification',
        },
      });
    } catch (error) {
      // Log failed login attempt
      await auditService.createAuditLog(
        null,
        AuditActionType.LOGIN,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          nin: nin.substring(0, 3) + '*'.repeat(8),
          success: false,
          error: (error as Error).message,
        },
      );

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(401, 'Authentication failed', 'AUTH_FAILED');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verify MFA token
 * @route POST /api/v1/auth/verify-mfa
 * @access Public
 */
export const verifyMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, token } = req.body;

    // Use mfaService to verify the token against the user's stored secret
    // Assuming mfaService.verifyMfaToken can handle non-admin verification based on userId
    const isValid = await mfaService.verifyMfaToken(userId, token);

    if (!isValid) {
      // Log failed MFA attempt before throwing
      await auditService.createAuditLog(
        userId,
        AuditActionType.MFA_VERIFY,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: false, error: 'Invalid MFA token' },
      );
      const error = new ApiError(401, 'Invalid MFA token', 'INVALID_MFA_TOKEN', undefined, true);
      throw error;
    }

    // Generate a new token with extended expiry
    // Assuming 'voter' role here, might need adjustment if admins can use this endpoint
    const newToken = authService.generateToken(userId, 'voter', '24h');

    // Log the MFA verification success
    await auditService.createAuditLog(
      userId,
      AuditActionType.MFA_VERIFY,
      req.ip || '',
      req.headers['user-agent'] || '',
      { success: true },
    );

    res.status(200).json({
      success: true,
      message: 'MFA verification successful',
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    // Ensure failed attempts are logged even if other errors occur before the explicit log call
    let shouldLogFailure = true;
    // Check if the error is the specific ApiError for INVALID_MFA_TOKEN that we already logged
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'INVALID_MFA_TOKEN'
    ) {
      shouldLogFailure = false;
    }

    // Log failure if it wasn't the specific INVALID_MFA_TOKEN error and userId exists
    if (shouldLogFailure && req.body.userId) {
      // Safely get error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      await auditService
        .createAuditLog(
          req.body.userId,
          AuditActionType.MFA_VERIFY,
          req.ip || '',
          req.headers['user-agent'] || '',
          { success: false, error: errorMessage },
        )
        .catch(error => logError('Failed to log MFA failure', error)); // Prevent logging error from masking original error
    }
    next(error);
  }
};

/**
 * Login an admin user
 * @route POST /api/v1/auth/admin-login
 * @access Public
 */
export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { nin, password } = req.body;

    if (!nin || !password) {
      throw new ApiError(400, 'NIN and password are required', 'MISSING_FIELDS');
    }

    try {
      // Authenticate admin using NIN and password
      const authenticatedAdmin = await authService.authenticateAdminByNin(nin, password);

      // Generate token with admin role
      const token = authService.generateToken(authenticatedAdmin.id, 'admin');

      // Log the login
      await auditService.createAdminAuditLog(
        authenticatedAdmin.id,
        AuditActionType.ADMIN_LOGIN,
        req.ip || '',
        req.headers['user-agent'] || '',
        { nin: nin.substring(0, 3) + '*'.repeat(8), success: true },
      );

      res.status(200).json({
        success: true,
        message: 'Admin login successful',
        data: {
          token,
          user: {
            id: authenticatedAdmin.id,
            nin: authenticatedAdmin.decryptedNin, // Use decrypted NIN
            email: authenticatedAdmin.email,
            fullName: authenticatedAdmin.fullName,
            role: authenticatedAdmin.adminType,
          },
          requiresMfa: authenticatedAdmin.mfaEnabled,
        },
      });
    } catch (error) {
      logger.info('Error:', { error });
      // Log failed login attempt
      await auditService.createAdminAuditLog(
        null,
        AuditActionType.ADMIN_LOGIN,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          nin: nin.substring(0, 3) + '*'.repeat(8),
          success: false,
          error: (error as Error).message,
        },
      );

      const apiError = new ApiError(
        401,
        'Invalid admin credentials',
        'INVALID_ADMIN_CREDENTIALS',
        undefined,
        true,
      );
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh token
 * @route POST /api/v1/auth/refresh-token
 * @access Private
 */
export const refreshToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get user information from authentication middleware
    const userId = req.userId;
    const role = req.role || 'voter';
    const userType = req.userType;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in token', 'INVALID_TOKEN');
    }

    // Verify user still exists and is active
    if (userType === 'admin') {
      const admin = await AdminUser.findByPk(userId);
      if (!admin || !admin.isActive) {
        throw new ApiError(401, 'Admin user not found or inactive', 'USER_INVALID');
      }
    } else if (userType === 'voter') {
      const voter = await Voter.findByPk(userId);
      if (!voter || !voter.isActive) {
        throw new ApiError(401, 'Voter not found or inactive', 'USER_INVALID');
      }
    }

    // Generate a new token with longer expiry for refresh
    const token = authService.generateToken(userId, role, '24h');

    // Log the token refresh
    await auditService.createAuditLog(
      userId,
      AuditActionType.TOKEN_REFRESH,
      req.ip || '',
      req.headers['user-agent'] || '',
      { success: true, role, userType },
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
        expiresIn: '24h',
        tokenType: 'Bearer',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout a voter
 * @route POST /api/v1/auth/logout
 * @access Private
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // The user ID should be available from the authentication middleware
    const userId = (req as any).user.id;

    // Logout the user
    await authService.logoutUser(userId);

    // Log the logout
    await auditService.createAuditLog(
      userId,
      AuditActionType.LOGOUT,
      req.ip || '',
      req.headers['user-agent'] || '',
      { success: true },
    );

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};
