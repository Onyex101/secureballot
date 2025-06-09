import { Request, Response, NextFunction } from 'express';
/**
 * Authenticate a voter via USSD
 * @route POST /api/v1/auth/ussd/authenticate
 * @access Public
 */
export declare const authenticateViaUssd: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify USSD session
 * @route POST /api/v1/auth/ussd/verify-session
 * @access Public
 */
export declare const verifyUssdSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
