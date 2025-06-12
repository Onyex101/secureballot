import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';
import { createAdminLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';
import { electionService } from '../../services';
import { ElectionStatus } from '../../db/models/Election';
import { logger } from '../../config/logger';

/**
 * Verify election results
 * @route POST /api/v1/admin/elections/:electionId/verify-results
 * @access Private (Admin only)
 */
export const verifyElectionResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { electionId } = req.params;
    const { verificationNotes } = req.body;

    if (!adminId) {
      throw new ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!electionId) {
      throw new ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
    }

    // TODO: Implement result verification logic
    // This would involve:
    // 1. Checking vote counts
    // 2. Verifying vote integrity
    // 3. Cross-referencing with physical records
    // 4. Updating election status

    // Log the action using admin logs
    await createAdminLog(req, AdminAction.RESULTS_VERIFY, ResourceType.ELECTION, electionId, {
      verificationNotes,
      success: true,
    });

    res.status(200).json({
      success: true,
      message: 'Election results verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get verification history for an election
 * @route GET /api/v1/admin/elections/:electionId/verification-history
 * @access Private (Admin only)
 */
export const getVerificationHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { electionId } = req.params;

    if (!adminId) {
      throw new ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!electionId) {
      throw new ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
    }

    // TODO: Implement verification history retrieval
    // This would involve:
    // 1. Fetching all audit logs related to result verification
    // 2. Including admin details and timestamps
    // 3. Including verification notes and status

    // Log the action using admin logs
    await createAdminLog(req, AdminAction.RESULTS_VIEW, ResourceType.ELECTION, electionId, {
      action: 'verification_history_view',
      success: true,
    });

    res.status(200).json({
      success: true,
      data: [], // Replace with actual verification history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify and publish election results
 * @route POST /api/v1/admin/elections/:electionId/verify-and-publish
 * @access Private (Admin only)
 */
export const verifyAndPublishResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { electionId } = req.params;
    const { publishLevel, verificationNotes } = req.body;

    if (!adminId) {
      throw new ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!electionId) {
      throw new ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
    }

    // Get the election to check its current status
    const election = await electionService.getElectionById(electionId);
    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // Verify that the election is in a state that can be closed
    if (election.status === ElectionStatus.COMPLETED) {
      throw new ApiError(400, 'Election is already completed', 'ELECTION_ALREADY_COMPLETED');
    }

    if (election.status === ElectionStatus.CANCELLED) {
      throw new ApiError(
        400,
        'Cannot verify results for a cancelled election',
        'ELECTION_CANCELLED',
      );
    }

    // TODO: Implement result verification and publishing logic
    // This would involve:
    // 1. Verifying vote counts
    // 2. Checking vote integrity
    // 3. Publishing results at specified level

    // Publish results if publishLevel is specified
    if (publishLevel) {
      await electionService.publishElectionResults(electionId, publishLevel);
    }

    // Close the election by updating its status to COMPLETED and mark results as published
    await electionService.updateElectionStatus(electionId, ElectionStatus.COMPLETED);

    // Update the election to mark results as published
    await election.update({
      resultsPublished: true,
      resultsPublishedAt: new Date(),
    });

    // Log the action using admin logs
    await createAdminLog(req, AdminAction.RESULTS_PUBLISH, ResourceType.ELECTION, electionId, {
      publishLevel,
      verificationNotes,
      previousStatus: election.status,
      newStatus: ElectionStatus.COMPLETED,
      success: true,
    });

    res.status(200).json({
      success: true,
      message: 'Election results verified, published, and election closed successfully',
      data: {
        electionId,
        previousStatus: election.status,
        newStatus: ElectionStatus.COMPLETED,
        publishLevel,
      },
    });
  } catch (error) {
    // Log error if we have the electionId
    if (req.params.electionId) {
      await createAdminLog(
        req,
        AdminAction.RESULTS_PUBLISH,
        ResourceType.ELECTION,
        req.params.electionId,
        {
          publishLevel: req.body.publishLevel,
          verificationNotes: req.body.verificationNotes,
          success: false,
          error: (error as Error).message,
        },
      ).catch(logErr => logger.error('Failed to log error:', logErr));
    }
    next(error);
  }
};

export const publishResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { electionId } = req.body;
    if (!electionId) {
      throw new ApiError(400, 'Election ID is required');
    }

    // TODO: Implement result publishing logic
    await createAdminLog(req, AdminAction.RESULTS_PUBLISH, ResourceType.ELECTION, electionId, {
      success: true,
    });

    res.status(200).json({ success: true, message: 'Results published successfully' });
  } catch (error) {
    next(error);
  }
};

export const rejectResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { electionId, reason } = req.body;
    if (!electionId || !reason) {
      throw new ApiError(400, 'Election ID and reason are required');
    }

    // TODO: Implement result rejection logic
    await createAdminLog(req, AdminAction.RESULTS_VERIFY, ResourceType.ELECTION, electionId, {
      reason,
      action: 'reject',
      success: true,
    });

    res.status(200).json({ success: true, message: 'Results rejected successfully' });
  } catch (error) {
    next(error);
  }
};
