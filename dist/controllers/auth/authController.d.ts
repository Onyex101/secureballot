import { Request, Response, NextFunction } from 'express';
/**
 * Register a new voter
 * @route POST /api/v1/auth/register
 * @access Public
 */
export declare const register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
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
export declare const refreshToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Logout a voter
 * @route POST /api/v1/auth/logout
 * @access Private
 */
export declare const logout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Request password reset
 * @route POST /api/v1/auth/forgot-password
 * @access Public
 */
export declare const forgotPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reset password
 * @route POST /api/v1/auth/reset-password
 * @access Public
 */
export declare const resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
