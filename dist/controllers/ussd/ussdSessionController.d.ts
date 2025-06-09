import { Request, Response, NextFunction } from 'express';
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
export declare const getSessionStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Start USSD session
 * @route POST /api/v1/ussd/start
 * @access Public
 */
export declare const startSession: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Handle USSD menu navigation
 * @route POST /api/v1/ussd/menu
 * @access Public
 */
export declare const handleMenuNavigation: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * End USSD session
 * @route POST /api/v1/ussd/end
 * @access Public
 */
export declare const endSession: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
