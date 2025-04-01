import { Request, Response, NextFunction } from 'express';
import { authService, auditService, ussdService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';
import { AuditActionType } from '../../db/models/AuditLog';

/**
 * Authenticate a voter via USSD
 * @route POST /api/v1/ussd/auth
 * @access Public
 */
export const authenticateViaUssd = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { nin, vin, phoneNumber } = req.body;
  let voterId: string | undefined;
  let sessionCode: string | undefined;

  try {
    // Authenticate voter
    const voter = await authService.authenticateVoterForUssd(nin, vin, phoneNumber);
    voterId = voter.id;

    // Generate a session code
    sessionCode = await ussdService.createUssdSession(voter.id, phoneNumber);

    // Log the authentication success
    await auditService.createAuditLog(
      voter.id,
      AuditActionType.USSD_SESSION,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        context: 'authentication',
        phoneNumber,
        sessionCode,
      },
    );

    // Send session code via SMS (placeholder log)
    logger.debug(
      `[SMS] To: ${phoneNumber}, Message: Your USSD voting session code is: ${sessionCode}`,
    );

    res.status(200).json({
      success: true,
      message: 'USSD authentication successful. Check SMS for session code.',
      data: {
        // Avoid sending session code in response if sent via SMS
        expiresIn: 600, // 10 minutes in seconds
      },
    });
  } catch (error: any) {
    // Log failure
    await auditService
      .createAuditLog(
        voterId || 'unknown',
        AuditActionType.USSD_SESSION,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          context: 'authentication',
          phoneNumber,
          nin,
          vin, // Log input identifiers
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log USSD auth error', logErr));
    // Pass error to global handler
    next(
      error instanceof ApiError
        ? error
        : new ApiError(401, 'Authentication failed', 'AUTHENTICATION_FAILED'),
    );
  }
};

/**
 * Verify a USSD session
 * @route POST /api/v1/ussd/verify-session
 * @access Public
 */
export const verifyUssdSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { sessionCode, phoneNumber } = req.body;
  let userIdFromSession: string | undefined;

  try {
    if (!sessionCode || !phoneNumber) {
      throw new ApiError(400, 'sessionCode and phoneNumber are required', 'MISSING_SESSION_INFO');
    }
    // Verify the session
    const session = await ussdService.verifyUssdSession(sessionCode, phoneNumber);
    userIdFromSession = session?.userId; // Capture for potential failure log

    if (!session) {
      // Log failure before throwing
      await auditService
        .createAuditLog(
          userIdFromSession || 'unknown',
          AuditActionType.USSD_SESSION,
          req.ip || '',
          req.headers['user-agent'] || '',
          {
            success: false,
            context: 'verification',
            phoneNumber,
            sessionCode,
            error: 'Invalid or expired session',
          },
        )
        .catch(logErr => logger.error('Failed to log USSD session verification error', logErr));
      throw new ApiError(401, 'Invalid or expired session', 'INVALID_SESSION');
    }

    // Log the verification success
    await auditService.createAuditLog(
      session.userId,
      AuditActionType.USSD_SESSION,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        context: 'verification',
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
  } catch (error: any) {
    // Log failure if not already logged
    if (!(error instanceof ApiError && error.code === 'INVALID_SESSION')) {
      await auditService
        .createAuditLog(
          userIdFromSession || 'unknown',
          AuditActionType.USSD_SESSION,
          req.ip || '',
          req.headers['user-agent'] || '',
          {
            success: false,
            context: 'verification',
            phoneNumber,
            sessionCode,
            error: (error as Error).message,
          },
        )
        .catch(logErr => logger.error('Failed to log USSD session verification error', logErr));
    }
    // Pass error to global handler
    next(
      error instanceof ApiError
        ? error
        : new ApiError(401, 'Session verification failed', 'SESSION_VERIFICATION_FAILED'),
    );
  }
};
