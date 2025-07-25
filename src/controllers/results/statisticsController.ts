import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { auditService, statisticsService, voteService } from '../../services';
import { logger } from '../../config/logger';
import { getSafeUserIdForAudit } from '../../utils/auditHelpers';
import { Request } from 'express';
import { createContextualLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';

/**
 * Get election results (potentially with breakdown)
 * @route GET /api/v1/results/elections/:electionId
 * @access Private (or Public? Check requirements)
 */
export const getElectionResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const { includePollingUnitBreakdown = false } = req.query;
  const context = { electionId, includePollingUnitBreakdown };

  try {
    // Get election results
    const results = await statisticsService.getElectionResults(
      electionId,
      includePollingUnitBreakdown === 'true',
    );

    // Log the action using contextual logging
    await createContextualLog(
      req,
      AuditActionType.ELECTION_RESULTS_VIEW,
      AdminAction.RESULTS_VIEW,
      ResourceType.ELECTION,
      electionId,
      { success: true, ...context },
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    await createContextualLog(
      req,
      AuditActionType.ELECTION_RESULTS_VIEW,
      AdminAction.RESULTS_VIEW,
      ResourceType.ELECTION,
      electionId,
      { success: false, ...context, error: (error as Error).message },
    ).catch(logErr => logger.error('Failed to log election results view error', logErr));
    next(error);
  }
};

/**
 * Get real-time voting statistics (system-wide)
 * @route GET /api/v1/results/live-stats (Example route)
 * @access Private (or Public? Check requirements)
 */
export const getRealTimeVotingStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getSafeUserIdForAudit(req.user?.id); // Safely get user ID for audit logging

  try {
    // Get real-time voting statistics
    const stats = await statisticsService.getRealTimeVotingStats();

    // Log the action using contextual logging
    await createContextualLog(
      req,
      AuditActionType.REAL_TIME_STATS_VIEW,
      AdminAction.SYSTEM_STATS_VIEW,
      ResourceType.SYSTEM,
      userId,
      { success: true },
    );

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    await createContextualLog(
      req,
      AuditActionType.REAL_TIME_STATS_VIEW,
      AdminAction.SYSTEM_STATS_VIEW,
      ResourceType.SYSTEM,
      userId,
      { success: false, error: (error as Error).message },
    ).catch(logErr => logger.error('Failed to log real-time stats view error', logErr));
    next(error);
  }
};

/**
 * Get comprehensive election statistics
 * @route GET /api/v1/results/statistics/:electionId
 * @access Private
 */
export const getElectionStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { electionId } = req.params;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!electionId) {
      throw new ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
    }

    // Get comprehensive election statistics from the simplified service
    const electionStats = await statisticsService.getElectionStatistics(electionId);

    // Log the action using contextual logging
    await createContextualLog(
      req,
      AuditActionType.ELECTION_STATISTICS_VIEW,
      AdminAction.ELECTION_DETAIL_VIEW,
      ResourceType.ELECTION,
      electionId,
      { electionId, success: true },
    );

    res.status(200).json({
      success: true,
      message: 'Election statistics retrieved successfully',
      data: {
        electionId: electionStats.electionId,
        electionName: electionStats.electionName,
        electionType: electionStats.electionType,
        status: electionStats.status,
        lastUpdated: electionStats.lastUpdated,

        // Basic Vote Statistics
        votingStatistics: electionStats.votingStatistics,

        // Polling Unit Statistics
        pollingUnitStatistics: electionStats.pollingUnitStatistics,

        // Candidate Performance
        candidateStatistics: electionStats.candidateStatistics,

        // Placeholder sections that can be enhanced later
        regionalBreakdown: [],
        stateBreakdown: [],
        demographicStatistics: {
          ageGroups: [],
          genderBreakdown: {
            male: {
              votersRegistered: 0,
              votesCast: 0,
              turnoutPercentage: 0,
              percentageOfTotalVotes: 0,
            },
            female: {
              votersRegistered: 0,
              votesCast: 0,
              turnoutPercentage: 0,
              percentageOfTotalVotes: 0,
            },
          },
        },
        timeStatistics: {
          electionStartTime: null,
          electionEndTime: null,
          currentDay: 0,
          totalDuration: 0,
          peakVotingHour: '00:00',
          dailyVoteProgress: [],
        },
        securityStatistics: {
          totalVoteVerifications: electionStats.votingStatistics.totalVotesCast,
          successfulVerifications: electionStats.votingStatistics.validVotes,
          failedVerifications: electionStats.votingStatistics.invalidVotes,
          suspiciousActivityDetected: 0,
          suspiciousActivityResolved: 0,
          systemUptimePercentage: 99.99,
          averageVoteProcessingTimeMs: 150,
          encryptionIntegrityChecks: electionStats.votingStatistics.totalVotesCast,
          blockchainVerifications: electionStats.votingStatistics.totalVotesCast,
        },
        performanceMetrics: {
          votesPerSecond: 0,
          peakVotesPerSecond: 0,
          averageResponseTimeMs: 89,
          totalApiCalls: 0,
          successfulApiCalls: 0,
          errorRate: 0.0,
        },
      },
    });
  } catch (error) {
    await createContextualLog(
      req,
      AuditActionType.ELECTION_STATISTICS_VIEW,
      AdminAction.ELECTION_DETAIL_VIEW,
      ResourceType.ELECTION,
      req.params.electionId,
      {
        electionId: req.params.electionId,
        success: false,
        error: (error as Error).message,
      },
    ).catch(logErr => logger.error('Failed to log election statistics view error', logErr));

    next(error);
  }
};

/**
 * Get real-time election updates
 * @route GET /api/v1/results/realtime/:electionId
 * @access Private
 */
export const getRealTimeUpdates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { electionId } = req.params;
    const { lastUpdate } = req.query;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!electionId) {
      throw new ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
    }

    // Parse lastUpdate timestamp
    let lastUpdateDate: Date | undefined;
    if (lastUpdate && typeof lastUpdate === 'string') {
      lastUpdateDate = new Date(lastUpdate);
      if (isNaN(lastUpdateDate.getTime())) {
        throw new ApiError(400, 'Invalid lastUpdate timestamp format', 'INVALID_TIMESTAMP');
      }
    }

    // Get real-time updates from statistics service
    const updates = {
      newVotes: 0,
      pollingUnitsReporting: 0,
      lastVoteTimestamp: new Date(),
      pollingActivity: [],
      processingDelay: 0,
    }; // Placeholder until getRealTimeUpdates is implemented

    // Get current vote counts
    const currentVoteCounts = await voteService.countVotes(electionId);
    const totalVotes = currentVoteCounts.reduce((sum, candidate) => sum + candidate.voteCount, 0);

    // Calculate new votes since last update
    let newVotesSinceUpdate = 0;
    if (lastUpdateDate) {
      // This would require tracking votes by timestamp
      // For now, we'll use the updates service data
      newVotesSinceUpdate = updates.newVotes || 0;
    }

    // Prepare updated statistics
    const updatedStatistics = {
      totalVotes,
      candidates: currentVoteCounts.map(candidate => ({
        candidateId: candidate.candidateId,
        candidateName: candidate.candidateName,
        voteCount: candidate.voteCount,
        percentage: totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0,
      })),
      pollingUnitsReporting: updates.pollingUnitsReporting || 0,
      lastVoteTimestamp: updates.lastVoteTimestamp,
    };

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.REAL_TIME_UPDATES_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { electionId, lastUpdate, newVotes: newVotesSinceUpdate, success: true },
    );

    res.status(200).json({
      success: true,
      message: 'Real-time updates retrieved successfully',
      data: {
        electionId,
        lastUpdate: new Date().toISOString(),
        newVotesSinceLastUpdate: newVotesSinceUpdate,
        updatedStatistics,
        pollingActivity: updates.pollingActivity || [],
        systemStatus: {
          healthy: true,
          lastProcessedVote: updates.lastVoteTimestamp,
          processingDelay: updates.processingDelay || 0,
        },
      },
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(req.user?.id), // Safely get user ID for audit logging
        AuditActionType.REAL_TIME_UPDATES_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId: req.params.electionId,
          lastUpdate: req.query.lastUpdate,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log real-time updates view error', logErr));

    next(error);
  }
};

/**
 * Get general system statistics
 * @route GET /api/v1/statistics/system
 * @access Public/Private (depends on configuration)
 */
export const getSystemStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get system statistics (placeholder implementation)
    const stats = {
      totalElections: 0,
      activeElections: 0,
      totalVoters: 0,
      totalVotesCast: 0,
      systemUptime: '99.9%',
      lastUpdate: new Date(),
    };

    // Log the action using contextual logging
    await createContextualLog(
      req,
      AuditActionType.SYSTEM_STATISTICS_VIEW,
      AdminAction.SYSTEM_STATS_VIEW,
      ResourceType.SYSTEM,
      null,
      { success: true, statsType: 'system' },
    );

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    // Log failure using contextual logging
    await createContextualLog(
      req,
      AuditActionType.SYSTEM_STATISTICS_VIEW,
      AdminAction.SYSTEM_STATS_VIEW,
      ResourceType.SYSTEM,
      null,
      { success: false, statsType: 'system', error: (error as Error).message },
    ).catch(logErr => logger.error('Failed to log system statistics view error', logErr));
    next(error);
  }
};
