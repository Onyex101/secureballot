import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get polling units in a region (assumed to be state)
 * @route GET /api/v1/admin/regions/:state/polling-units
 * @access Private (Regional Officer)
 */
export declare const getRegionPollingUnits: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create a new polling unit
 * @route POST /api/v1/admin/polling-units
 * @access Private (Regional Officer)
 */
export declare const createPollingUnit: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update a polling unit
 * @route PUT /api/v1/admin/polling-units/:pollingUnitId
 * @access Private (Regional Officer)
 */
export declare const updatePollingUnit: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get regional statistics (state-based)
 * @route GET /api/v1/admin/regions/:state/statistics
 * @access Private (Regional Officer)
 */
export declare const getRegionStatistics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
