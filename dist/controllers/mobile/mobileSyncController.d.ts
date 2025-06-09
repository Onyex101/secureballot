import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Synchronize data between mobile app and server
 */
export declare const syncData: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get election details for mobile sync
 * @route GET /api/v1/mobile/sync/election/:electionId
 * @access Private
 */
export declare const getElectionDetails: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Sync offline votes
 * @route POST /api/v1/mobile/sync/offline-votes
 * @access Private
 */
export declare const syncOfflineVotes: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const castVote: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
