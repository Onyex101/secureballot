"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.endSession = exports.handleMenuNavigation = exports.startSession = exports.getSessionStatus = void 0;
const ussdService = __importStar(require("../../services/ussdService"));
const auditService = __importStar(require("../../services/auditService"));
const voterService = __importStar(require("../../services/voterService"));
const electionService = __importStar(require("../../services/electionService"));
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
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
const getSessionStatus = async (req, res, next) => {
    const { sessionCode } = req.body;
    let result = null;
    try {
        if (!sessionCode) {
            throw new errorHandler_1.ApiError(400, 'sessionCode is required', 'MISSING_SESSION_CODE');
        }
        // Get session status
        result = await ussdService.getSessionStatus(sessionCode);
        // Log the action
        await auditService.createAuditLog(result.userId || 'unknown', AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            context: 'status_check',
            sessionCode,
            status: result.status,
        });
        res.status(200).json({
            success: true,
            data: {
                status: result.status,
                expiresAt: result.expiresAt,
                lastActivity: result.lastActivity,
            },
        });
    }
    catch (error) {
        // Log failure
        await auditService
            .createAuditLog(result?.userId || 'unknown', AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', { success: false, context: 'status_check', sessionCode, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log USSD session status check error', logErr));
        // Pass error to global handler
        next(error);
    }
};
exports.getSessionStatus = getSessionStatus;
/**
 * Start USSD session
 * @route POST /api/v1/ussd/start
 * @access Public
 */
const startSession = async (req, res, next) => {
    try {
        const { phoneNumber, sessionId } = req.body;
        if (!phoneNumber || !sessionId) {
            throw new errorHandler_1.ApiError(400, 'Phone number and session ID are required', 'MISSING_REQUIRED_FIELDS');
        }
        // Validate phone number format (Nigerian format)
        const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;
        if (!phoneRegex.test(phoneNumber)) {
            throw new errorHandler_1.ApiError(400, 'Invalid Nigerian phone number format', 'INVALID_PHONE_FORMAT');
        }
        // Create USSD session
        const sessionCode = await ussdService.createUssdSession('system', phoneNumber);
        const session = { sessionCode, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }; // 30 min expiry
        // Set initial menu state (placeholder - implement when updateSessionState is available)
        // await ussdService.updateSessionState(sessionId, { currentMenu: 'MAIN', menuHistory: [], userInput: {} });
        // Log the action
        await auditService.createAuditLog('system', AuditLog_1.AuditActionType.USSD_SESSION_START, req.ip || '', req.headers['user-agent'] || '', { phoneNumber, sessionId, success: true });
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
    }
    catch (error) {
        await auditService
            .createAuditLog('system', AuditLog_1.AuditActionType.USSD_SESSION_START, req.ip || '', req.headers['user-agent'] || '', {
            phoneNumber: req.body.phoneNumber,
            sessionId: req.body.sessionId,
            success: false,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log USSD session start error', logErr));
        next(error);
    }
};
exports.startSession = startSession;
/**
 * Handle USSD menu navigation
 * @route POST /api/v1/ussd/menu
 * @access Public
 */
const handleMenuNavigation = async (req, res, next) => {
    try {
        const { sessionId, selection } = req.body;
        if (!sessionId || selection === undefined) {
            throw new errorHandler_1.ApiError(400, 'Session ID and selection are required', 'MISSING_REQUIRED_FIELDS');
        }
        // Get current session (placeholder - implement when getSession is available)
        const session = {
            sessionData: { currentMenu: 'MAIN', menuHistory: [], userInput: {} },
            userId: null,
        };
        if (!sessionId) {
            throw new errorHandler_1.ApiError(404, 'Session not found or expired', 'SESSION_NOT_FOUND');
        }
        // Get current menu state
        const sessionState = session.sessionData || {
            currentMenu: 'MAIN',
            menuHistory: [],
            userInput: {},
        };
        const currentMenu = sessionState.currentMenu || 'MAIN';
        let nextMenu = currentMenu;
        let responseData = {};
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
                        throw new errorHandler_1.ApiError(400, 'Invalid selection', 'INVALID_SELECTION');
                }
                break;
            case 'VOTER_STATUS':
                // Process NIN input for voter status check
                if (selection.length === 11 && /^\d+$/.test(selection)) {
                    try {
                        // TODO: Implement voter lookup when getVoterByNin is available
                        responseData = {
                            message: 'Voter lookup service unavailable. Please try again later.\n\n0. Back to Main Menu',
                            options: ['0'],
                        };
                        nextMenu = 'RESULT_DISPLAY';
                    }
                    catch (error) {
                        responseData = {
                            message: 'Error checking voter status. Please try again.\n\n0. Back to Main Menu',
                            options: ['0'],
                        };
                        nextMenu = 'RESULT_DISPLAY';
                    }
                }
                else {
                    throw new errorHandler_1.ApiError(400, 'Invalid NIN format. Must be 11 digits.', 'INVALID_NIN_FORMAT');
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
                        }
                        else {
                            responseData = {
                                message: 'Voter not found or no polling unit assigned.\n\n0. Back to Main Menu',
                                options: ['0'],
                            };
                        }
                        nextMenu = 'RESULT_DISPLAY';
                    }
                    catch (error) {
                        responseData = {
                            message: 'Error retrieving polling unit info. Please try again.\n\n0. Back to Main Menu',
                            options: ['0'],
                        };
                        nextMenu = 'RESULT_DISPLAY';
                    }
                }
                else {
                    throw new errorHandler_1.ApiError(400, 'Invalid NIN format. Must be 11 digits.', 'INVALID_NIN_FORMAT');
                }
                break;
            case 'ELECTION_INFO':
                switch (selection) {
                    case '1':
                        // Get active elections
                        try {
                            const activeElections = await electionService.getActiveElections();
                            const electionList = activeElections.length > 0
                                ? activeElections
                                    .map((e, i) => `${i + 1}. ${e.electionName}`)
                                    .join('\n')
                                : 'No active elections';
                            responseData = {
                                message: `Active Elections:\n${electionList}\n\n0. Back to Main Menu`,
                                options: ['0'],
                            };
                        }
                        catch (error) {
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
                            const electionList = upcomingElections.length > 0
                                ? upcomingElections
                                    .map((e, i) => `${i + 1}. ${e.electionName} - ${new Date(e.startDate).toLocaleDateString()}`)
                                    .join('\n')
                                : 'No upcoming elections';
                            responseData = {
                                message: `Upcoming Elections:\n${electionList}\n\n0. Back to Main Menu`,
                                options: ['0'],
                            };
                        }
                        catch (error) {
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
                        throw new errorHandler_1.ApiError(400, 'Invalid selection', 'INVALID_SELECTION');
                }
                break;
            case 'HELP':
            case 'RESULT_DISPLAY':
                if (selection === '0') {
                    nextMenu = 'MAIN';
                }
                else {
                    throw new errorHandler_1.ApiError(400, 'Invalid selection', 'INVALID_SELECTION');
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
        }
        else {
            await ussdService.endSession(sessionId);
        }
        // Log the action
        await auditService.createAuditLog(session.userId || 'system', AuditLog_1.AuditActionType.USSD_MENU_NAVIGATION, req.ip || '', req.headers['user-agent'] || '', { sessionId, currentMenu, selection, nextMenu, success: true });
        // Prepare response
        const response = {
            success: true,
            data: {
                sessionId,
                sessionEnded: shouldEndSession,
            },
        };
        if (shouldEndSession) {
            response.data = { ...response.data, ...responseData };
        }
        else {
            const menuData = responseData.message
                ? responseData
                : USSD_MENUS[nextMenu];
            response.data.menu = menuData;
        }
        res.status(200).json(response);
    }
    catch (error) {
        await auditService
            .createAuditLog('system', AuditLog_1.AuditActionType.USSD_MENU_NAVIGATION, req.ip || '', req.headers['user-agent'] || '', {
            sessionId: req.body.sessionId,
            selection: req.body.selection,
            success: false,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log USSD menu navigation error', logErr));
        next(error);
    }
};
exports.handleMenuNavigation = handleMenuNavigation;
/**
 * End USSD session
 * @route POST /api/v1/ussd/end
 * @access Public
 */
const endSession = async (req, res, next) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            throw new errorHandler_1.ApiError(400, 'Session ID is required', 'MISSING_SESSION_ID');
        }
        // Get session before ending
        const session = await ussdService.getSession(sessionId);
        if (!session) {
            throw new errorHandler_1.ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
        }
        // End the session
        await ussdService.endSession(sessionId);
        // Log the action
        await auditService.createAuditLog(session.userId || 'system', AuditLog_1.AuditActionType.USSD_SESSION_END, req.ip || '', req.headers['user-agent'] || '', { sessionId, success: true });
        res.status(200).json({
            success: true,
            message: 'USSD session ended successfully',
            data: {
                sessionId,
                endedAt: new Date(),
            },
        });
    }
    catch (error) {
        await auditService
            .createAuditLog('system', AuditLog_1.AuditActionType.USSD_SESSION_END, req.ip || '', req.headers['user-agent'] || '', {
            sessionId: req.body.sessionId,
            success: false,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log USSD session end error', logErr));
        next(error);
    }
};
exports.endSession = endSession;
//# sourceMappingURL=ussdSessionController.js.map