import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import crypto from 'crypto';
import db from '../../db/models';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { VoteSource } from '../../db/models/Vote';
import { sequelize } from '../../server';
import { voteService, auditService, voterService, electionService } from '../../services';
import { getSafeUserIdForAudit } from '../../utils/auditHelpers';
import { logger } from '../../config/logger';

/**
 * Cast a vote in an election
 * @route POST /api/v1/elections/:electionId/vote
 * @access Private
 */
export const castVote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const { candidateId } = req.body;
  const userId = req.user?.id;
  let voteResult: { id: string; voteHash: string; receiptCode: string; timestamp: Date } | null =
    null;
  let electionName: string | undefined;

  const transaction = await sequelize.transaction();

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    if (!candidateId) {
      throw new ApiError(400, 'Candidate ID is required', 'MISSING_CANDIDATE_ID');
    }

    const pollingUnit = await voterService.getVoterPollingUnit(userId);
    if (!pollingUnit || !pollingUnit.id) {
      throw new ApiError(
        404,
        'Polling unit not assigned or found for voter',
        'POLLING_UNIT_NOT_FOUND',
      );
    }

    const election = await electionService.getElectionById(electionId);
    electionName = election?.electionName;

    voteResult = await voteService.castVote(
      userId,
      electionId,
      candidateId,
      pollingUnit.id,
      VoteSource.WEB,
    );

    await auditService.createAuditLog(
      userId,
      AuditActionType.VOTE_CAST,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        electionId,
        electionName: electionName || 'Unknown',
        candidateId,
        pollingUnitId: pollingUnit.id,
        voteSource: VoteSource.WEB,
        voteHash: voteResult.voteHash?.substring(0, 10) + '...',
        receiptCode: voteResult.receiptCode,
      },
    );

    await transaction.commit();

    res.status(201).json({
      code: 'VOTE_CAST_SUCCESS',
      message: 'Vote cast successfully',
      data: {
        voteId: voteResult.id,
        timestamp: voteResult.timestamp,
        electionName: electionName || 'Unknown',
        receiptCode: voteResult.receiptCode,
        verificationUrl: `/api/v1/votes/verify/${voteResult.receiptCode}`,
      },
    });
  } catch (error: any) {
    await transaction.rollback();

    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(userId),
        AuditActionType.VOTE_CAST,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          electionId,
          electionName: electionName || 'Unknown',
          candidateId,
          voteSource: VoteSource.WEB,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log vote cast error', logErr));

    next(error);
  }
};

/**
 * Verify a vote using receipt code
 * @route GET /api/v1/votes/verify/:receiptCode
 * @access Public (or Private? Depends on requirements)
 */
export const verifyVote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { receiptCode } = req.params;
  const userId = req.user?.id;

  try {
    const result = await voteService.verifyVote(receiptCode);

    await auditService.createAuditLog(
      getSafeUserIdForAudit(userId), // Use null for anonymous verifiers
      AuditActionType.VOTE_VERIFY,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        receiptCode,
        success: result.isValid,
        ...(result.isValid ? { voteTimestamp: result.timestamp } : { error: result.message }),
      },
    );

    if (!result.isValid) {
      throw new ApiError(
        404,
        result.message || 'Vote verification failed',
        'VOTE_VERIFICATION_FAILED',
      );
    }

    res.status(200).json({
      code: 'VOTE_VERIFIED',
      message: 'Vote verified successfully',
      data: result,
    });
  } catch (error) {
    if (!(error instanceof ApiError && error.code === 'VOTE_VERIFICATION_FAILED')) {
      await auditService
        .createAuditLog(
          getSafeUserIdForAudit(userId), // Use null for anonymous verifiers
          AuditActionType.VOTE_VERIFY,
          req.ip || '',
          req.headers['user-agent'] || '',
          { receiptCode, success: false, error: (error as Error).message },
        )
        .catch(logErr => logger.error('Failed to log vote verification error', logErr));
    }
    next(error);
  }
};

/**
 * Get vote history for the authenticated voter
 * @route GET /api/v1/voter/vote-history
 * @access Private
 */
export const getVoteHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const history = await voteService.getVoteHistory(userId);

    await auditService.createAuditLog(
      userId,
      AuditActionType.VOTE_HISTORY_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { success: true, recordCount: history.length },
    );

    res.status(200).json({
      code: 'VOTE_HISTORY_RETRIEVED',
      message: 'Vote history retrieved successfully',
      data: history,
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(userId),
        AuditActionType.VOTE_HISTORY_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log vote history view error', logErr));
    next(error);
  }
};

/**
 * Report an issue with a vote
 * @route POST /api/v1/votes/report-issue
 * @access Private
 */
export const reportVoteIssue = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { voteId, electionId, issueDescription, contactInfo } = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    if (!voteId && !electionId) {
      throw new ApiError(
        400,
        'Either voteId or electionId must be provided',
        'MISSING_ISSUE_CONTEXT',
      );
    }
    if (!issueDescription) {
      throw new ApiError(400, 'Issue description is required', 'MISSING_ISSUE_DESCRIPTION');
    }

    logger.info('Received vote issue report:', {
      userId,
      voteId,
      electionId,
      issueDescription,
      contactInfo,
    });
    const reportId = crypto.randomUUID();

    await auditService.createAuditLog(
      userId,
      AuditActionType.VOTE_ISSUE_REPORT,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        voteId: voteId || null,
        electionId: electionId || null,
        reportId,
        issueLength: issueDescription.length,
      },
    );

    res.status(200).json({
      code: 'VOTE_ISSUE_REPORTED',
      message: 'Issue reported successfully. Thank you for your feedback.',
      data: { reportId },
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(userId),
        AuditActionType.VOTE_ISSUE_REPORT,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          voteId: voteId || null,
          electionId: electionId || null,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log vote issue report error', logErr));
    next(error);
  }
};

/**
 * Check voting status for a specific election
 * @route GET /api/v1/elections/:electionId/voting-status
 * @access Private
 */
export const checkVotingStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { electionId } = req.params;
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const eligibility = await voterService.checkVoterEligibility(userId, electionId);

    const existingVote = await db.Vote.findOne({ where: { userId, electionId } });
    const hasVoted = !!existingVote;

    await auditService.createAuditLog(
      userId,
      AuditActionType.VOTE_STATUS_CHECK,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        electionId,
        success: true,
        isEligible: eligibility.isEligible,
        hasVoted,
      },
    );

    res.status(200).json({
      code: 'VOTING_STATUS_CHECKED',
      message: 'Voting status retrieved successfully',
      data: {
        electionId,
        userId,
        isEligible: eligibility.isEligible,
        eligibilityReason: eligibility.reason,
        hasVoted,
      },
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        getSafeUserIdForAudit(userId),
        AuditActionType.VOTE_STATUS_CHECK,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log voting status check error', logErr));
    next(error);
  }
};
