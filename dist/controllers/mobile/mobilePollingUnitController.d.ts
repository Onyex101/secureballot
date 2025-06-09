import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Find nearby polling units
 */
export declare const getNearbyPollingUnits: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
