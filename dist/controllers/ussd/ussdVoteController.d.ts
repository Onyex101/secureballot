import { Request, Response, NextFunction } from 'express';
/**
 * Cast a vote via USSD
 * @route POST /api/v1/ussd/vote (Example route)
 * @access Public (requires valid sessionCode)
 */
export declare const castVote: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify a vote using receipt code (originating from USSD)
 * @route POST /api/v1/ussd/verify-vote (Example route)
 * @access Public
 */
export declare const verifyVote: (req: Request, res: Response, next: NextFunction) => Promise<void>;
