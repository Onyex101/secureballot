import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Generate offline voting package
 * @route GET /api/v1/elections/:electionId/offline-package
 * @access Private
 */
export declare const generateOfflinePackage: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Submit offline votes (encrypted)
 * @route POST /api/v1/elections/:electionId/offline-votes
 * @access Private
 */
export declare const submitOfflineVotes: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify offline vote status using receipt code
 * @route GET /api/v1/votes/verify/:receiptCode // Reuse standard verification endpoint
 * @access Private (or Public?)
 */
export declare const verifyOfflineVote: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
