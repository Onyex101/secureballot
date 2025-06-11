import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import db from '../../db/models';
import { electionService, auditService, voterService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { ElectionStatus } from '../../db/models/Election';
import { getSafeUserIdForAudit, createVoterAuditLog } from '../../utils/auditHelpers';

import { logger } from '../../config/logger';

/**
 * Get all active elections
 * @route GET /api/v1/elections
 * @access Private
 */
export const getElections = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { status = 'active', type, page = 1, limit = 10 } = req.query;
  const userId = req.user?.id;
  const queryParams = { status, type, page, limit };

  try {
    const result = await electionService.getElectionsWithPagination({
      status: status as string,
      type: type as string,
      page: Number(page),
      limit: Number(limit),
      search: req.query.search as string,
    });

    const { elections } = result;

    // Fetch candidates for each election
    const electionsWithCandidates = await Promise.all(
      elections.map(async election => {
        try {
          // Get candidates for this election (limit to first 50 candidates for list view)
          const candidatesResult = await electionService.getElectionCandidates(election.id, 1, 50);

          return {
            ...election.toJSON(),
            candidates: candidatesResult.candidates,
            candidateCount: candidatesResult.pagination.total,
          };
        } catch (error) {
          // If there's an error fetching candidates, return election without candidates
          logger.warn(`Failed to fetch candidates for election ${election.id}:`, error);
          return {
            ...election.toJSON(),
            candidates: [],
            candidateCount: 0,
          };
        }
      }),
    );

    // Get voter profile using voterService
    let voterProfile = null;
    if (userId) {
      try {
        voterProfile = await voterService.getVoterProfile(userId);
      } catch (voterError) {
        logger.warn(`Failed to get profile for user ${userId}:`, voterError);
      }
    }

    // Log election view using auditService
    if (userId) {
      await auditService.createAuditLog(
        userId,
        AuditActionType.ELECTION_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { filter: queryParams, resultsCount: result.pagination.total, success: true },
      );
    }

    // Return paginated results
    res.status(200).json({
      success: true,
      code: 'ELECTIONS_RETRIEVED',
      message: 'Elections retrieved successfully',
      data: {
        elections: electionsWithCandidates,
        pagination: result.pagination,
        // Extract verification status from profile
        voterStatus: voterProfile?.verification
          ? { isVerified: voterProfile.verification.identityVerified }
          : null,
      },
    });
  } catch (error) {
    // Log failure using auditService
    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(userId),
        AuditActionType.ELECTION_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { filter: queryParams, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log election list view error', logErr));
    next(error);
  }
};

/**
 * Get election details by ID
 * @route GET /api/v1/elections/:electionId
 * @access Private
 */
export const getElectionById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id: electionId } = req.params;
  const userId = req.user?.id;

  try {
    // Get election using electionService
    const election = await electionService.getElectionById(electionId);

    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // Get candidates using electionService (assuming we want all for details page)
    const candidatesResult = await electionService.getElectionCandidates(electionId, 1, 1000); // Get all candidates

    // Check if voter has already voted using direct DB access
    // TODO: Add voteService.checkIfVoted
    let hasVoted = false;
    if (userId) {
      try {
        const existingVote = await db.Vote.findOne({ where: { userId, electionId } });
        hasVoted = !!existingVote;
      } catch (voteCheckError) {
        logger.warn(
          `Failed to check vote status for user ${userId} in election ${electionId}:`,
          voteCheckError,
        );
      }
    }

    // Get voter profile using voterService
    let voterProfile = null;
    if (userId) {
      try {
        voterProfile = await voterService.getVoterProfile(userId);
      } catch (voterError) {
        logger.warn(`Failed to get profile for user ${userId}:`, voterError);
      }
    }

    // Calculate display status (moved from service)
    const now = new Date();
    // Define a broader type for displayStatus
    let displayStatus: ElectionStatus | 'active_soon' | 'ended' | 'upcoming' = election.status;
    if (
      election.status === ElectionStatus.SCHEDULED &&
      now >= election.startDate &&
      now <= election.endDate
    ) {
      displayStatus = 'active_soon'; // Consider making this ACTIVE directly in a background job
    } else if (election.status === ElectionStatus.ACTIVE && now > election.endDate) {
      displayStatus = 'ended'; // Consider making this COMPLETED directly in a background job
    } else if (election.status === ElectionStatus.SCHEDULED && now < election.startDate) {
      displayStatus = 'upcoming';
    }

    // Log election view using auditService
    if (userId) {
      await auditService.createAuditLog(
        userId,
        AuditActionType.ELECTION_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          electionName: election.electionName,
          success: true,
        },
      );
    }

    // Return election details
    res.status(200).json({
      code: 'ELECTION_RETRIEVED',
      message: 'Election retrieved successfully',
      data: {
        election: {
          ...election.toJSON(), // Use toJSON to get plain object
          candidates: candidatesResult.candidates,
          displayStatus,
        },
        voterStatus: {
          hasVoted,
          isVerified: voterProfile?.verification?.identityVerified || false,
        },
      },
    });
  } catch (error) {
    // Log failure using auditService
    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(userId),
        AuditActionType.ELECTION_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { electionId, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log election detail view error', logErr));
    next(error);
  }
};

/**
 * Get candidates for an election
 * @route GET /api/v1/elections/:electionId/candidates
 * @access Private
 */
export const getElectionCandidates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const { page = 1, limit = 50, search } = req.query;
  const userId = req.user?.id;
  const queryParams = { page, limit, search }; // For logging

  try {
    // Use electionService to get candidates - This service method exists
    const result = await electionService.getElectionCandidates(
      electionId,
      Number(page),
      Number(limit),
      search as string | undefined,
    );

    // Log action using auditService
    if (userId) {
      await auditService.createAuditLog(
        userId,
        AuditActionType.ELECTION_VIEW, // Still counts as viewing election-related data
        req.ip || '',
        req.headers['user-agent'] || '',
        { electionId, view: 'candidates', query: queryParams, success: true },
      );
    }

    res.status(200).json({
      code: 'CANDIDATES_RETRIEVED',
      message: 'Candidates retrieved successfully',
      data: result,
    });
  } catch (error) {
    // Log failure using auditService
    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(userId),
        AuditActionType.ELECTION_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          view: 'candidates',
          query: queryParams,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log candidate list view error', logErr));
    next(error);
  }
};

/**
 * Get candidate details by ID
 * @route GET /api/v1/elections/:electionId/candidates/:candidateId
 * @access Private
 */
export const getCandidateById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId, candidateId } = req.params;
  const userId = req.user?.id;

  try {
    // TODO: Add candidateService.getCandidateById
    const candidate = await db.Candidate.findOne({
      where: {
        id: candidateId,
        electionId,
        isActive: true, // Ensure candidate is active for this election context
      },
      // Include necessary attributes
    });

    if (!candidate) {
      throw new ApiError(404, 'Candidate not found for this election', 'CANDIDATE_NOT_FOUND');
    }

    // Log action using auditService
    if (userId) {
      await auditService.createAuditLog(
        userId,
        AuditActionType.ELECTION_VIEW, // Still election-related
        req.ip || '',
        req.headers['user-agent'] || '',
        { electionId, candidateId, view: 'candidate_details', success: true },
      );
    }

    res.status(200).json({
      code: 'CANDIDATE_RETRIEVED',
      message: 'Candidate retrieved successfully',
      data: { candidate },
    });
  } catch (error) {
    // Log failure using auditService
    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(userId),
        AuditActionType.ELECTION_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          candidateId,
          view: 'candidate_details',
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log candidate detail view error', logErr));
    next(error);
  }
};

/**
 * Get voter status for an election (eligibility, voted status)
 * @route GET /api/v1/elections/:electionId/voter-status
 * @access Private
 */
export const getVotingStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required to check voting status', 'AUTH_REQUIRED');
  }

  try {
    // Check eligibility using voterService
    const eligibility = await voterService.checkVoterEligibility(userId, electionId);

    // Check voted status using direct DB access
    // TODO: Add voteService.checkIfVoted
    const existingVote = await db.Vote.findOne({ where: { userId, electionId } });
    const hasVoted = !!existingVote;

    // Log action using auditService
    await createVoterAuditLog(
      req,
      AuditActionType.ELECTION_VIEW, // Viewing election-specific status
      {
        electionId,
        view: 'voter_status',
        eligibility: eligibility.isEligible,
        hasVoted,
        success: true,
      },
    );

    res.status(200).json({
      success: true,
      code: 'VOTER_STATUS_RETRIEVED',
      message: 'Voter status retrieved successfully',
      data: {
        electionId,
        userId,
        isEligible: eligibility.isEligible,
        eligibilityReason: eligibility.reason,
        hasVoted,
      },
    });
  } catch (error) {
    // Log failure using auditService
    await createVoterAuditLog(req, AuditActionType.ELECTION_VIEW, {
      electionId,
      view: 'voter_status',
      success: false,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log voter status view error', logErr));
    next(error);
  }
};

/**
 * Get comprehensive election dashboard data
 * @route GET /api/v1/elections/:electionId/dashboard
 * @access Private
 */
export const getElectionDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const userId = req.user?.id;

  try {
    // Get comprehensive dashboard data using electionService
    const dashboardData = await electionService.getElectionDashboard(electionId);

    // Log action using auditService
    if (userId) {
      await auditService.createAuditLog(
        userId,
        AuditActionType.ELECTION_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          view: 'dashboard',
          success: true,
        },
      );
    }

    res.status(200).json({
      success: true,
      code: 'ELECTION_DASHBOARD_RETRIEVED',
      message: 'Election dashboard data retrieved successfully',
      data: dashboardData,
    });
  } catch (error) {
    // Log failure using auditService
    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(userId),
        AuditActionType.ELECTION_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { electionId, view: 'dashboard', success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log dashboard view error', logErr));
    next(error);
  }
};
