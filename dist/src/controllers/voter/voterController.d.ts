import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get voter profile
 * @route GET /api/v1/voter/profile
 * @access Private
 */
export declare const getProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update voter profile
 * @route PUT /api/v1/voter/profile
 * @access Private
 */
export declare const updateProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get voter's assigned polling unit
 * @route GET /api/v1/voter/polling-unit
 * @access Private
 */
export declare const getPollingUnit: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check voter eligibility for an election
 * @route GET /api/v1/voter/eligibility/:electionId
 * @access Private
 */
export declare const checkEligibility: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Request voter verification
 * @route POST /api/v1/voter/request-verification
 * @access Private
 */
export declare const requestVerification: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Change voter password
 * @route POST /api/v1/voter/change-password
 * @access Private
 */
export declare const changePassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
