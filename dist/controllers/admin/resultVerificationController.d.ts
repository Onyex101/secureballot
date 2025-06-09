import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Verify election results
 * @route POST /api/v1/admin/elections/:electionId/verify-results
 * @access Private (Admin only)
 */
export declare const verifyElectionResults: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get verification history for an election
 * @route GET /api/v1/admin/elections/:electionId/verification-history
 * @access Private (Admin only)
 */
export declare const getVerificationHistory: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify and publish election results
 * @route POST /api/v1/admin/elections/:electionId/verify-and-publish
 * @access Private (Admin only)
 */
export declare const verifyAndPublishResults: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const publishResults: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const rejectResults: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
