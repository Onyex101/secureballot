import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get all active elections
 * @route GET /api/v1/elections
 * @access Private
 */
export declare const getElections: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get election details by ID
 * @route GET /api/v1/elections/:electionId
 * @access Private
 */
export declare const getElectionById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get candidates for an election
 * @route GET /api/v1/elections/:electionId/candidates
 * @access Private
 */
export declare const getElectionCandidates: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get candidate details by ID
 * @route GET /api/v1/elections/:electionId/candidates/:candidateId
 * @access Private
 */
export declare const getCandidateById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get voter status for an election (eligibility, voted status)
 * @route GET /api/v1/elections/:electionId/voter-status
 * @access Private
 */
export declare const getVotingStatus: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get comprehensive election dashboard data
 * @route GET /api/v1/elections/:electionId/dashboard
 * @access Private
 */
export declare const getElectionDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
