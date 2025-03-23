import { Request, Response } from 'express';
import { authService, auditService, ussdService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';

/**
 * Authenticate a voter via USSD
 * @route POST /api/v1/ussd/auth
 * @access Public
 */
export const authenticateViaUssd = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nin, vin, phoneNumber } = req.body;

    try {
      // Authenticate voter
      const voter = await authService.authenticateVoterForUssd(nin, vin, phoneNumber);

      // Generate a session code
      const sessionCode = await ussdService.createUssdSession(voter.id, phoneNumber);

      // Log the authentication
      await auditService.createAuditLog(
        voter.id,
        'ussd_authentication',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          phoneNumber,
          sessionCode,
        },
      );

      // Send session code via SMS
      // In a real implementation, this would use an SMS gateway
      console.log(
        `[SMS] To: ${phoneNumber}, Message: Your USSD voting session code is: ${sessionCode}`,
      );

      res.status(200).json({
        success: true,
        message: 'USSD authentication successful',
        data: {
          sessionCode,
          expiresIn: 600, // 10 minutes in seconds
        },
      });
    } catch (error) {
      const apiError: ApiError = new Error('Authentication failed');
      apiError.statusCode = 401;
      apiError.code = 'AUTHENTICATION_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    if ((error as ApiError).isOperational) {
      res.status((error as ApiError).statusCode || 400).json({
        success: false,
        message: (error as Error).message,
        code: (error as ApiError).code,
      });
    } else {
      console.error('USSD Authentication Error:', error);
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
};

/**
 * Verify a USSD session
 * @route POST /api/v1/ussd/verify-session
 * @access Public
 */
export const verifyUssdSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionCode, phoneNumber } = req.body;

    try {
      // Verify the session
      const session = await ussdService.verifyUssdSession(sessionCode, phoneNumber);

      if (!session) {
        const error: ApiError = new Error('Invalid or expired session');
        error.statusCode = 401;
        error.code = 'INVALID_SESSION';
        error.isOperational = true;
        throw error;
      }

      // Log the verification
      await auditService.createAuditLog(
        session.userId,
        'ussd_session_verification',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          phoneNumber,
          sessionCode,
        },
      );

      res.status(200).json({
        success: true,
        message: 'USSD session verified',
        data: {
          userId: session.userId,
          isValid: true,
        },
      });
    } catch (error) {
      const apiError: ApiError = new Error('Session verification failed');
      apiError.statusCode = 401;
      apiError.code = 'SESSION_VERIFICATION_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    if ((error as ApiError).isOperational) {
      res.status((error as ApiError).statusCode || 400).json({
        success: false,
        message: (error as Error).message,
        code: (error as ApiError).code,
      });
    } else {
      console.error('USSD Session Verification Error:', error);
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
};
