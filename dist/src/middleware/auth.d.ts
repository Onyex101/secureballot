import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: any;
    userType?: 'admin' | 'voter';
    userId?: string;
    role?: string;
}
/**
 * Middleware to authenticate JWT token for both admin and voter users
 * @route All protected routes
 */
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to ensure user is an admin
 * @route Admin-only routes
 */
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to ensure user is a voter
 * @route Voter-only routes
 */
export declare const requireVoter: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to check specific permissions for admin users
 * @param requiredPermission Required permission string
 * @route Admin routes with specific permission requirements
 */
export declare const hasPermission: (requiredPermission: string) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to check if MFA is enabled
 * @route Routes requiring MFA
 */
export declare const requireMfa: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to check device verification for mobile routes
 * @route Mobile routes requiring device verification
 */
export declare const requireDeviceVerification: (req: AuthRequest, res: Response, next: NextFunction) => void;
