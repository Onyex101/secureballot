import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { voterService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { createContextualLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';
import { logger } from '../../config/logger';

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
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Get voter profile
    const voter = await voterService.getVoterProfile(userId);

    // Log the profile view using contextual logging
    await createContextualLog(
      req,
      AuditActionType.PROFILE_UPDATE, // For voters
      AdminAction.ADMIN_USER_DETAIL_VIEW, // For admins (closest available)
      ResourceType.VOTER,
      userId,
      { success: true, action: 'view_profile' },
    );

    res.status(200).json({
      success: true,
      data: voter,
    });
  } catch (error) {
    // Log failure using contextual logging
    await createContextualLog(
      req,
      AuditActionType.PROFILE_UPDATE, // For voters
      AdminAction.ADMIN_USER_DETAIL_VIEW, // For admins
      ResourceType.VOTER,
      userId,
      { success: false, action: 'view_profile', error: (error as Error).message },
    ).catch(logErr => logger.error('Failed to log profile view error', logErr));
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
  const userId = req.user?.id;
  const { phoneNumber, dateOfBirth } = req.body;
  const updatedFields = { phoneNumber, dateOfBirth }; // For logging

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Minimal validation, consider more robust validation middleware
    const updates: { phoneNumber?: string; dateOfBirth?: Date } = {};
    if (phoneNumber) updates.phoneNumber = phoneNumber;
    if (dateOfBirth) updates.dateOfBirth = new Date(dateOfBirth);

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'No valid fields provided for update', 'NO_UPDATE_FIELDS');
    }

    // Update voter profile
    const updatedVoter = await voterService.updateVoterProfile(userId, updates);

    // Log the profile update using contextual logging
    await createContextualLog(
      req,
      AuditActionType.PROFILE_UPDATE, // For voters
      AdminAction.ADMIN_USER_UPDATE, // For admins
      ResourceType.VOTER,
      userId,
      {
        success: true,
        updatedFields: Object.keys(updates),
      },
    );

    // Return only relevant parts of profile, not full model object potentially
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        // Return a subset of data
        id: updatedVoter.id,
        phoneNumber: updatedVoter.phoneNumber,
        dateOfBirth: updatedVoter.dateOfBirth,
      },
    });
  } catch (error) {
    // Log failure using contextual logging
    await createContextualLog(
      req,
      AuditActionType.PROFILE_UPDATE, // For voters
      AdminAction.ADMIN_USER_UPDATE, // For admins
      ResourceType.VOTER,
      userId,
      {
        success: false,
        updatedFields: Object.keys(updatedFields),
        error: (error as Error).message,
      },
    ).catch(logErr => logger.error('Failed to log profile update error', logErr));
    next(error);
  }
};

/**
 * Get voter's assigned polling unit
 * @route GET /api/v1/voter/polling-unit
 * @access Private
 */
export const getPollingUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Get voter's polling unit
    const pollingUnit = await voterService.getVoterPollingUnit(userId);

    // Log the polling unit view using contextual logging
    await createContextualLog(
      req,
      AuditActionType.USER_ASSIGNED_PU_VIEW, // For voters
      AdminAction.POLLING_UNIT_LIST_VIEW, // For admins
      ResourceType.POLLING_UNIT,
      pollingUnit.id,
      { success: true },
    );

    res.status(200).json({
      success: true,
      data: pollingUnit,
    });
  } catch (error) {
    // Log failure using contextual logging
    await createContextualLog(
      req,
      AuditActionType.USER_ASSIGNED_PU_VIEW, // For voters
      AdminAction.POLLING_UNIT_LIST_VIEW, // For admins
      ResourceType.POLLING_UNIT,
      null,
      { success: false, error: (error as Error).message },
    ).catch(logErr => logger.error('Failed to log assigned PU view error', logErr));
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
  const userId = req.user?.id;
  const { electionId } = req.params;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    if (!electionId) {
      throw new ApiError(400, 'electionId parameter is required', 'MISSING_ELECTION_ID');
    }

    // Check voter eligibility
    const eligibility = await voterService.checkVoterEligibility(userId, electionId);

    // Log the eligibility check using contextual logging
    await createContextualLog(
      req,
      AuditActionType.VOTER_ELIGIBILITY_CHECK, // For voters
      AdminAction.ELECTION_DETAIL_VIEW, // For admins (viewing election details)
      ResourceType.ELECTION,
      electionId,
      {
        success: true,
        isEligible: eligibility.isEligible,
        reason: eligibility.reason,
      },
    );

    res.status(200).json({
      success: true,
      data: eligibility,
    });
  } catch (error) {
    // Log failure using contextual logging
    await createContextualLog(
      req,
      AuditActionType.VOTER_ELIGIBILITY_CHECK, // For voters
      AdminAction.ELECTION_DETAIL_VIEW, // For admins
      ResourceType.ELECTION,
      electionId,
      { success: false, error: (error as Error).message },
    ).catch(logErr => logger.error('Failed to log eligibility check error', logErr));
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
  const userId = req.user?.id;
  const { documentType, documentNumber, documentImageUrl } = req.body;
  const context = { documentType, documentNumber }; // For logging

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    if (!documentType || !documentNumber || !documentImageUrl) {
      throw new ApiError(
        400,
        'documentType, documentNumber, and documentImageUrl are required',
        'MISSING_VERIFICATION_DATA',
      );
    }

    // Request verification - NOTE: Service might throw 'Not Implemented'
    const verificationStatus = await voterService.requestVerification(userId);

    // Log the verification request using contextual logging
    await createContextualLog(
      req,
      AuditActionType.VOTER_VERIFICATION_REQUEST,
      AdminAction.VOTER_VERIFICATION_APPROVE, // For admins (closest available)
      ResourceType.VOTER,
      userId,
      { success: true, ...context, status: verificationStatus?.verificationLevel || 'submitted' },
    );

    res.status(200).json({
      success: true,
      message: 'Verification status retrieved successfully',
      data: verificationStatus,
    });
  } catch (error) {
    // Log failure using contextual logging
    await createContextualLog(
      req,
      AuditActionType.VOTER_VERIFICATION_REQUEST,
      AdminAction.VOTER_VERIFICATION_APPROVE, // For admins (closest available)
      ResourceType.VOTER,
      userId,
      { success: false, ...context, error: (error as Error).message },
    ).catch(logErr => logger.error('Failed to log verification request error', logErr));
    next(error);
  }
};

/**
 * Change voter password
 * @route POST /api/v1/voter/change-password
 * @access Private
 */
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'Current password and new password are required', 'MISSING_FIELDS');
    }

    // Change password
    await voterService.changePassword(userId, currentPassword, newPassword);

    // Log the action using contextual logging
    await createContextualLog(
      req,
      AuditActionType.PASSWORD_CHANGE,
      AdminAction.ADMIN_USER_UPDATE, // For admins (closest available action)
      ResourceType.VOTER,
      userId,
      { success: true },
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    // Log failure using contextual logging
    await createContextualLog(
      req,
      AuditActionType.PASSWORD_CHANGE,
      AdminAction.ADMIN_USER_UPDATE, // For admins (closest available action)
      ResourceType.VOTER,
      userId,
      { success: false, error: (error as Error).message },
    ).catch(logErr => logger.error('Failed to log password change error', logErr));
    next(error);
  }
};
