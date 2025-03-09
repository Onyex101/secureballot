import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import db from '../../db/models';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { logger } from '../../config/logger';

/**
 * Get voter profile
 * @route GET /api/v1/voter/profile
 * @access Private
 */
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    // Find voter with related data
    const voter = await db.Voter.findByPk(userId, {
      attributes: { exclude: ['passwordHash', 'recoveryToken', 'recoveryTokenExpiry'] },
      include: [
        {
          model: db.VoterCard,
          as: 'voterCard',
          include: [
            {
              model: db.PollingUnit,
              as: 'pollingUnit',
            },
          ],
        },
        {
          model: db.VerificationStatus,
          as: 'verificationStatus',
        },
      ],
    });

    if (!voter) {
      const error: ApiError = new Error('Voter not found');
      error.statusCode = 404;
      error.code = 'VOTER_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    // Log profile view
    await db.AuditLog.create({
      userId,
      actionType: AuditActionType.PROFILE_UPDATE,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      actionDetails: { action: 'view_profile' },
    });

    res.status(200).json({
      code: 'PROFILE_RETRIEVED',
      message: 'Voter profile retrieved successfully',
      data: voter,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update voter profile
 * @route PUT /api/v1/voter/profile
 * @access Private
 */
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    // Only allow updating limited fields
    const { phoneNumber } = req.body;

    // Find voter
    const voter = await db.Voter.findByPk(userId);

    if (!voter) {
      const error: ApiError = new Error('Voter not found');
      error.statusCode = 404;
      error.code = 'VOTER_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    // Update fields
    if (phoneNumber) {
      voter.phoneNumber = phoneNumber;
    }

    // Save changes
    await voter.save();

    // Log profile update
    await db.AuditLog.create({
      userId,
      actionType: AuditActionType.PROFILE_UPDATE,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      actionDetails: { 
        action: 'update_profile',
        updatedFields: Object.keys(req.body),
      },
    });

    res.status(200).json({
      code: 'PROFILE_UPDATED',
      message: 'Voter profile updated successfully',
      data: {
        id: voter.id,
        phoneNumber: voter.phoneNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * @route PUT /api/v1/voter/change-password
 * @access Private
 */
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    const { currentPassword, newPassword } = req.body;

    // Find voter
    const voter = await db.Voter.findByPk(userId);

    if (!voter) {
      const error: ApiError = new Error('Voter not found');
      error.statusCode = 404;
      error.code = 'VOTER_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    // Verify current password
    const isPasswordValid = await voter.validatePassword(currentPassword);
    if (!isPasswordValid) {
      const error: ApiError = new Error('Current password is incorrect');
      error.statusCode = 400;
      error.code = 'INVALID_CURRENT_PASSWORD';
      error.isOperational = true;
      throw error;
    }

    // Update password
    await voter.updatePassword(newPassword);

    // Log password change
    await db.AuditLog.create({
      userId,
      actionType: AuditActionType.PASSWORD_RESET,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      actionDetails: { action: 'change_password' },
    });

    res.status(200).json({
      code: 'PASSWORD_CHANGED',
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get voter polling unit
 * @route GET /api/v1/voter/polling-unit
 * @access Private
 */
export const getPollingUnit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    // Find voter's polling unit
    const voterCard = await db.VoterCard.findOne({
      where: { userId },
      include: [
        {
          model: db.PollingUnit,
          as: 'pollingUnit',
          attributes: [
            'id', 'pollingUnitCode', 'pollingUnitName',
            'state', 'lga', 'ward', 'address', 'geolocation'
          ],
        },
      ],
    });

    if (!voterCard || !voterCard.pollingUnit) {
      const error: ApiError = new Error('Polling unit not found for this voter');
      error.statusCode = 404;
      error.code = 'POLLING_UNIT_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    res.status(200).json({
      code: 'POLLING_UNIT_RETRIEVED',
      message: 'Voter polling unit retrieved successfully',
      data: voterCard.pollingUnit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get voter verification status
 * @route GET /api/v1/voter/verification-status
 * @access Private
 */
export const getVerificationStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    // Find verification status
    const verification = await db.VerificationStatus.findOne({
      where: { userId },
      attributes: ['isVerified', 'verifiedAt', 'verificationMethod', 'state'],
    });

    if (!verification) {
      const error: ApiError = new Error('Verification status not found');
      error.statusCode = 404;
      error.code = 'VERIFICATION_STATUS_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    res.status(200).json({
      code: 'VERIFICATION_STATUS_RETRIEVED',
      message: 'Voter verification status retrieved successfully',
      data: verification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check voter eligibility for an election
 * @route GET /api/v1/voter/eligibility/:electionId
 * @access Private
 */
export const checkEligibility = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    // Get verification status
    const verification = await db.VerificationStatus.findOne({
      where: { userId },
    });

    if (!verification || !verification.isVerified) {
      res.status(200).json({
        code: 'ELIGIBILITY_CHECKED',
        message: 'Voter eligibility checked',
        data: {
          isEligible: false,
          reason: 'VOTER_NOT_VERIFIED',
          message: 'Voter is not verified',
        },
      });
      return;
    }

    // Get the election
    const election = await db.Election.findByPk(electionId);

    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'ELECTION_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }

    // Check if election is active
    if (!election.isActive) {
      res.status(200).json({
        code: 'ELIGIBILITY_CHECKED',
        message: 'Voter eligibility checked',
        data: {
          isEligible: false,
          reason: 'ELECTION_NOT_ACTIVE',
          message: 'Election is not active',
        },
      });
      return;
    }

    // Check if election has started and not ended
    const now = new Date();
    if (now < election.startDate) {
      res.status(200).json({
        code: 'ELIGIBILITY_CHECKED',
        message: 'Voter eligibility checked',
        data: {
          isEligible: false,
          reason: 'ELECTION_NOT_STARTED',
          message: 'Election has not started yet',
          startDate: election.startDate,
        },
      });
      return;
    }

    if (now > election.endDate) {
      res.status(200).json({
        code: 'ELIGIBILITY_CHECKED',
        message: 'Voter eligibility checked',
        data: {
          isEligible: false,
          reason: 'ELECTION_ENDED',
          message: 'Election has ended',
          endDate: election.endDate,
        },
      });
      return;
    }

    // Check if voter has already voted in this election
    const existingVote = await db.Vote.findOne({
      where: {
        userId,
        electionId,
      },
    });

    if (existingVote) {
      res.status(200).json({
        code: 'ELIGIBILITY_CHECKED',
        message: 'Voter eligibility checked',
        data: {
          isEligible: false,
          reason: 'ALREADY_VOTED',
          message: 'Voter has already cast a vote in this election',
          voteTimestamp: existingVote.voteTimestamp,
        },
      });
      return;
    }

    // Check custom eligibility rules if defined
    if (election.eligibilityRules) {
      // Implement custom eligibility rules here
      // For example, age restrictions, regional restrictions, etc.
      // This is a placeholder for custom logic
    }

    // If all checks pass, voter is eligible
    res.status(200).json({
      code: 'ELIGIBILITY_CHECKED',
      message: 'Voter eligibility checked',
      data: {
        isEligible: true,
        election: {
          id: election.id,
          name: election.electionName,
          type: election.electionType,
          startDate: election.startDate,
          endDate: election.endDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};