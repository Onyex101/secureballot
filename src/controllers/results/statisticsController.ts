import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { statisticsService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Get election statistics
 * @route GET /api/v1/results/statistics/:electionId
 * @access Private
 */
export const getElectionStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { electionId } = req.params;

    try {
      // Get election statistics
      const statistics = await statisticsService.getElectionStatistics(electionId);

      // Log the action
      await auditService.createAuditLog(
        (req.user?.id as string) || 'anonymous',
        'election_statistics_view',
        req.ip || '',
        req.headers['user-agent'] || '',
        { electionId },
      );

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to get election statistics');
      apiError.statusCode = 400;
      apiError.code = 'STATISTICS_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get election results
 * @route GET /api/v1/results/elections/:electionId
 * @access Private
 */
export const getElectionResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { electionId } = req.params;
    const { includePollingUnitBreakdown = false } = req.query;

    try {
      // Get election results
      const results = await statisticsService.getElectionResults(
        electionId,
        includePollingUnitBreakdown === 'true',
      );

      // Log the action
      await auditService.createAuditLog(
        (req.user?.id as string) || 'anonymous',
        'election_results_view',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          includePollingUnitBreakdown,
        },
      );

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to get election results');
      apiError.statusCode = 400;
      apiError.code = 'RESULTS_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get real-time voting statistics
 * @route GET /api/v1/results/live
 * @access Private
 */
export const getRealTimeVotingStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    try {
      // Get real-time voting statistics
      const stats = await statisticsService.getRealTimeVotingStats();

      // Log the action
      await auditService.createAuditLog(
        (req.user?.id as string) || 'anonymous',
        'real_time_stats_view',
        req.ip || '',
        req.headers['user-agent'] || '',
        {},
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to get real-time voting statistics');
      apiError.statusCode = 400;
      apiError.code = 'REAL_TIME_STATS_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
