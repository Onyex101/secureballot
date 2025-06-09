import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get security logs with filtering and pagination
 */
export declare const getSecurityLogs: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
