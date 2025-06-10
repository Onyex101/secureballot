import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Set up MFA for a user
 * @route POST /api/v1/auth/setup-mfa
 * @access Private
 */
export declare const setupMfa: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Enable MFA after verification
 * @route POST /api/v1/auth/enable-mfa
 * @access Private
 */
export declare const enableMfa: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Disable MFA
 * @route POST /api/v1/auth/disable-mfa
 * @access Private
 */
export declare const disableMfa: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Generate backup codes
 * @route POST /api/v1/auth/generate-backup-codes
 * @access Private
 */
export declare const generateBackupCodes: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify backup code
 * @route POST /api/v1/auth/verify-backup-code
 * @access Public
 */
export declare const verifyBackupCode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
