import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { VoteSource } from '../../db/models/Vote';
import { auditService, voteService, voterService, electionService } from '../../services';
import { generateElectionKeys } from '../../services/voteEncryptionService';
import { logger } from '../../config/logger';

/**
 * Cast a vote from mobile app
 * @route POST /api/v1/mobile/vote
 * @access Private
 */
export const castVote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { electionId, candidateId } = req.body;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!electionId || !candidateId) {
      throw new ApiError(
        400,
        'Election ID and Candidate ID are required',
        'MISSING_REQUIRED_FIELDS',
      );
    }

    // Get voter's polling unit
    const pollingUnit = await voterService.getVoterPollingUnit(userId);
    if (!pollingUnit || !pollingUnit.id) {
      throw new ApiError(
        404,
        'Polling unit not assigned or found for voter',
        'POLLING_UNIT_NOT_FOUND',
      );
    }

    // Cast the vote using the same service as web voting (with encryption)
    const result = await voteService.castVote(
      userId,
      electionId,
      candidateId,
      pollingUnit.id,
      VoteSource.MOBILE,
    );

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.MOBILE_VOTE_CAST,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        electionId,
        candidateId,
        voteId: result.id,
        receiptCode: result.receiptCode,
        success: true,
      },
    );

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        voteId: result.id,
        receiptCode: result.receiptCode,
        timestamp: result.timestamp,
        verificationUrl: `/api/v1/votes/verify/${result.receiptCode}`,
      },
    });
  } catch (error) {
    // Log failed attempt
    await auditService
      .createAuditLog(
        req.user?.id || 'unknown',
        AuditActionType.MOBILE_VOTE_CAST,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId: req.body.electionId,
          candidateId: req.body.candidateId,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log mobile vote cast error', logErr));

    next(error);
  }
};

/**
 * Get vote receipt
 * @route GET /api/v1/mobile/vote/receipt/:receiptCode
 * @access Private
 */
export const getVoteReceipt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { receiptCode } = req.params;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!receiptCode) {
      throw new ApiError(400, 'Receipt code is required', 'MISSING_RECEIPT_CODE');
    }

    // Use the standard vote verification service
    const result = await voteService.verifyVote(receiptCode);

    if (!result.isValid) {
      throw new ApiError(404, 'Vote receipt not found or invalid', 'INVALID_RECEIPT');
    }

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.VOTE_RECEIPT_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { receiptCode, success: true },
    );

    res.status(200).json({
      success: true,
      message: 'Vote receipt retrieved successfully',
      data: {
        receiptCode,
        electionName: result.electionName,
        candidateName: result.candidateName,
        candidateParty: result.candidateParty,
        pollingUnit: result.pollingUnit,
        timestamp: result.timestamp,
        voteSource: result.voteSource,
        verifiedVia: 'mobile_app',
      },
    });
  } catch (error) {
    // Log failed attempt
    await auditService
      .createAuditLog(
        req.user?.id || 'unknown',
        AuditActionType.VOTE_RECEIPT_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          receiptCode: req.params.receiptCode,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log mobile receipt view error', logErr));

    next(error);
  }
};

/**
 * Get offline voting package
 * @route GET /api/v1/mobile/vote/offline-package
 * @access Private
 */
export const getOfflinePackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { electionId } = req.query;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!electionId || typeof electionId !== 'string') {
      throw new ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
    }

    // Check voter eligibility
    const eligibility = await voterService.checkVoterEligibility(userId, electionId);
    if (!eligibility.isEligible) {
      throw new ApiError(403, `Voter is not eligible: ${eligibility.reason}`, 'VOTER_NOT_ELIGIBLE');
    }

    // Get election details
    const election = await electionService.getElectionById(electionId);
    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // Get candidates for the election
    const candidatesResult = await electionService.getElectionCandidates(electionId, 1, 1000);

    // Get voter's polling unit
    const voterProfile = await voterService.getVoterProfile(userId);
    const pollingUnitInfo = voterProfile?.pollingUnit;
    if (!pollingUnitInfo) {
      throw new ApiError(404, 'Polling unit not found for voter', 'POLLING_UNIT_NOT_FOUND');
    }

    // Generate encryption keys for offline voting
    const keys = generateElectionKeys();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const keyId = `mobile-offline-${userId}-${electionId}-${Date.now()}`;

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.OFFLINE_PACKAGE_GENERATE,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        electionId,
        keyId,
        expiresAt,
        success: true,
      },
    );

    res.status(200).json({
      success: true,
      message: 'Offline voting package generated successfully',
      data: {
        election: {
          id: election.id,
          name: election.electionName,
          type: election.electionType,
          startDate: election.startDate,
          endDate: election.endDate,
        },
        candidates: candidatesResult.candidates.map((candidate: any) => ({
          id: candidate.id,
          name: candidate.fullName,
          party: candidate.partyName,
          position: candidate.position,
        })),
        voter: {
          id: userId,
          pollingUnit: pollingUnitInfo,
        },
        encryption: {
          publicKey: keys.publicKey,
          keyId,
          algorithm: 'RSA-2048 + AES-256',
          expiresAt,
        },
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Log failed attempt
    await auditService
      .createAuditLog(
        req.user?.id || 'unknown',
        AuditActionType.OFFLINE_PACKAGE_GENERATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId: req.query.electionId,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log mobile offline package error', logErr));

    next(error);
  }
};

/**
 * Submit offline votes
 * @route POST /api/v1/mobile/vote/submit-offline
 * @access Private
 */
export const submitOfflineVotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { electionId, encryptedVotes, keyShares, adminId, reason } = req.body;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!electionId || !encryptedVotes || !Array.isArray(encryptedVotes)) {
      throw new ApiError(
        400,
        'Election ID and encrypted votes array are required',
        'INVALID_REQUEST_DATA',
      );
    }

    if (!keyShares || !Array.isArray(keyShares) || keyShares.length < 3) {
      throw new ApiError(
        400,
        'At least 3 key shares required for decryption',
        'INSUFFICIENT_KEY_SHARES',
      );
    }

    // Delegate to the offline vote controller logic
    // This reuses the same encryption/decryption logic
    const { reconstructPrivateKey } = await import('../../services/electionKeyService');
    const { batchDecryptVotes } = await import('../../services/voteEncryptionService');

    // Reconstruct private key from shares
    const privateKey = reconstructPrivateKey(electionId, keyShares, { adminId, reason });

    // Get voter's polling unit
    const pollingUnit = await voterService.getVoterPollingUnit(userId);
    if (!pollingUnit || !pollingUnit.id) {
      throw new ApiError(404, 'Polling unit not found for voter', 'POLLING_UNIT_NOT_FOUND');
    }

    // Convert encrypted votes to proper format
    const encryptedVoteObjects = encryptedVotes.map((vote: any) => ({
      encryptedVoteData: Buffer.from(vote.encryptedVoteData, 'base64'),
      encryptedAesKey: vote.encryptedAesKey,
      iv: vote.iv,
      voteHash: vote.voteHash,
      publicKeyFingerprint: vote.publicKeyFingerprint,
    }));

    // Batch decrypt all votes
    const decryptedVotes = batchDecryptVotes(encryptedVoteObjects, privateKey);

    // Process each decrypted vote
    const processedVotes = [];
    for (let i = 0; i < decryptedVotes.length; i++) {
      const voteData = decryptedVotes[i];
      try {
        const result = await voteService.castVote(
          voteData.voterId,
          voteData.electionId,
          voteData.candidateId,
          voteData.pollingUnitId,
          VoteSource.MOBILE,
        );

        processedVotes.push({
          id: result.id,
          candidateId: voteData.candidateId,
          status: 'processed',
          receiptCode: result.receiptCode,
        });
      } catch (processingError) {
        processedVotes.push({
          candidateId: voteData.candidateId,
          status: 'failed',
          error: (processingError as Error).message,
        });
      }
    }

    const successfulVotes = processedVotes.filter(v => v.status === 'processed');
    const failedVotes = processedVotes.filter(v => v.status === 'failed');

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.OFFLINE_VOTE_SUBMIT,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        electionId,
        totalVotes: encryptedVotes.length,
        successfulVotes: successfulVotes.length,
        failedVotes: failedVotes.length,
        success: failedVotes.length === 0,
      },
    );

    const overallStatus = failedVotes.length === 0 ? 200 : 207;
    const message =
      overallStatus === 200
        ? 'All offline votes submitted successfully'
        : 'Offline votes submitted with some errors';

    res.status(overallStatus).json({
      success: overallStatus === 200,
      message,
      data: {
        processedVotes,
        summary: {
          total: encryptedVotes.length,
          successful: successfulVotes.length,
          failed: failedVotes.length,
        },
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Log failed attempt
    await auditService
      .createAuditLog(
        req.user?.id || 'unknown',
        AuditActionType.OFFLINE_VOTE_SUBMIT,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId: req.body.electionId,
          voteCount: Array.isArray(req.body.encryptedVotes) ? req.body.encryptedVotes.length : 0,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log mobile offline vote submission error', logErr));

    next(error);
  }
};
