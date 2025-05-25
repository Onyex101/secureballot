import { Request, Response, NextFunction } from 'express';
import * as ussdService from '../../services/ussdService';
import * as auditService from '../../services/auditService';
import * as voterService from '../../services/voterService';
import * as electionService from '../../services/electionService';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { UssdSessionStatus } from '../../db/models/UssdSession';
import { AuthRequest } from '../../middleware/auth';

// USSD Menu definitions
const USSD_MENUS = {
  MAIN: {
    id: 'MAIN',
    title: 'SecureBallot USSD',
    text: 'Welcome to SecureBallot\n1. Check Voter Status\n2. View Polling Unit\n3. Election Info\n4. Help\n0. Exit',
    options: ['1', '2', '3', '4', '0'],
  },
  VOTER_STATUS: {
    id: 'VOTER_STATUS',
    title: 'Voter Status',
    text: 'Enter your NIN to check status:',
    options: [],
    requiresInput: true,
  },
  POLLING_UNIT: {
    id: 'POLLING_UNIT',
    title: 'Polling Unit Info',
    text: 'Enter your NIN to view polling unit:',
    options: [],
    requiresInput: true,
  },
  ELECTION_INFO: {
    id: 'ELECTION_INFO',
    title: 'Election Information',
    text: '1. Active Elections\n2. Upcoming Elections\n0. Back to Main Menu',
    options: ['1', '2', '0'],
  },
  HELP: {
    id: 'HELP',
    title: 'Help',
    text: 'SecureBallot USSD Help:\n- Check voter registration status\n- View assigned polling unit\n- Get election information\n\nFor support: Call 0800-VOTE-NG\n\n0. Back to Main Menu',
    options: ['0'],
  },
};

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

    // Validate phone number format (Nigerian format)
    const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new ApiError(400, 'Invalid Nigerian phone number format', 'INVALID_PHONE_FORMAT');
    }

    // Create USSD session
    const sessionCode = await ussdService.createUssdSession('system', phoneNumber);
    const session = { sessionCode, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }; // 30 min expiry

    // Set initial menu state (placeholder - implement when updateSessionState is available)
    // await ussdService.updateSessionState(sessionId, { currentMenu: 'MAIN', menuHistory: [], userInput: {} });

    // Log the action
    await auditService.createAuditLog(
      'system',
      AuditActionType.USSD_SESSION_START,
      req.ip || '',
      req.headers['user-agent'] || '',
      { phoneNumber, sessionId, success: true },
    );

    res.status(200).json({
      success: true,
      message: 'USSD session started successfully',
      data: {
        sessionId,
        sessionCode: session.sessionCode,
        menu: USSD_MENUS.MAIN,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        'system',
        AuditActionType.USSD_SESSION_START,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          phoneNumber: req.body.phoneNumber,
          sessionId: req.body.sessionId,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log USSD session start error', logErr));

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
    const { sessionId, selection } = req.body;

    if (!sessionId || selection === undefined) {
      throw new ApiError(400, 'Session ID and selection are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Get current session (placeholder - implement when getSession is available)
    const session = {
      sessionData: { currentMenu: 'MAIN', menuHistory: [], userInput: {} },
      userId: null,
    };
    if (!sessionId) {
      throw new ApiError(404, 'Session not found or expired', 'SESSION_NOT_FOUND');
    }

    // Get current menu state
    const sessionState = session.sessionData || {
      currentMenu: 'MAIN',
      menuHistory: [],
      userInput: {},
    };
    const currentMenu = sessionState.currentMenu || 'MAIN';

    let nextMenu = currentMenu;
    let responseData: any = {};
    let shouldEndSession = false;

    // Process selection based on current menu
    switch (currentMenu) {
      case 'MAIN':
        switch (selection) {
          case '1':
            nextMenu = 'VOTER_STATUS';
            break;
          case '2':
            nextMenu = 'POLLING_UNIT';
            break;
          case '3':
            nextMenu = 'ELECTION_INFO';
            break;
          case '4':
            nextMenu = 'HELP';
            break;
          case '0':
            shouldEndSession = true;
            responseData = { message: 'Thank you for using SecureBallot USSD service.' };
            break;
          default:
            throw new ApiError(400, 'Invalid selection', 'INVALID_SELECTION');
        }
        break;

      case 'VOTER_STATUS':
        // Process NIN input for voter status check
        if (selection.length === 11 && /^\d+$/.test(selection)) {
          try {
            // TODO: Implement voter lookup when getVoterByNin is available
            responseData = {
              message:
                'Voter lookup service unavailable. Please try again later.\n\n0. Back to Main Menu',
              options: ['0'],
            };
            nextMenu = 'RESULT_DISPLAY';
          } catch (error) {
            responseData = {
              message: 'Error checking voter status. Please try again.\n\n0. Back to Main Menu',
              options: ['0'],
            };
            nextMenu = 'RESULT_DISPLAY';
          }
        } else {
          throw new ApiError(400, 'Invalid NIN format. Must be 11 digits.', 'INVALID_NIN_FORMAT');
        }
        break;

      case 'POLLING_UNIT':
        // Process NIN input for polling unit info
        if (selection.length === 11 && /^\d+$/.test(selection)) {
          try {
            const voter = await voterService.getVoterByNin(selection);
            if (voter && voter.pollingUnit) {
              responseData = {
                message: `Polling Unit Info:\nName: ${voter.pollingUnit.name}\nCode: ${voter.pollingUnit.code}\nAddress: ${voter.pollingUnit.address}\nWard: ${voter.pollingUnit.ward}\nLGA: ${voter.pollingUnit.lga}\n\n0. Back to Main Menu`,
                options: ['0'],
              };
            } else {
              responseData = {
                message: 'Voter not found or no polling unit assigned.\n\n0. Back to Main Menu',
                options: ['0'],
              };
            }
            nextMenu = 'RESULT_DISPLAY';
          } catch (error) {
            responseData = {
              message:
                'Error retrieving polling unit info. Please try again.\n\n0. Back to Main Menu',
              options: ['0'],
            };
            nextMenu = 'RESULT_DISPLAY';
          }
        } else {
          throw new ApiError(400, 'Invalid NIN format. Must be 11 digits.', 'INVALID_NIN_FORMAT');
        }
        break;

      case 'ELECTION_INFO':
        switch (selection) {
          case '1':
            // Get active elections
            try {
              const activeElections = await electionService.getActiveElections();
              const electionList =
                activeElections.length > 0
                  ? activeElections
                      .map((e: any, i: number) => `${i + 1}. ${e.electionName}`)
                      .join('\n')
                  : 'No active elections';
              responseData = {
                message: `Active Elections:\n${electionList}\n\n0. Back to Main Menu`,
                options: ['0'],
              };
            } catch (error) {
              responseData = {
                message: 'Error retrieving election info.\n\n0. Back to Main Menu',
                options: ['0'],
              };
            }
            nextMenu = 'RESULT_DISPLAY';
            break;
          case '2':
            // Get upcoming elections
            try {
              const upcomingElections = await electionService.getUpcomingElections();
              const electionList =
                upcomingElections.length > 0
                  ? upcomingElections
                      .map(
                        (e: any, i: number) =>
                          `${i + 1}. ${e.electionName} - ${new Date(e.startDate).toLocaleDateString()}`,
                      )
                      .join('\n')
                  : 'No upcoming elections';
              responseData = {
                message: `Upcoming Elections:\n${electionList}\n\n0. Back to Main Menu`,
                options: ['0'],
              };
            } catch (error) {
              responseData = {
                message: 'Error retrieving election info.\n\n0. Back to Main Menu',
                options: ['0'],
              };
            }
            nextMenu = 'RESULT_DISPLAY';
            break;
          case '0':
            nextMenu = 'MAIN';
            break;
          default:
            throw new ApiError(400, 'Invalid selection', 'INVALID_SELECTION');
        }
        break;

      case 'HELP':
      case 'RESULT_DISPLAY':
        if (selection === '0') {
          nextMenu = 'MAIN';
        } else {
          throw new ApiError(400, 'Invalid selection', 'INVALID_SELECTION');
        }
        break;

      default:
        nextMenu = 'MAIN';
    }

    // Update session state
    if (!shouldEndSession) {
      const newState = {
        currentMenu: nextMenu,
        menuHistory: [...(sessionState.menuHistory || []), currentMenu],
        userInput: { ...sessionState.userInput, [currentMenu]: selection },
      };
      await ussdService.updateSessionState(sessionId, newState);
    } else {
      await ussdService.endSession(sessionId);
    }

    // Log the action
    await auditService.createAuditLog(
      session.userId || 'system',
      AuditActionType.USSD_MENU_NAVIGATION,
      req.ip || '',
      req.headers['user-agent'] || '',
      { sessionId, currentMenu, selection, nextMenu, success: true },
    );

    // Prepare response
    const response: any = {
      success: true,
      data: {
        sessionId,
        sessionEnded: shouldEndSession,
      },
    };

    if (shouldEndSession) {
      response.data = { ...response.data, ...responseData };
    } else {
      const menuData = responseData.message
        ? responseData
        : USSD_MENUS[nextMenu as keyof typeof USSD_MENUS];
      response.data.menu = menuData;
    }

    res.status(200).json(response);
  } catch (error) {
    await auditService
      .createAuditLog(
        'system',
        AuditActionType.USSD_MENU_NAVIGATION,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          sessionId: req.body.sessionId,
          selection: req.body.selection,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log USSD menu navigation error', logErr));

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

    // Get session before ending
    const session = await ussdService.getSession(sessionId);
    if (!session) {
      throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }

    // End the session
    await ussdService.endSession(sessionId);

    // Log the action
    await auditService.createAuditLog(
      session.userId || 'system',
      AuditActionType.USSD_SESSION_END,
      req.ip || '',
      req.headers['user-agent'] || '',
      { sessionId, success: true },
    );

    res.status(200).json({
      success: true,
      message: 'USSD session ended successfully',
      data: {
        sessionId,
        endedAt: new Date(),
      },
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        'system',
        AuditActionType.USSD_SESSION_END,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          sessionId: req.body.sessionId,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log USSD session end error', logErr));

    next(error);
  }
};
