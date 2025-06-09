import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Login via mobile app
 */
export declare const mobileLogin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Request device verification code
 */
export declare const requestDeviceVerification: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify mobile device
 */
export declare const verifyDevice: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Clean up expired verification codes (should be called periodically)
 */
export declare const cleanupExpiredCodes: () => void;
