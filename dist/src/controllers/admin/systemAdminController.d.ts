import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * List all system users with pagination and filtering
 */
export declare const listUsers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create a new admin user
 */
export declare const createUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get comprehensive admin dashboard data
 */
export declare const getDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
