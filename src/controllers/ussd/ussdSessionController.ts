import { Request, Response, NextFunction } from 'express';
import * as ussdService from '../../services/ussdService';
import * as auditService from '../../services/auditService';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { UssdSessionStatus } from '../../db/models/UssdSession';
import { AuthRequest } from '../../middleware/auth';

/**
 * NOTE: startSession function removed as it duplicates
 * ussdAuthController.authenticateViaUssd
 */

/**
 * Get session status
 * @route POST /api/v1/ussd/session-status (Example route)
 * @access Public (or requires sessionCode/phone auth? Check requirements)
 */
export const getSessionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { sessionCode } = req.body;
  let result: {
    status: UssdSessionStatus;
    userId: string | null;
    expiresAt: Date;
    lastActivity: Date;
  } | null = null;

  try {
    if (!sessionCode) {
      throw new ApiError(400, 'sessionCode is required', 'MISSING_SESSION_CODE');
    }
    // Get session status
    result = await ussdService.getSessionStatus(sessionCode);

    // Log the action
    await auditService.createAuditLog(
      result.userId || 'unknown',
      AuditActionType.USSD_SESSION,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        context: 'status_check',
        sessionCode,
        status: result.status,
      },
    );

    res.status(200).json({
      success: true,
      data: {
        status: result.status,
        expiresAt: result.expiresAt,
        lastActivity: result.lastActivity,
      },
    });
  } catch (error) {
    // Log failure
    await auditService
      .createAuditLog(
        result?.userId || 'unknown',
        AuditActionType.USSD_SESSION,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: false, context: 'status_check', sessionCode, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log USSD session status check error', logErr));

    // Pass error to global handler
    next(error);
  }
};

/**
 * Start USSD session
 * @route POST /api/v1/ussd/start
 * @access Public
 */
export const startSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { phoneNumber, sessionId } = req.body;

    if (!phoneNumber || !sessionId) {
      throw new ApiError(
        400,
        'Phone number and session ID are required',
        'MISSING_REQUIRED_FIELDS',
      );
    }

    // TODO: Implement USSD session start logic
    // This would involve:
    // 1. Validating phone number
    // 2. Creating session record
    // 3. Initializing menu state
    // 4. Setting up timeout

    // Log the action
    await auditService.createAuditLog(
      'system',
      AuditActionType.USSD_SESSION_START,
      req.ip || '',
      req.headers['user-agent'] || '',
      { phoneNumber, sessionId },
    );

    res.status(200).json({
      success: true,
      message: 'USSD session started successfully',
      data: {
        sessionId,
        menu: 'WELCOME_MENU',
        options: [
          { key: '1', text: 'Check Voter Status' },
          { key: '2', text: 'View Polling Unit' },
          { key: '3', text: 'Help' },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle USSD menu navigation
 * @route POST /api/v1/ussd/menu
 * @access Public
 */
export const handleMenuNavigation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sessionId, menuId, selection } = req.body;

    if (!sessionId || !menuId || !selection) {
      throw new ApiError(400, 'Missing required fields', 'MISSING_REQUIRED_FIELDS');
    }

    // TODO: Implement menu navigation logic
    // This would involve:
    // 1. Validating session
    // 2. Processing selection
    // 3. Updating menu state
    // 4. Generating response

    // Log the action
    await auditService.createAuditLog(
      'system',
      AuditActionType.USSD_MENU_NAVIGATION,
      req.ip || '',
      req.headers['user-agent'] || '',
      { sessionId, menuId, selection },
    );

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        menu: 'NEXT_MENU',
        options: [
          { key: '1', text: 'Option 1' },
          { key: '2', text: 'Option 2' },
          { key: '0', text: 'Back' },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * End USSD session
 * @route POST /api/v1/ussd/end
 * @access Public
 */
export const endSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new ApiError(400, 'Session ID is required', 'MISSING_SESSION_ID');
    }

    // TODO: Implement session end logic
    // This would involve:
    // 1. Validating session
    // 2. Cleaning up resources
    // 3. Recording final state
    // 4. Sending confirmation

    // Log the action
    await auditService.createAuditLog(
      'system',
      AuditActionType.USSD_SESSION_END,
      req.ip || '',
      req.headers['user-agent'] || '',
      { sessionId },
    );

    res.status(200).json({
      success: true,
      message: 'USSD session ended successfully',
      data: {
        sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};
