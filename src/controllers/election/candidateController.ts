import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { candidateService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { logger } from '../../config/logger';

/**
 * Get all candidates for an election
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
  const userId = req.user?.id || 'unknown';
  const queryParams = { search, page, limit };

  try {
    // Get candidates
    const result = await candidateService.getCandidates(
      electionId,
      search as string | undefined,
      Number(page),
      Number(limit),
    );

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.CANDIDATE_LIST_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        electionId,
        query: queryParams,
        success: true,
      },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        userId,
        AuditActionType.CANDIDATE_LIST_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
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
  const userId = req.user?.id || 'unknown';

  try {
    // Get candidate
    const candidate = await candidateService.getCandidateById(id);

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.CANDIDATE_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { candidateId: id, success: true },
    );

    res.status(200).json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        userId,
        AuditActionType.CANDIDATE_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { candidateId: id, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log candidate view error', logErr));
    next(error);
  }
};

/**
 * Create a new candidate (admin only)
 * @route POST /api/v1/elections/:electionId/candidates
 * @access Private (Admin)
 */
export const createCandidate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const { fullName, partyAffiliation, position, biography, photoUrl } = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    if (!fullName || !partyAffiliation || !position) {
      throw new ApiError(
        400,
        'Missing required fields: fullName, partyAffiliation, position',
        'MISSING_REQUIRED_FIELDS',
      );
    }

    // Create candidate
    const candidate = await candidateService.createCandidate(
      fullName,
      electionId,
      partyAffiliation,
      position,
      biography,
      photoUrl,
    );

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.CANDIDATE_CREATE,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        electionId,
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        success: true,
      },
    );

    res.status(201).json({
      success: true,
      message: 'Candidate created successfully',
      data: candidate,
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        userId || 'unknown',
        AuditActionType.CANDIDATE_CREATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          candidateName: fullName,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log candidate creation error', logErr));
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

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.CANDIDATE_UPDATE,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        candidateId: id,
        updatedFields: Object.keys(updates),
        success: true,
      },
    );

    res.status(200).json({
      success: true,
      message: 'Candidate updated successfully',
      data: candidate,
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        userId || 'unknown',
        AuditActionType.CANDIDATE_UPDATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          candidateId: id,
          updatedFields: Object.keys(updates),
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log candidate update error', logErr));
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

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.CANDIDATE_DELETE,
      req.ip || '',
      req.headers['user-agent'] || '',
      { candidateId: id, success: true },
    );

    res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully',
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        userId || 'unknown',
        AuditActionType.CANDIDATE_DELETE,
        req.ip || '',
        req.headers['user-agent'] || '',
        { candidateId: id, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log candidate deletion error', logErr));
    next(error);
  }
};
