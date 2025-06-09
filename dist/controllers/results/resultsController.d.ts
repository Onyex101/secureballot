import { Request, Response, NextFunction } from 'express';
/**
 * Get live election results
 * @route GET /api/v1/results/live/:electionId
 * @access Public
 */
export declare const getLiveResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get election results by region
 * @route GET /api/v1/results/region/:electionId
 * @access Public
 */
export declare const getResultsByRegion: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get comprehensive election statistics
 * @route GET /api/v1/results/statistics/:electionId
 * @access Public
 */
export declare const getElectionStatistics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
