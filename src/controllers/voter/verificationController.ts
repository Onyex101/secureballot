import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { verificationService, auditService } from '../../services';
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
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Get verification status
      const verificationStatus = await verificationService.getVerificationStatus(userId);

      // Log the action
      await auditService.createAuditLog(
        userId,
        'verification_status_check',
        req.ip || '',
        req.headers['user-agent'] || '',
        {},
      );

      res.status(200).json({
        success: true,
        data: verificationStatus,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Verification status not found');
      apiError.statusCode = 404;
      apiError.code = 'VERIFICATION_STATUS_NOT_FOUND';
      apiError.isOperational = true;
      throw apiError;
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
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    const { documentType, documentNumber, documentImageUrl } = req.body;

    if (!documentType || !documentNumber || !documentImageUrl) {
      const error: ApiError = new Error('Missing required fields');
      error.statusCode = 400;
      error.code = 'MISSING_REQUIRED_FIELDS';
      error.isOperational = true;
      throw error;
    }

    try {
      // Submit verification request
      const result = await verificationService.submitVerificationRequest(
        userId,
        documentType,
        documentNumber,
        documentImageUrl,
      );

      // Log the action
      await auditService.createAuditLog(
        userId,
        AuditActionType.VERIFICATION,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          documentType,
          verificationId: result.id,
        },
      );

      res.status(200).json({
        success: true,
        message: 'Verification request submitted successfully',
        data: result,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to submit verification request');
      apiError.statusCode = 400;
      apiError.code = 'VERIFICATION_REQUEST_FAILED';
      apiError.isOperational = true;
      throw apiError;
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

    // Log the action
    await auditService.createAuditLog(
      req.user?.id as string,
      'pending_verifications_view',
      req.ip || '',
      req.headers['user-agent'] || '',
      { query: req.query },
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
      const error: ApiError = new Error('Admin ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Approve verification
      const result = await verificationService.approveVerification(id, adminId, notes);

      // Log the action
      await auditService.createAuditLog(
        adminId,
        'verification_approval',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          verificationId: id,
          notes,
        },
      );

      res.status(200).json({
        success: true,
        message: 'Verification request approved',
        data: result,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to approve verification request');
      apiError.statusCode = 400;
      apiError.code = 'VERIFICATION_APPROVAL_FAILED';
      apiError.isOperational = true;
      throw apiError;
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
      const error: ApiError = new Error('Admin ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    if (!reason) {
      const error: ApiError = new Error('Rejection reason is required');
      error.statusCode = 400;
      error.code = 'MISSING_REJECTION_REASON';
      error.isOperational = true;
      throw error;
    }

    try {
      // Reject verification
      const result = await verificationService.rejectVerification(id, adminId, reason);

      // Log the action
      await auditService.createAuditLog(
        adminId,
        'verification_rejection',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          verificationId: id,
          reason,
        },
      );

      res.status(200).json({
        success: true,
        message: 'Verification request rejected',
        data: result,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to reject verification request');
      apiError.statusCode = 400;
      apiError.code = 'VERIFICATION_REJECTION_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
