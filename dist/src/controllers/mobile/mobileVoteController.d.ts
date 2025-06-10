import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Cast a vote from mobile app
 * @route POST /api/v1/mobile/vote
 * @access Private
 */
export declare const castVote: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get vote receipt
 * @route GET /api/v1/mobile/vote/receipt/:receiptCode
 * @access Private
 */
export declare const getVoteReceipt: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get offline voting package
 * @route GET /api/v1/mobile/vote/offline-package
 * @access Private
 */
export declare const getOfflinePackage: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Submit offline votes
 * @route POST /api/v1/mobile/vote/submit-offline
 * @access Private
 */
export declare const submitOfflineVotes: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
