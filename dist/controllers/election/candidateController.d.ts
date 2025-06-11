import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get candidates for an election
 * @route GET /api/v1/elections/:electionId/candidates
 * @access Private
 */
export declare const getCandidates: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get candidate by ID
 * @route GET /api/v1/candidates/:id
 * @access Private
 */
export declare const getCandidateById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create a new candidate (admin only)
 * @route POST /api/v1/elections/:electionId/candidates
 * @access Private (Admin)
 */
export declare const createCandidate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update a candidate (admin only)
 * @route PUT /api/v1/candidates/:id
 * @access Private (Admin)
 */
export declare const updateCandidate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete a candidate (admin only)
 * @route DELETE /api/v1/candidates/:id
 * @access Private (Admin)
 */
export declare const deleteCandidate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
