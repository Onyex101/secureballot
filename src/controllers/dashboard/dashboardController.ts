import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { dashboardService } from '../../services/dashboardService.js';
import logger from '../../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}

class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * Get comprehensive dashboard data for a specific election
 * @route GET /api/v1/voter/dashboard/:electionId
 * @description Retrieve all dashboard data for a specific election in a single API call
 * @access Private (Authenticated voters)
 */
export const getDashboardData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { electionId } = req.params;
    const { userId, includeRealTime = 'true', includeRegionalBreakdown = 'true' } = req.query;

    // Parse query parameters
    const includeRealTimeData = includeRealTime === 'true';
    const includeRegionalData = includeRegionalBreakdown === 'true';
    const requestingUserId = userId as string | undefined;

    // Get authenticated user ID from token
    const authUserId = req.user?.id;

    const startTime = Date.now();

    // Fetch comprehensive dashboard data
    const dashboardData = await dashboardService.getComprehensiveDashboardData({
      electionId,
      userId: requestingUserId || authUserId,
      includeRealTime: includeRealTimeData,
      includeRegionalBreakdown: includeRegionalData,
    });

    const responseTime = Date.now() - startTime;

    // Log successful request
    logger.info('Dashboard data retrieved', {
      electionId,
      userId: requestingUserId || authUserId,
      responseTime,
      includeRealTime: includeRealTimeData,
      includeRegionalData: includeRegionalData,
    });

    res.status(200).json({
      ...dashboardData,
      metadata: {
        ...dashboardData.metadata,
        responseTime,
      },
    });
  } catch (error) {
    logger.error('Error retrieving dashboard data:', error, {
      electionId: req.params.electionId,
      userId: req.query.userId || req.user?.id,
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while retrieving dashboard data',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    }
  }
};
