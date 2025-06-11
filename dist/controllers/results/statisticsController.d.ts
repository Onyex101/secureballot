import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get election results (potentially with breakdown)
 * @route GET /api/v1/results/elections/:electionId
 * @access Private (or Public? Check requirements)
 */
export declare const getElectionResults: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get real-time voting statistics (system-wide)
 * @route GET /api/v1/results/live-stats (Example route)
 * @access Private (or Public? Check requirements)
 */
export declare const getRealTimeVotingStats: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get comprehensive election statistics
 * @route GET /api/v1/results/statistics/:electionId
 * @access Private
 */
export declare const getElectionStatistics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get real-time election updates
 * @route GET /api/v1/results/realtime/:electionId
 * @access Private
 */
export declare const getRealTimeUpdates: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
