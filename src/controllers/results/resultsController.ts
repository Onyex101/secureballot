import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import db from '../../db/models';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { ElectionStatus } from '../../db/models/Election';
import { logger } from '../../config/logger';
import { sequelize } from '../../server';
import { resultService } from '../../services';

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
  try {
    const { electionId } = req.params;

    // Get election
    const election = await db.Election.findByPk(electionId, {
      attributes: ['id', 'electionName', 'electionType', 'status'],
    });

    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'RESOURCE_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    // Check if election is active or completed
    if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
      const error: ApiError = new Error('Results are not available for this election');
      error.statusCode = 403;
      error.code = 'RESULTS_NOT_AVAILABLE';
      error.isOperational = true;
      throw error;
    }

    // Get live results using the result service
    const results = await resultService.getLiveResults(electionId);

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
  try {
    const { electionId } = req.params;
    const { regionType = 'state', regionCode } = req.query;

    // Validate regionType is one of the allowed values
    if (regionType !== 'state' && regionType !== 'lga' && regionType !== 'ward') {
      const error: ApiError = new Error('Invalid region type. Must be one of: state, lga, ward');
      error.statusCode = 400;
      error.code = 'INVALID_REGION_TYPE';
      error.isOperational = true;
      throw error;
    }

    // Get election
    const election = await db.Election.findByPk(electionId, {
      attributes: ['id', 'electionName', 'electionType', 'status'],
    });

    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'RESOURCE_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    // Check if election is active or completed
    if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
      const error: ApiError = new Error('Results are not available for this election');
      error.statusCode = 403;
      error.code = 'RESULTS_NOT_AVAILABLE';
      error.isOperational = true;
      throw error;
    }

    // Get results by region using the result service
    const results = await resultService.getResultsByRegion(
      electionId,
      regionType as 'state' | 'lga' | 'ward',
      regionCode as string,
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
        results,
      },
    });
  } catch (error) {
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
  try {
    const { electionId } = req.params;

    // Get election
    const election = await db.Election.findByPk(electionId, {
      attributes: ['id', 'electionName', 'electionType', 'status'],
    });

    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'RESOURCE_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    // Check if election is active or completed
    if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
      const error: ApiError = new Error('Statistics are not available for this election');
      error.statusCode = 403;
      error.code = 'STATISTICS_NOT_AVAILABLE';
      error.isOperational = true;
      throw error;
    }

    // Get election statistics using the result service
    const statistics = await resultService.getElectionStatistics(electionId);

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
    next(error);
  }
};
