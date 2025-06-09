import { Request, Response, NextFunction } from 'express';
/**
 * Authenticate a voter via USSD
 * @route POST /api/v1/ussd/auth
 * @access Public
 */
export declare const authenticateViaUssd: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify a USSD session
 * @route POST /api/v1/ussd/verify-session
 * @access Public
 */
export declare const verifyUssdSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
