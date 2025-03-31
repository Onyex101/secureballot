import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { authService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { logger } from '../../config/logger';

/**
 * Login via mobile app
 */
export const mobileLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { nin, vin, password, deviceInfo } = req.body;
  let voterId: string | undefined;

  try {
    // Authenticate voter - use identifier, let service find by nin/vin/phone
    const voter = await authService.authenticateVoter(nin, password);
    voterId = voter.id; // Capture voterId for potential failure log

    // Verify that NIN and VIN match the authenticated voter
    if (voter.nin !== nin || voter.vin !== vin) {
      // Log detailed failure before throwing generic error
      await auditService
        .createAuditLog(
          'unknown',
          AuditActionType.MOBILE_LOGIN,
          req.ip || '',
          req.headers['user-agent'] || '',
          {
            success: false,
            nin, // Log attempted nin
            vin, // Log attempted vin
            authenticatedNin: voter.nin, // Log actual nin found
            authenticatedVin: voter.vin,
            error: 'NIN/VIN mismatch after authentication',
            deviceInfo: deviceInfo || 'Not provided',
          },
        )
        .catch(logErr =>
          logger.error('Failed to log mobile login failure (NIN/VIN mismatch)', logErr),
        );
      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Generate token
    const token = authService.generateToken(voter.id, 'voter', '30d'); // Longer expiry for mobile

    // Log the successful login with device info
    await auditService.createAuditLog(
      voter.id,
      AuditActionType.MOBILE_LOGIN, // Use enum
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        deviceInfo: deviceInfo || 'Not provided',
      },
    );

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
  } catch (error) {
    // Log failed login attempt
    await auditService
      .createAuditLog(
        voterId || 'unknown', // Use captured voterId if available
        AuditActionType.MOBILE_LOGIN, // Use enum for failure too
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          nin, // Log attempted identifier
          error: (error as Error).message,
          deviceInfo: deviceInfo || 'Not provided',
        },
      )
      .catch(logErr => logger.error('Failed to log mobile login failure', logErr));

    // Ensure we pass an ApiError to the handler
    if (error instanceof ApiError) {
      next(error);
    } else {
      // Create a generic one if the error wasn't already an ApiError
      next(new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS'));
    }
  }
};

/**
 * Verify mobile device
 */
export const verifyDevice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;
  const { deviceId, verificationCode } = req.body;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    if (!deviceId || !verificationCode) {
      throw new ApiError(400, 'deviceId and verificationCode are required', 'MISSING_DEVICE_INFO');
    }

    // TODO: Implement proper device verification logic
    // - Generate and send code (e.g., via SMS to registered number)
    // - Store code with expiry associated with userId/deviceId
    // - Compare submitted code with stored code
    const isValid = verificationCode === '123456'; // Placeholder

    if (!isValid) {
      // Log failed verification attempt
      await auditService.createAuditLog(
        userId,
        AuditActionType.DEVICE_VERIFY, // Use enum
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          deviceId,
          reason: 'Invalid verification code',
        },
      );
      throw new ApiError(400, 'Invalid verification code', 'INVALID_VERIFICATION_CODE');
    }

    // TODO: Mark device as verified for the user in the database

    // Log successful verification
    await auditService.createAuditLog(
      userId,
      AuditActionType.DEVICE_VERIFY, // Use enum
      req.ip || '',
      req.headers['user-agent'] || '',
      { success: true, deviceId },
    );

    // Generate a new token with extended permissions/expiry
    const token = authService.generateToken(userId, 'voter', '90d'); // Longer expiry for verified devices

    res.status(200).json({
      success: true,
      message: 'Device verified successfully',
      data: {
        token,
        deviceVerified: true,
      },
    });
  } catch (error) {
    // Log failure if not already logged
    if (!(error instanceof ApiError && error.code === 'INVALID_VERIFICATION_CODE')) {
      await auditService
        .createAuditLog(
          userId || 'unknown',
          AuditActionType.DEVICE_VERIFY,
          req.ip || '',
          req.headers['user-agent'] || '',
          { success: false, deviceId, error: (error as Error).message },
        )
        .catch(logErr => logger.error('Failed to log device verification error', logErr));
    }
    next(error);
  }
};
