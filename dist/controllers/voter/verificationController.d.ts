import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get verification status
 * @route GET /api/v1/voter/verification-status
 * @access Private
 */
export declare const getVerificationStatus: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Submit verification request
 * @route POST /api/v1/voter/submit-verification
 * @access Private
 */
export declare const submitVerification: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get pending verification requests (admin only)
 * @route GET /api/v1/admin/pending-verifications
 * @access Private (Admin)
 */
export declare const getPendingVerifications: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Approve verification request (admin only)
 * @route POST /api/v1/admin/approve-verification/:id
 * @access Private (Admin)
 */
export declare const approveVerification: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reject verification request (admin only)
 * @route POST /api/v1/admin/reject-verification/:id
 * @access Private (Admin)
 */
export declare const rejectVerification: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
