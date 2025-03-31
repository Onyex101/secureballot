import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  electionService,
  auditService,
  encryptionService,
  voteService,
  voterService,
} from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { logger } from '../../config/logger';
import { VoteSource } from '../../db/models/Vote';

/**
 * Generate offline voting package
 * @route GET /api/v1/elections/:electionId/offline-package
 * @access Private
 */
export const generateOfflinePackage = async (
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

    // Check if election exists
    const election = await electionService.getElectionById(electionId);
    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // Check voter eligibility (using voterService)
    const eligibility = await voterService.checkVoterEligibility(userId, electionId);
    if (!eligibility.isEligible) {
      throw new ApiError(403, `Voter is not eligible: ${eligibility.reason}`, 'VOTER_NOT_ELIGIBLE');
    }

    // Get candidates for the election
    const candidatesResult = await electionService.getElectionCandidates(electionId, 1, 1000); // Get all

    // Get voter details (specifically polling unit)
    // TODO: Potentially optimize to only get necessary details
    const voterProfile = await voterService.getVoterProfile(userId);
    const pollingUnitInfo = voterProfile?.voterCard?.pollingUnit;
    if (!pollingUnitInfo) {
      throw new ApiError(
        404,
        'Could not retrieve voter polling unit information',
        'POLLING_UNIT_NOT_FOUND',
      );
    }

    // TODO: Implement secure key generation and management
    // Generate encryption keys for offline voting
    const { publicKey, privateKey } = encryptionService.generateKeyPair();
    logger.info(
      `Generated offline key pair for user ${userId}, election ${electionId}. Public Key starts: ${publicKey.substring(0, 30)}...`,
    );
    // Store privateKey securely - THIS IS CRITICAL
    logger.warn(
      `!!! OFFLINE PRIVATE KEY FOR user ${userId}, election ${electionId}: ${privateKey.substring(0, 50)}... MUST BE STORED SECURELY !!!`,
    );

    // Create an expiry date (e.g., 24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const keyId = `offline-${userId}-${electionId}-${Date.now()}`;

    // Log the offline package generation
    await auditService.createAuditLog(
      userId,
      AuditActionType.OFFLINE_PACKAGE_GENERATE,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        electionId,
        keyId,
        expiresAt,
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
          party: candidate.partyName, // Use partyName based on candidate model
          position: candidate.position,
        })),
        voter: {
          id: userId,
          pollingUnit: pollingUnitInfo,
        },
        encryption: {
          publicKey,
          keyId, // Provide ID for later key retrieval
          algorithm: 'ECIES', // Match encryptionService
          expiresAt,
        },
        timestamp: new Date(),
        expiresAt, // Redundant but might be useful at top level
      },
    });
  } catch (error) {
    // Log failure
    await auditService
      .createAuditLog(
        userId || 'unknown',
        AuditActionType.OFFLINE_PACKAGE_GENERATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: false, electionId, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log offline package generation error', logErr));
    next(error);
  }
};

/**
 * Submit offline votes
 * @route POST /api/v1/elections/:electionId/submit-offline
 * @access Private
 */
export const submitOfflineVotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;
  const { electionId } = req.params;
  // Assuming encryptedVotes is an array of { candidateId: string, encryptedVote: string (base64) }
  const { encryptedVotes, _signature, keyId } = req.body;
  const processedVotesInfo: {
    id?: string;
    candidateId: string;
    status: string;
    error?: string;
    receiptCode?: string;
  }[] = [];

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    if (!Array.isArray(encryptedVotes) || encryptedVotes.length === 0) {
      throw new ApiError(
        400,
        'encryptedVotes array is required and cannot be empty',
        'MISSING_VOTE_DATA',
      );
    }
    // TODO: Add validation for signature and keyId presence if required

    // Check if election exists
    const election = await electionService.getElectionById(electionId);
    if (!election) {
      throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
    }

    // TODO: Implement secure key retrieval using keyId
    // const privateKey = await getKeyFromSecureStore(keyId);
    // if (!privateKey) { throw new ApiError(400, 'Invalid or expired key ID', 'INVALID_KEY_ID'); }
    const _mockPrivateKey = 'PLACEHOLDER_RETRIEVED_PRIVATE_KEY'; // !! REPLACE WITH ACTUAL KEY RETRIEVAL !!

    // TODO: Implement signature verification
    // const dataToVerify = JSON.stringify(encryptedVotes); // Or however data was signed
    // const isSignatureValid = encryptionService.verifySignature(dataToVerify, signature, storedPublicKey);
    const isSignatureValid = true; // Placeholder
    if (!isSignatureValid) {
      throw new ApiError(400, 'Invalid signature', 'INVALID_SIGNATURE');
    }

    // Get voter's assigned polling unit
    const pollingUnit = await voterService.getVoterPollingUnit(userId);
    if (!pollingUnit || !pollingUnit.id) {
      throw new ApiError(
        404,
        'Polling unit not assigned or found for voter',
        'POLLING_UNIT_NOT_FOUND',
      );
    }

    // Process each vote within a transaction if multiple votes are atomic
    // For simplicity here, processing individually. Consider transaction for atomicity.
    for (const voteData of encryptedVotes) {
      const { candidateId, encryptedVote } = voteData;
      let voteId: string | undefined;
      let receiptCode: string | undefined;
      let status: string = 'failed';
      let errorMsg: string | undefined;

      try {
        if (!candidateId || !encryptedVote) {
          throw new Error('Missing candidateId or encryptedVote for an entry.');
        }

        // TODO: Implement decryption using retrieved private key
        // const decryptedPayload = encryptionService.decrypt(encryptedVote, mockPrivateKey);
        // const voteContent = JSON.parse(decryptedPayload); // Assuming JSON payload
        // Verify voteContent (e.g., matches candidateId, includes timestamp, etc.)
        logger.info(
          `Placeholder: Decrypting vote for candidate ${candidateId} from user ${userId}`,
        );

        // TODO: Re-evaluate this call. Should likely cast AFTER decryption and validation.
        // The current voteService.castVote expects non-encrypted data implicitly.
        // It also handles its own validations (eligibility, not voted). If we decrypt first,
        // we might call a different service method or pass decrypted data.
        // Temporarily calling castVote with placeholders assuming validation passes.
        const result = await voteService.castVote(
          userId,
          electionId,
          candidateId,
          pollingUnit.id,
          VoteSource.OFFLINE, // Use OFFLINE source
          // If decryption provides specific data, pass it here instead of relying on castVote internal generation
        );
        voteId = result.id;
        receiptCode = result.receiptCode;
        status = 'processed';
      } catch (processingError) {
        logger.error(
          `Error processing offline vote for candidate ${candidateId}, user ${userId}:`,
          processingError,
        );
        status = 'failed';
        errorMsg = (processingError as Error).message;
        // Decide if one failure should stop all processing or just log and continue
      }
      processedVotesInfo.push({ id: voteId, candidateId, status, error: errorMsg, receiptCode });
    }

    // Check if any votes failed processing
    const failedVotes = processedVotesInfo.filter(v => v.status === 'failed');
    const successfulVotes = processedVotesInfo.filter(v => v.status === 'processed');

    // Log the submission attempt
    await auditService.createAuditLog(
      userId,
      AuditActionType.OFFLINE_VOTE_SUBMIT,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: failedVotes.length === 0, // Overall success if no individual failures
        electionId,
        totalVotesSubmitted: encryptedVotes.length,
        successfulVotes: successfulVotes.length,
        failedVotes: failedVotes.length,
        keyId, // Log keyId used
      },
    );

    // Decide on overall response status based on partial success
    const overallStatus = failedVotes.length === 0 ? 200 : 207; // 200 OK or 207 Multi-Status
    const overallMessage =
      overallStatus === 200
        ? 'Offline votes submitted successfully'
        : 'Offline votes submitted with some errors';

    res.status(overallStatus).json({
      success: overallStatus === 200,
      message: overallMessage,
      data: {
        processedVotes: processedVotesInfo, // Return detailed status
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Log catastrophic failure (e.g., signature invalid, election not found)
    await auditService
      .createAuditLog(
        userId || 'unknown',
        AuditActionType.OFFLINE_VOTE_SUBMIT,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          electionId,
          voteCount: Array.isArray(encryptedVotes) ? encryptedVotes.length : 0,
          error: (error as Error).message,
          keyId: keyId || 'unknown',
        },
      )
      .catch(logErr => logger.error('Failed to log offline vote submission error', logErr));
    next(error);
  }
};

/**
 * Verify offline vote status using receipt code
 * @route GET /api/v1/votes/verify/:receiptCode // Reuse standard verification endpoint
 * @access Private (or Public?)
 */
export const verifyOfflineVote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // This is identical to the standard verifyVote, just potentially logged differently
  const { receiptCode } = req.params;
  const userId = req.user?.id;

  try {
    // Use the standard voteService for verification
    const result = await voteService.verifyVote(receiptCode);

    // Log the verification attempt differently or add context?
    await auditService.createAuditLog(
      userId || 'verifier',
      AuditActionType.OFFLINE_VOTE_VERIFY, // Use specific offline enum
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        receiptCode,
        success: result.isValid,
        sourceAttempted: 'offline', // Add context
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

    // Add context that this was likely an offline vote if needed
    const responseData = { ...result, verifiedVia: 'offline_check' };

    res.status(200).json({
      code: 'OFFLINE_VOTE_VERIFIED',
      message: 'Offline vote verified successfully',
      data: responseData,
    });
  } catch (error) {
    // Log failure
    await auditService
      .createAuditLog(
        userId || 'verifier',
        AuditActionType.OFFLINE_VOTE_VERIFY,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          receiptCode,
          sourceAttempted: 'offline',
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log offline vote verification error', logErr));
    next(error);
  }
};
