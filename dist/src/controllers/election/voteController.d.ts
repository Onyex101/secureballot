import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Cast a vote in an election
 * @route POST /api/v1/elections/:electionId/vote
 * @access Private
 */
export declare const castVote: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify a vote using receipt code
 * @route GET /api/v1/votes/verify/:receiptCode
 * @access Public (or Private? Depends on requirements)
 */
export declare const verifyVote: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get vote history for the authenticated voter
 * @route GET /api/v1/voter/vote-history
 * @access Private
 */
export declare const getVoteHistory: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Report an issue with a vote
 * @route POST /api/v1/votes/report-issue
 * @access Private
 */
export declare const reportVoteIssue: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check voting status for a specific election
 * @route GET /api/v1/elections/:electionId/voting-status
 * @access Private
 */
export declare const checkVotingStatus: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
