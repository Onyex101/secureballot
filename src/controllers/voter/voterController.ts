import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { voterService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';

/**
 * Get voter profile
 * @route GET /api/v1/voter/profile
 * @access Private
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get user ID from authenticated request
    const userId = req.user?.id;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Get voter profile
      const voter = await voterService.getVoterProfile(userId);

      // Log the profile view
      await auditService.createAuditLog(
        userId,
        AuditActionType.PROFILE_UPDATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        { action: 'view_profile' },
      );

      res.status(200).json({
        success: true,
        data: voter,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Voter not found');
      apiError.statusCode = 404;
      apiError.code = 'VOTER_NOT_FOUND';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update voter profile
 * @route PUT /api/v1/voter/profile
 * @access Private
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get user ID from authenticated request
    const userId = req.user?.id;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    const { phoneNumber, dateOfBirth } = req.body;

    try {
      // Update voter profile
      const updatedVoter = await voterService.updateVoterProfile(userId, {
        phoneNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      });

      // Log the profile update
      await auditService.createAuditLog(
        userId,
        AuditActionType.PROFILE_UPDATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          updatedFields: {
            phoneNumber: phoneNumber ? true : false,
            dateOfBirth: dateOfBirth ? true : false,
          },
        },
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedVoter,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to update profile');
      apiError.statusCode = 400;
      apiError.code = 'UPDATE_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get voter's polling unit
 * @route GET /api/v1/voter/polling-unit
 * @access Private
 */
export const getPollingUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get user ID from authenticated request
    const userId = req.user?.id;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Get voter's polling unit
      const pollingUnit = await voterService.getVoterPollingUnit(userId);

      // Log the polling unit view
      await auditService.createAuditLog(
        userId,
        'polling_unit_view',
        req.ip || '',
        req.headers['user-agent'] || '',
        { pollingUnitId: pollingUnit.id },
      );

      res.status(200).json({
        success: true,
        data: pollingUnit,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Polling unit not assigned');
      apiError.statusCode = 404;
      apiError.code = 'POLLING_UNIT_NOT_FOUND';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Check voter eligibility for an election
 * @route GET /api/v1/voter/eligibility/:electionId
 * @access Private
 */
export const checkEligibility = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get user ID from authenticated request
    const userId = req.user?.id;
    const { electionId } = req.params;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    // Check voter eligibility
    const eligibility = await voterService.checkVoterEligibility(userId, electionId);

    // Log the eligibility check
    await auditService.createAuditLog(
      userId,
      'eligibility_check',
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        electionId,
        isEligible: eligibility.isEligible,
        reason: eligibility.reason,
      },
    );

    res.status(200).json({
      success: true,
      data: eligibility,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request voter verification
 * @route POST /api/v1/voter/request-verification
 * @access Private
 */
export const requestVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get user ID from authenticated request
    const userId = req.user?.id;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    const { documentType, documentNumber, documentImageUrl } = req.body;

    try {
      // Request verification
      const verification = await voterService.requestVerification(
        userId,
        documentType,
        documentNumber,
        documentImageUrl,
      );

      // Log the verification request
      await auditService.createAuditLog(
        userId,
        AuditActionType.VERIFICATION,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          documentType,
          verificationId: verification.id,
        },
      );

      res.status(200).json({
        success: true,
        message: 'Verification request submitted successfully',
        data: verification,
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
 * Change voter password
 * @route PUT /api/v1/voter/change-password
 * @access Private
 */
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Change password
      await voterService.changePassword(userId, currentPassword, newPassword);

      // Log the action
      await auditService.createAuditLog(
        userId,
        AuditActionType.PASSWORD_CHANGE,
        req.ip || '',
        req.headers['user-agent'] || '',
        { timestamp: new Date() },
      );

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      const apiError: ApiError = new Error((error as Error).message);
      apiError.statusCode = 400;
      apiError.code = 'PASSWORD_CHANGE_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
