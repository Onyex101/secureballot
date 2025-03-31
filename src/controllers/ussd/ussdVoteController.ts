import { Request, Response, NextFunction } from 'express';
import * as ussdService from '../../services/ussdService';
import * as auditService from '../../services/auditService';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';

/**
 * Cast a vote via USSD
 * @route POST /api/v1/ussd/vote (Example route)
 * @access Public (requires valid sessionCode)
 */
export const castVote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { sessionCode, electionId, candidateId } = req.body;
  const context = { sessionCode, electionId };

  try {
    if (!sessionCode || !electionId || !candidateId) {
      throw new ApiError(
        400,
        'sessionCode, electionId, and candidateId are required',
        'MISSING_VOTE_PARAMS',
      );
    }
    // Cast the vote
    const result = await ussdService.castVote(sessionCode, electionId, candidateId);

    // Log the action
    await auditService.createAuditLog(
      'unknown',
      AuditActionType.VOTE_CAST,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        channel: 'ussd',
        sessionCode,
        electionId,
        confirmationCode: result.confirmationCode,
      },
    );

    res.status(200).json({
      success: true,
      message: 'Vote cast successfully via USSD',
      data: {
        confirmationCode: result.confirmationCode,
      },
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        'unknown',
        AuditActionType.VOTE_CAST,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          channel: 'ussd',
          ...context,
          candidateId,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log USSD vote cast error', logErr));
    next(error);
  }
};

/**
 * Verify a vote using receipt code (originating from USSD)
 * @route POST /api/v1/ussd/verify-vote (Example route)
 * @access Public
 */
export const verifyVote = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { receiptCode, phoneNumber } = req.body;
  const context = { receiptCode, phoneNumber };

  try {
    if (!receiptCode || !phoneNumber) {
      throw new ApiError(400, 'receiptCode and phoneNumber are required', 'MISSING_VERIFY_PARAMS');
    }
    // Verify the vote using the specific USSD service verification
    const result = await ussdService.verifyVote(receiptCode, phoneNumber);

    // Log the action
    await auditService.createAuditLog(
      'unknown',
      AuditActionType.VOTE_VERIFY,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: result.isProcessed,
        channel: 'ussd',
        ...context,
        verifiedData: result,
      },
    );

    if (!result.isProcessed) {
      res.status(200).json({
        success: false,
        message: 'Vote found but not yet processed or verification failed.',
        data: { isVerified: false },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'USSD Vote verified successfully',
      data: {
        isVerified: result.isProcessed,
        electionName: result.electionName,
        candidateName: result.candidateName,
        voteTimestamp: result.voteTimestamp,
        processedAt: result.processedAt,
      },
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        'unknown',
        AuditActionType.VOTE_VERIFY,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          channel: 'ussd',
          ...context,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log USSD vote verification error', logErr));
    next(error);
  }
};
