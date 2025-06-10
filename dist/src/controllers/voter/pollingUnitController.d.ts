import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Get all polling units with pagination and filtering
 * @route GET /api/v1/voter/polling-units
 * @access Private
 */
export declare const getPollingUnits: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get polling unit by ID
 * @route GET /api/v1/voter/polling-units/:id
 * @access Private
 */
export declare const getPollingUnitById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get nearby polling units
 * @route GET /api/v1/voter/polling-units/nearby
 * @access Private
 */
export declare const getNearbyPollingUnits: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
