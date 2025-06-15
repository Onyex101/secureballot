import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { candidateService } from '../../services';
import { AuditActionType } from '../../db/models/AuditLog';
import { createContextualLog, createAdminLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import Candidate from '../../db/models/Candidate';

/**
 * Get candidates for an election
 * @route GET /api/v1/elections/:electionId/candidates
 * @access Private
 */
export const getCandidates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const { search, page = 1, limit = 50 } = req.query;
  const queryParams = { search, page, limit };

  try {
    // Get candidates
    const result = await candidateService.getCandidates(
      electionId,
      search as string | undefined,
      Number(page),
      Number(limit),
    );

    // Log the action based on user type
    await createContextualLog(
      req,
      AuditActionType.CANDIDATE_LIST_VIEW, // For voters
      AdminAction.CANDIDATE_LIST_VIEW, // For admins
      ResourceType.CANDIDATE,
      electionId,
      {
        query: queryParams,
        resultsCount: result.pagination.total,
        success: true,
      },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Log failure based on user type
    await createContextualLog(
      req,
      AuditActionType.CANDIDATE_LIST_VIEW, // For voters
      AdminAction.CANDIDATE_LIST_VIEW, // For admins
      ResourceType.CANDIDATE,
      electionId,
      {
        query: queryParams,
        success: false,
        error: (error as Error).message,
      },
    ).catch(logErr => logger.error('Failed to log candidate list view error', logErr));
    next(error);
  }
};

/**
 * Get candidate by ID
 * @route GET /api/v1/candidates/:id
 * @access Private
 */
export const getCandidateById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  try {
    // Get candidate
    const candidate = await candidateService.getCandidateById(id);

    // Log the action based on user type
    await createContextualLog(
      req,
      AuditActionType.CANDIDATE_VIEW, // For voters
      AdminAction.CANDIDATE_DETAIL_VIEW, // For admins
      ResourceType.CANDIDATE,
      id,
      {
        candidateName: candidate.fullName,
        electionId: candidate.electionId,
        success: true,
      },
    );

    res.status(200).json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    // Log failure based on user type
    await createContextualLog(
      req,
      AuditActionType.CANDIDATE_VIEW, // For voters
      AdminAction.CANDIDATE_DETAIL_VIEW, // For admins
      ResourceType.CANDIDATE,
      id,
      {
        success: false,
        error: (error as Error).message,
      },
    ).catch(logErr => logger.error('Failed to log candidate view error', logErr));
    next(error);
  }
};

/**
 * Create multiple candidates (admin only)
 * @route POST /api/v1/elections/:electionId/candidates
 * @access Private (Admin)
 */
export const createCandidates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const { candidates } = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (!candidates || !Array.isArray(candidates) || candidates.length < 2) {
      throw new ApiError(400, 'At least 2 candidates must be provided', 'INSUFFICIENT_CANDIDATES');
    }

    // Validate each candidate has required fields
    for (const candidate of candidates) {
      if (!candidate.fullName || !candidate.partyCode || !candidate.partyName) {
        throw new ApiError(
          400,
          'Missing required fields: fullName, partyCode, partyName for one or more candidates',
          'MISSING_REQUIRED_FIELDS',
        );
      }
    }

    // Create candidates
    const createdCandidates = await candidateService.createMultipleCandidates(
      electionId,
      candidates,
    );

    // Log the action (admin-only route - use admin logs)
    await createAdminLog(req, AdminAction.CANDIDATE_CREATE, ResourceType.CANDIDATE, null, {
      electionId,
      candidateCount: createdCandidates.length,
      candidateNames: createdCandidates.map((c: Candidate) => c.fullName),
      success: true,
    });

    res.status(201).json({
      success: true,
      message: `${createdCandidates.length} candidates created successfully`,
      data: {
        candidates: createdCandidates,
        count: createdCandidates.length,
      },
    });
  } catch (error) {
    // Log error (admin-only route - use admin logs)
    await createAdminLog(req, AdminAction.CANDIDATE_CREATE, ResourceType.CANDIDATE, null, {
      electionId,
      candidateCount: candidates?.length || 0,
      success: false,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log candidate creation error', logErr));
    next(error);
  }
};

/**
 * Update a candidate (admin only)
 * @route PUT /api/v1/candidates/:id
 * @access Private (Admin)
 */
export const updateCandidate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    // Update candidate
    const candidate = await candidateService.updateCandidate(id, updates);

    // Log the action (admin-only route - use admin logs)
    await createAdminLog(req, AdminAction.CANDIDATE_UPDATE, ResourceType.CANDIDATE, id, {
      updatedFields: Object.keys(updates),
      success: true,
    });

    res.status(200).json({
      success: true,
      message: 'Candidate updated successfully',
      data: candidate,
    });
  } catch (error) {
    // Log error (admin-only route - use admin logs)
    await createAdminLog(req, AdminAction.CANDIDATE_UPDATE, ResourceType.CANDIDATE, id, {
      updatedFields: Object.keys(updates),
      success: false,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log candidate update error', logErr));
    next(error);
  }
};

/**
 * Delete a candidate (admin only)
 * @route DELETE /api/v1/candidates/:id
 * @access Private (Admin)
 */
export const deleteCandidate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    // Delete candidate
    await candidateService.deleteCandidate(id);

    // Log the action (admin-only route - use admin logs)
    await createAdminLog(req, AdminAction.CANDIDATE_DELETE, ResourceType.CANDIDATE, id, {
      success: true,
    });

    res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully',
    });
  } catch (error) {
    // Log error (admin-only route - use admin logs)
    await createAdminLog(req, AdminAction.CANDIDATE_DELETE, ResourceType.CANDIDATE, id, {
      success: false,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log candidate deletion error', logErr));
    next(error);
  }
};
