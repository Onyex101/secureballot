import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
/**
 * Create a new election
 */
export declare const createElection: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Generate encryption keys for an election
 */
export declare const generateElectionKeys: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Publish election results
 */
export declare const publishResults: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
