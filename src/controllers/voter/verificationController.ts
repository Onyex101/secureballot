import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { verificationService } from '../../services';
import { createAdminLog, createContextualLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';

/**
 * Get verification status
 * @route GET /api/v1/voter/verification-status
 * @access Private
 */
export const getVerificationStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    try {
      // Get verification status
      const verificationStatus = await verificationService.getVerificationStatus(userId);

      // Log the action using contextual logging (checks user type)
      await createContextualLog(
        req,
        'verification_status_check', // For voters
        AdminAction.VOTER_VERIFICATION_APPROVE, // For admins (closest available action)
        ResourceType.VERIFICATION_REQUEST,
        null,
        { action: 'status_check', success: true },
      );

      res.status(200).json({
        success: true,
        data: verificationStatus,
      });
    } catch (error) {
      throw new ApiError(404, 'Verification status not found', 'VERIFICATION_STATUS_NOT_FOUND');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Submit verification request
 * @route POST /api/v1/voter/submit-verification
 * @access Private
 */
export const submitVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    const { documentType, documentNumber, documentImageUrl } = req.body;

    if (!documentType || !documentNumber || !documentImageUrl) {
      throw new ApiError(400, 'Missing required fields', 'MISSING_REQUIRED_FIELDS');
    }

    try {
      // Submit verification request
      const result = await verificationService.submitVerificationRequest(
        userId,
        documentType,
        documentNumber,
        documentImageUrl,
      );

      // Log the action using contextual logging (checks user type)
      await createContextualLog(
        req,
        AuditActionType.VERIFICATION, // For voters
        AdminAction.VOTER_VERIFICATION_APPROVE, // For admins (closest available action)
        ResourceType.VERIFICATION_REQUEST,
        result.id,
        {
          documentType,
          verificationId: result.id,
          action: 'submit',
          success: true,
        },
      );

      res.status(200).json({
        success: true,
        message: 'Verification request submitted successfully',
        data: result,
      });
    } catch (error) {
      throw new ApiError(
        400,
        'Failed to submit verification request',
        'VERIFICATION_REQUEST_FAILED',
      );
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending verification requests (admin only)
 * @route GET /api/v1/admin/pending-verifications
 * @access Private (Admin)
 */
export const getPendingVerifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Get pending verifications
    const result = await verificationService.getPendingVerifications(Number(page), Number(limit));

    // Log the action (admin route - use admin logs)
    await createAdminLog(
      req,
      AdminAction.VOTER_VERIFICATION_APPROVE, // Using closest available action
      ResourceType.VERIFICATION_REQUEST,
      null,
      { query: req.query, action: 'pending_verifications_view' },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve verification request (admin only)
 * @route POST /api/v1/admin/approve-verification/:id
 * @access Private (Admin)
 */
export const approveVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      throw new ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    try {
      // Approve verification
      const result = await verificationService.approveVerification(id, adminId, notes);

      // Log the action (admin route - use admin logs)
      await createAdminLog(
        req,
        AdminAction.VOTER_VERIFICATION_APPROVE,
        ResourceType.VERIFICATION_REQUEST,
        id,
        {
          verificationId: id,
          notes,
          success: true,
        },
      );

      res.status(200).json({
        success: true,
        message: 'Verification request approved',
        data: result,
      });
    } catch (error) {
      throw new ApiError(
        400,
        'Failed to approve verification request',
        'VERIFICATION_APPROVAL_FAILED',
      );
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Reject verification request (admin only)
 * @route POST /api/v1/admin/reject-verification/:id
 * @access Private (Admin)
 */
export const rejectVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      throw new ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!reason) {
      throw new ApiError(400, 'Rejection reason is required', 'MISSING_REJECTION_REASON');
    }

    try {
      // Reject verification
      const result = await verificationService.rejectVerification(id, adminId, reason);

      // Log the action (admin route - use admin logs)
      await createAdminLog(
        req,
        AdminAction.VOTER_VERIFICATION_REJECT,
        ResourceType.VERIFICATION_REQUEST,
        id,
        {
          verificationId: id,
          reason,
          success: true,
        },
      );

      res.status(200).json({
        success: true,
        message: 'Verification request rejected',
        data: result,
      });
    } catch (error) {
      throw new ApiError(
        400,
        'Failed to reject verification request',
        'VERIFICATION_REJECTION_FAILED',
      );
    }
  } catch (error) {
    next(error);
  }
};
