import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get user's assigned polling unit
 * @route GET /api/v1/mobile/my-polling-unit (Example route)
 * @access Private
 */
export declare const getUserPollingUnit: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
