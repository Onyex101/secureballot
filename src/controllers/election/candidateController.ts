import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { candidateService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

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
  try {
    const { electionId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    try {
      // Get candidates
      const result = await candidateService.getCandidates(
        electionId,
        search as string,
        Number(page),
        Number(limit),
      );

      // Log the action
      await auditService.createAuditLog(
        (req.user?.id as string) || 'anonymous',
        'candidate_list_view',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          query: req.query,
        },
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to get candidates');
      apiError.statusCode = 400;
      apiError.code = 'CANDIDATES_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
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
  try {
    const { id } = req.params;

    try {
      // Get candidate
      const candidate = await candidateService.getCandidateById(id);

      // Log the action
      await auditService.createAuditLog(
        (req.user?.id as string) || 'anonymous',
        'candidate_view',
        req.ip || '',
        req.headers['user-agent'] || '',
        { candidateId: id },
      );

      res.status(200).json({
        success: true,
        data: candidate,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Candidate not found');
      apiError.statusCode = 404;
      apiError.code = 'CANDIDATE_NOT_FOUND';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
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
  try {
    const { electionId } = req.params;
    const { fullName, partyAffiliation, position, biography, photoUrl } = req.body;

    if (!fullName || !partyAffiliation || !position) {
      const error: ApiError = new Error('Missing required fields');
      error.statusCode = 400;
      error.code = 'MISSING_REQUIRED_FIELDS';
      error.isOperational = true;
      throw error;
    }

    try {
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
        req.user?.id as string,
        'candidate_creation',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          candidateId: candidate.id,
          candidateName: candidate.fullName,
        },
      );

      res.status(201).json({
        success: true,
        message: 'Candidate created successfully',
        data: candidate,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to create candidate');
      apiError.statusCode = 400;
      apiError.code = 'CANDIDATE_CREATION_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
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
  try {
    const { id } = req.params;
    const { fullName, partyAffiliation, position, biography, photoUrl } = req.body;

    try {
      // Update candidate
      const candidate = await candidateService.updateCandidate(id, {
        fullName,
        partyAffiliation,
        position,
        biography,
        photoUrl,
      });

      // Log the action
      await auditService.createAuditLog(
        req.user?.id as string,
        'candidate_update',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          candidateId: id,
          updatedFields: Object.keys(req.body),
        },
      );

      res.status(200).json({
        success: true,
        message: 'Candidate updated successfully',
        data: candidate,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to update candidate');
      apiError.statusCode = 400;
      apiError.code = 'CANDIDATE_UPDATE_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
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
  try {
    const { id } = req.params;

    try {
      // Delete candidate
      await candidateService.deleteCandidate(id);

      // Log the action
      await auditService.createAuditLog(
        req.user?.id as string,
        'candidate_deletion',
        req.ip || '',
        req.headers['user-agent'] || '',
        { candidateId: id },
      );

      res.status(200).json({
        success: true,
        message: 'Candidate deleted successfully',
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to delete candidate');
      apiError.statusCode = 400;
      apiError.code = 'CANDIDATE_DELETION_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
