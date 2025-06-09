import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get audit logs with filtering and pagination
 */
export declare const getAuditLogs: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
