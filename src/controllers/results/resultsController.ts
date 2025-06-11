import { Request, Response, NextFunction } from 'express';
// import db from '../../db/models'; // Remove direct db access
import { ApiError } from '../../middleware/errorHandler';
import { ElectionStatus } from '../../db/models/Election';
import { resultService, electionService, auditService } from '../../services'; // Add services
import { AuditActionType } from '../../db/models/AuditLog'; // Add AuditActionType
import { logger } from '../../config/logger'; // Add logger
import { getUserIdFromRequest } from '../../utils/auditHelpers';
import { createContextualLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';

/**
 * Get live election results
 * @route GET /api/v1/results/live/:electionId
 * @access Public
 */
export const getLiveResults = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;

  try {
    // Get election using service
    const election = await electionService.getElectionById(electionId);

    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // Check if election is active or completed
    if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
      throw new ApiError(
        403,
        'Results are not available for this election status',
        'RESULTS_NOT_AVAILABLE',
      );
    }

    // Get live results using the result service
    const results = await resultService.getLiveResults(electionId);

    // Log success using contextual logging
    await createContextualLog(
      req,
      AuditActionType.RESULTS_VIEW_LIVE,
      AdminAction.RESULTS_VIEW,
      ResourceType.ELECTION,
      electionId,
      { success: true },
    );

    res.status(200).json({
      success: true,
      data: {
        election: {
          id: election.id,
          name: election.electionName,
          type: election.electionType,
          status: election.status,
        },
        results,
      },
    });
  } catch (error) {
    // Log failure using contextual logging
    await createContextualLog(
      req,
      AuditActionType.RESULTS_VIEW_LIVE,
      AdminAction.RESULTS_VIEW,
      ResourceType.ELECTION,
      electionId,
      { success: false, error: (error as Error).message },
    ).catch(logErr => logger.error('Failed to log live results view error', logErr));
    next(error);
  }
};

/**
 * Get election results by region
 * @route GET /api/v1/results/region/:electionId
 * @access Public
 */
export const getResultsByRegion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const { regionType = 'state', regionCode } = req.query;
  const viewerId = getUserIdFromRequest(req); // Safely get user ID for audit logging
  const context = { electionId, regionType, regionCode }; // For logging

  try {
    // Validate regionType
    if (regionType !== 'state' && regionType !== 'lga' && regionType !== 'ward') {
      throw new ApiError(
        400,
        'Invalid region type. Must be one of: state, lga, ward',
        'INVALID_REGION_TYPE',
      );
    }
    if (!regionCode) {
      throw new ApiError(400, 'regionCode query parameter is required', 'MISSING_REGION_CODE');
    }

    // Get election using service
    const election = await electionService.getElectionById(electionId);

    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // Check if election allows result viewing
    if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
      throw new ApiError(
        403,
        'Results are not available for this election status',
        'RESULTS_NOT_AVAILABLE',
      );
    }

    // Get results by region using the result service
    const results = await resultService.getResultsByRegion(
      electionId,
      regionType as 'state' | 'lga' | 'ward',
      regionCode as string,
    );

    // Log success
    await auditService.createAuditLog(
      viewerId,
      AuditActionType.RESULTS_VIEW_REGION,
      req.ip || '',
      req.headers['user-agent'] || '',
      { success: true, ...context },
    );

    res.status(200).json({
      success: true,
      data: {
        election: {
          id: election.id,
          name: election.electionName,
          type: election.electionType,
          status: election.status,
        },
        regionType,
        regionCode,
        results,
      },
    });
  } catch (error) {
    // Log failure
    await auditService
      .createAuditLog(
        viewerId,
        AuditActionType.RESULTS_VIEW_REGION,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: false, ...context, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log region results view error', logErr));
    next(error);
  }
};

/**
 * Get comprehensive election statistics
 * @route GET /api/v1/results/statistics/:electionId
 * @access Public
 */
export const getElectionStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const viewerId = getUserIdFromRequest(req); // Safely get user ID for audit logging

  try {
    // Get election using service
    const election = await electionService.getElectionById(electionId);

    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // Check if election allows stats viewing
    if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
      throw new ApiError(
        403,
        'Statistics are not available for this election status',
        'STATS_NOT_AVAILABLE',
      );
    }

    // Get election statistics using the result service
    const statistics = await resultService.getElectionStatistics(electionId);

    // Log success
    await auditService.createAuditLog(
      viewerId,
      AuditActionType.RESULTS_VIEW_STATS,
      req.ip || '',
      req.headers['user-agent'] || '',
      { success: true, electionId },
    );

    res.status(200).json({
      success: true,
      data: {
        election: {
          id: election.id,
          name: election.electionName,
          type: election.electionType,
          status: election.status,
        },
        statistics,
      },
    });
  } catch (error) {
    // Log failure
    await auditService
      .createAuditLog(
        viewerId,
        AuditActionType.RESULTS_VIEW_STATS,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: false, electionId, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log stats view error', logErr));
    next(error);
  }
};
