import { Request, Response } from 'express';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        [key: string]: any;
    };
}
/**
 * Get comprehensive dashboard data for a specific election
 * @route GET /api/v1/voter/dashboard/:electionId
 * @description Retrieve all dashboard data for a specific election in a single API call
 * @access Private (Authenticated voters)
 */
export declare const getDashboardData: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export {};
