import { Request, Response, NextFunction } from 'express';
import { ussdService, authService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';

/**
 * Authenticate a voter via USSD
 * @route POST /api/v1/auth/ussd/authenticate
 * @access Public
 */
export const authenticateViaUssd = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { nin, vin, phoneNumber } = req.body;

    try {
      // Start a USSD session (which authenticates the voter)
      const result = await ussdService.startSession(nin, vin, phoneNumber);

      // Log the action
      await auditService.createAuditLog(
        'ussd_system',
        AuditActionType.USSD_SESSION,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: true,
          context: 'authentication',
          phoneNumber,
          sessionCode: result.sessionCode,
        },
      );

      res.status(200).json({
        success: true,
        message: 'USSD authentication successful',
        data: {
          sessionCode: result.sessionCode,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      // Log failed authentication attempt
      await auditService.createAuditLog(
        'unknown',
        AuditActionType.USSD_SESSION,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          context: 'authentication',
          phoneNumber,
          error: (error as Error).message,
        },
      );

      const apiError = new ApiError(
        401,
        'Invalid credentials',
        'INVALID_CREDENTIALS',
        undefined,
        true,
      );
      throw apiError;
    }
  } catch (error: any) {
    next(error);
  }
};

/**
 * Verify USSD session
 * @route POST /api/v1/auth/ussd/verify-session
 * @access Public
 */
export const verifyUssdSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sessionCode } = req.body;

    try {
      // Get session status
      const result = await ussdService.getSessionStatus(sessionCode);

      // Check if session is valid
      const isValid =
        result.status !== 'expired' &&
        result.status !== 'cancelled' &&
        new Date(result.expiresAt) > new Date();

      // Log the action
      await auditService.createAuditLog(
        result.userId || 'ussd_system',
        AuditActionType.USSD_SESSION,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: isValid,
          context: 'verification',
          sessionCode,
          isValid,
          ...(isValid ? { userId: result.userId } : { error: 'Invalid or expired session' }),
        },
      );

      if (!isValid) {
        const error = new ApiError(
          401,
          'Invalid or expired session',
          'INVALID_SESSION',
          undefined,
          true,
        );
        throw error;
      }

      // Generate a token if the session is valid
      const token = authService.generateToken(result.userId || '', 'voter', '1h');

      res.status(200).json({
        success: true,
        message: 'USSD session verified',
        data: {
          token,
          userId: result.userId,
          status: result.status,
        },
      });
    } catch (error) {
      if (!(error instanceof ApiError && error.code === 'INVALID_SESSION')) {
        await auditService.createAuditLog(
          req.body.sessionCode
            ? (await ussdService.getSessionStatus(req.body.sessionCode).catch(() => null))
                ?.userId || 'ussd_system'
            : 'ussd_system',
          AuditActionType.USSD_SESSION,
          req.ip || '',
          req.headers['user-agent'] || '',
          {
            success: false,
            context: 'verification',
            sessionCode: req.body.sessionCode,
            error: (error as Error).message,
          },
        );
      }
      if (error instanceof ApiError) {
        throw error;
      } else {
        const apiError = new ApiError(
          400,
          'Failed to verify USSD session',
          'SESSION_VERIFICATION_FAILED',
          undefined,
          true,
        );
        throw apiError;
      }
    }
  } catch (error: any) {
    next(error);
  }
};
