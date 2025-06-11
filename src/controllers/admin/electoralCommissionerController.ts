import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as electionService from '../../services/electionService';
import * as auditService from '../../services/auditService';
import { generateElectionKeyPair } from '../../services/electionKeyService';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { createAdminLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';

/**
 * Create a new election
 */
export const createElection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionName, electionType, startDate, endDate, description, eligibilityRules } =
    req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Validate that end date is after start date
    if (new Date(endDate) <= new Date(startDate)) {
      throw new ApiError(400, 'End date must be after start date', 'INVALID_DATE_RANGE');
    }

    // Check for overlapping elections of the same type - pass date strings
    const hasOverlap = await electionService.checkOverlappingElections(
      electionType,
      startDate, // Pass string directly
      endDate, // Pass string directly
    );

    if (hasOverlap) {
      throw new ApiError(
        409,
        'An election of this type already exists within the specified date range',
        'ELECTION_OVERLAP',
      );
    }

    // Create new election - Pass individual arguments with date strings
    const newElection = await electionService.createElection(
      electionName,
      electionType,
      startDate, // Pass string directly
      endDate, // Pass string directly
      userId,
      description,
      eligibilityRules,
    );

    // Generate encryption keys for the election
    let keyRecord = null;
    try {
      keyRecord = await generateElectionKeyPair(newElection.id, userId);
      logger.info('Election keys generated successfully', {
        electionId: newElection.id,
        publicKeyFingerprint: keyRecord.publicKeyFingerprint,
      });
    } catch (keyError) {
      logger.error('Failed to generate election keys, but election was created', {
        electionId: newElection.id,
        error: (keyError as Error).message,
      });
      // Continue - election was created successfully, keys can be generated later
    }

    // Log the action
    await createAdminLog(req, AdminAction.ELECTION_CREATE, ResourceType.ELECTION, newElection.id, {
      success: true,
      electionId: newElection.id,
      electionName: newElection.electionName,
      electionType: newElection.electionType,
      keysGenerated: keyRecord !== null,
      publicKeyFingerprint: keyRecord?.publicKeyFingerprint,
    });

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: {
        ...newElection.toJSON(),
        keysGenerated: keyRecord !== null,
        publicKeyFingerprint: keyRecord?.publicKeyFingerprint,
      },
    });
  } catch (error) {
    // Log failure
    await createAdminLog(req, AdminAction.ELECTION_CREATE, ResourceType.ELECTION, null, {
      success: false,
      electionType,
      startDate,
      endDate,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log election creation error', logErr));
    next(error);
  }
};

/**
 * Generate encryption keys for an election
 */
export const generateElectionKeys = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Check if election exists
    const election = await electionService.getElectionById(electionId);
    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // Generate encryption keys for the election
    const keyRecord = await generateElectionKeyPair(electionId, userId);

    // Log the action
    await createAdminLog(
      req,
      AdminAction.ELECTION_KEY_GENERATE,
      ResourceType.ELECTION,
      electionId,
      {
        success: true,
        electionId: election.id,
        electionName: election.electionName,
        publicKeyFingerprint: keyRecord.publicKeyFingerprint,
      },
    );

    res.status(201).json({
      success: true,
      message: 'Election keys generated successfully',
      data: {
        electionId: keyRecord.electionId,
        publicKeyFingerprint: keyRecord.publicKeyFingerprint,
        keyGeneratedAt: keyRecord.keyGeneratedAt,
        isActive: keyRecord.isActive,
      },
    });
  } catch (error) {
    // Log failure
    await createAdminLog(req, AdminAction.ELECTION_KEY_GENERATE, ResourceType.ELECTION, null, {
      success: false,
      electionId,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log key generation error', logErr));
    next(error);
  }
};

/**
 * Publish election results
 */
export const publishResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId, publishLevel = 'preliminary' } = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Check if election exists
    const election = await electionService.getElectionById(electionId);
    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // Check if election is completed
    if (election.status !== 'completed') {
      throw new ApiError(
        400,
        'Cannot publish results for an election that is not completed',
        'ELECTION_NOT_COMPLETED',
      );
    }

    // Publish results
    const result = await electionService.publishElectionResults(
      electionId,
      publishLevel as 'preliminary' | 'final',
    );

    // Log the action
    await createAdminLog(req, AdminAction.RESULT_PUBLISH, ResourceType.ELECTION, electionId, {
      success: true,
      electionId: election.id,
      electionName: election.electionName,
      publishLevel,
    });

    res.status(200).json({
      success: true,
      message: `Election results published as ${publishLevel}`,
      data: result,
    });
  } catch (error) {
    // Log failure
    await createAdminLog(req, AdminAction.RESULT_PUBLISH, ResourceType.ELECTION, null, {
      success: false,
      electionId,
      publishLevel,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log result publication error', logErr));
    next(error);
  }
};

/**
 * Get security dashboard data
 */
export const getSecurityDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const adminUserId = req.user?.id;

  try {
    if (!adminUserId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const dashboardData = {
      activeSessions: 45,
      suspiciousActivities: 3,
      failedLoginAttempts: 12,
      recentSecurityEvents: [
        { id: 1, type: 'Suspicious Login', timestamp: new Date() },
        { id: 2, type: 'Failed Password Reset', timestamp: new Date() },
      ],
    };

    // Log dashboard access using admin logs
    await createAdminLog(req, AdminAction.DASHBOARD_VIEW, ResourceType.SECURITY_DASHBOARD, null, {
      success: true,
    });

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    // Log failure using admin logs
    await createAdminLog(req, AdminAction.DASHBOARD_VIEW, ResourceType.SECURITY_DASHBOARD, null, {
      success: false,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log security dashboard view error', logErr));
    next(error);
  }
};

/**
 * Get security logs with filtering and pagination
 */
export const getSecurityLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const adminUserId = req.user?.id;

  try {
    if (!adminUserId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const { severity, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Get security logs from audit service
    const result = await auditService.getSecurityLogs(
      severity as string | undefined,
      startDate as string | undefined,
      endDate as string | undefined,
      Number(page),
      Number(limit),
    );

    // Log security log access using admin logs
    await createAdminLog(req, AdminAction.SECURITY_LOG_VIEW, ResourceType.SECURITY_LOG, null, {
      query: req.query,
      success: true,
      recordCount: result.securityLogs.length,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Log failure using admin logs
    await createAdminLog(req, AdminAction.SECURITY_LOG_VIEW, ResourceType.SECURITY_LOG, null, {
      query: req.query,
      success: false,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log security log view error', logErr));
    next(error);
  }
};
