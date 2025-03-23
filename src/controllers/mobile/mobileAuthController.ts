import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { authService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Login via mobile app
 */
export const mobileLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { nin, vin, password, deviceInfo } = req.body;

    try {
      // Authenticate voter
      const voter = await authService.authenticateVoter(nin, password);

      // Verify that NIN and VIN match
      if (voter.nin !== nin || voter.vin !== vin) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = authService.generateToken(voter.id, 'voter', '30d'); // Longer expiry for mobile

      // Log the login with device info
      await auditService.createAuditLog(
        voter.id,
        'mobile_login',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
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
          requiresDeviceVerification: true, // Always require device verification for mobile
        },
      });
    } catch (error) {
      // Log failed login attempt
      await auditService.createAuditLog(
        'unknown',
        'mobile_login_failed',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          nin,
          error: (error as Error).message,
          deviceInfo: deviceInfo || 'Not provided',
        },
      );

      const apiError: ApiError = new Error('Invalid credentials');
      apiError.statusCode = 401;
      apiError.code = 'INVALID_CREDENTIALS';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
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
  try {
    const userId = req.user?.id;
    const { deviceId, verificationCode } = req.body;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    // In a real implementation, you would verify the device code against what was sent
    // For now, we'll just simulate that process with a fixed code
    const isValid = verificationCode === '123456'; // In production, use proper verification

    if (!isValid) {
      // Log failed verification attempt
      await auditService.createAuditLog(
        userId,
        'device_verification_failed',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          deviceId,
          reason: 'Invalid verification code',
        },
      );

      const error: ApiError = new Error('Invalid verification code');
      error.statusCode = 400;
      error.code = 'INVALID_VERIFICATION_CODE';
      error.isOperational = true;
      throw error;
    }

    // Log successful verification
    await auditService.createAuditLog(
      userId,
      'device_verified',
      req.ip || '',
      req.headers['user-agent'] || '',
      { deviceId },
    );

    // Generate a new token with extended permissions
    const token = authService.generateToken(userId, 'voter', '90d'); // 90 days for verified devices

    res.status(200).json({
      success: true,
      message: 'Device verified successfully',
      data: {
        token,
        deviceVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};
