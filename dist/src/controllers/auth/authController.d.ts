import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Register a new voter
 * @route POST /api/v1/admin/register-voter (Admin access)
 * @route POST /api/v1/auth/register (Legacy - removed)
 * @access Admin only
 */
export declare const register: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Login a voter - Simplified for POC (only NIN and VIN required)
 * @route POST /api/v1/auth/login
 * @access Public
 */
export declare const login: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify MFA token
 * @route POST /api/v1/auth/verify-mfa
 * @access Public
 */
export declare const verifyMfa: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Login an admin user
 * @route POST /api/v1/auth/admin-login
 * @access Public
 */
export declare const adminLogin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Refresh token
 * @route POST /api/v1/auth/refresh-token
 * @access Private
 */
export declare const refreshToken: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Logout a voter
 * @route POST /api/v1/auth/logout
 * @access Private
 */
export declare const logout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
