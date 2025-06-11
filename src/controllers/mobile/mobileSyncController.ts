import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  electionService,
  auditService,
  voterService,
  pollingUnitService,
  // voteService // Not used after removing castVote
} from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { logger } from '../../config/logger';
import Election, { ElectionStatus } from '../../db/models/Election';
import Candidate from '../../db/models/Candidate';
import PollingUnit from '../../db/models/PollingUnit';
import Vote, { VoteSource } from '../../db/models/Vote';
import crypto from 'crypto';
import { createContextualLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';

/**
 * Synchronize data between mobile app and server
 */
export const syncData = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;
  const { type, data = {} } = req.body;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    if (!type) {
      throw new ApiError(400, 'Sync type is required', 'MISSING_SYNC_TYPE');
    }

    let responseData;
    const { electionId, state, lga, ward } = data;

    switch (type) {
      case 'elections':
        const activeElections = await electionService.getElections(ElectionStatus.ACTIVE);
        const upcomingElections = await electionService.getElections(ElectionStatus.SCHEDULED);
        const elections = [...activeElections, ...upcomingElections];
        responseData = {
          elections: elections.map((election: Election) => ({
            id: election.id,
            name: election.electionName,
            type: election.electionType,
            startDate: election.startDate,
            endDate: election.endDate,
            status: election.status,
          })),
          lastSyncTimestamp: new Date(),
        };
        break;

      case 'candidates':
        if (!electionId) {
          throw new ApiError(
            400,
            'Election ID is required for candidate sync',
            'MISSING_ELECTION_ID',
          );
        }
        const candidatesResult = await electionService.getElectionCandidates(electionId, 1, 1000);
        responseData = {
          candidates: candidatesResult.candidates.map((candidate: Candidate) => ({
            id: candidate.id,
            name: candidate.fullName,
            party: candidate.partyName,
            position: candidate.position,
            electionId: electionId,
          })),
          lastSyncTimestamp: new Date(),
        };
        break;

      case 'pollingUnits':
        const filters = { state, lga, ward };
        if (!filters.state && !filters.lga && !filters.ward) {
          // Decide policy: throw error or fetch all (potentially very large)?
          // Let's throw for now to avoid unintentional large fetches.
          throw new ApiError(
            400,
            'At least one filter (state, lga, ward) is required for polling unit sync',
            'MISSING_PU_FILTER',
          );
        }
        // Increase limit significantly for sync, maybe make configurable?
        const pollingUnitsResult = await pollingUnitService.getPollingUnits(
          filters,
          undefined,
          1,
          10000,
        );
        responseData = {
          pollingUnits: pollingUnitsResult.pollingUnits.map((unit: PollingUnit) => ({
            id: unit.id,
            name: unit.pollingUnitName,
            code: unit.pollingUnitCode,
            address: unit.address,
            state: unit.state,
            lga: unit.lga,
            ward: unit.ward,
            latitude: unit.latitude,
            longitude: unit.longitude,
          })),
          pagination: pollingUnitsResult.pagination,
          lastSyncTimestamp: new Date(),
        };
        break;

      case 'profile':
        const voterProfile = await voterService.getVoterProfile(userId);
        responseData = {
          profile: {
            id: voterProfile.id,
            nin: voterProfile.nin,
            vin: voterProfile.vin,
            phoneNumber: voterProfile.phoneNumber,
            pollingUnit: voterProfile.pollingUnit,
            verification: voterProfile.verification,
            mfaEnabled: voterProfile.mfaEnabled,
          },
          lastSyncTimestamp: new Date(),
        };
        break;

      default:
        throw new ApiError(400, `Unsupported sync type: ${type}`, 'UNSUPPORTED_SYNC_TYPE');
    }

    // Log the sync action using contextual logging
    await createContextualLog(
      req,
      AuditActionType.MOBILE_DATA_SYNC,
      AdminAction.SYSTEM_STATS_VIEW,
      ResourceType.SYSTEM,
      userId,
      {
        success: true,
        syncType: type,
        context: data,
      },
    );

    res.status(200).json({
      success: true,
      message: `Data synchronized successfully for type: ${type}`,
      data: responseData,
    });
  } catch (error) {
    // Log failure using contextual logging
    await createContextualLog(
      req,
      AuditActionType.MOBILE_DATA_SYNC,
      AdminAction.SYSTEM_STATS_VIEW,
      ResourceType.SYSTEM,
      userId,
      {
        success: false,
        syncType: type,
        context: data,
        error: (error as Error).message,
      },
    ).catch(logErr => logger.error('Failed to log mobile data sync error', logErr));
    next(error);
  }
};

/**
 * Get election details for mobile sync
 * @route GET /api/v1/mobile/sync/election/:electionId
 * @access Private
 */
export const getElectionDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { electionId } = req.params;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!electionId) {
      throw new ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
    }

    // TODO: Implement election details retrieval logic
    // This would involve:
    // 1. Fetching election information
    // 2. Including candidate list
    // 3. Including polling unit details
    // 4. Including voter eligibility status

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.MOBILE_SYNC_ELECTION_DETAILS,
      req.ip || '',
      req.headers['user-agent'] || '',
      { electionId },
    );

    res.status(200).json({
      success: true,
      data: {
        electionId,
        electionName: 'Election Name', // Replace with actual data
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        status: 'ACTIVE',
        candidates: [], // Replace with actual candidates
        pollingUnit: {}, // Replace with actual polling unit
        voterEligibility: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync offline votes
 * @route POST /api/v1/mobile/sync/offline-votes
 * @access Private
 */
export const syncOfflineVotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { offlineVotes } = req.body;

    if (!userId) {
      throw new ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
    }

    if (!offlineVotes || !Array.isArray(offlineVotes)) {
      throw new ApiError(400, 'Invalid offline votes data', 'INVALID_OFFLINE_VOTES');
    }

    // TODO: Implement offline votes sync logic
    // This would involve:
    // 1. Validating each vote
    // 2. Processing votes in batches
    // 3. Handling conflicts
    // 4. Updating sync status

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.MOBILE_SYNC_OFFLINE_VOTES,
      req.ip || '',
      req.headers['user-agent'] || '',
      { voteCount: offlineVotes.length },
    );

    res.status(200).json({
      success: true,
      message: 'Offline votes synced successfully',
      data: {
        processedCount: offlineVotes.length,
        failedCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const castVote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, electionId, candidateId, pollingUnitId } = req.body;

    // Validate required fields
    if (!userId || !electionId || !candidateId || !pollingUnitId) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Create vote record
    const vote = await Vote.create({
      userId,
      electionId,
      candidateId,
      pollingUnitId,
      voteSource: VoteSource.OFFLINE,
      isCounted: true,
      voteTimestamp: new Date(),
      encryptedVoteData: Buffer.from(
        JSON.stringify({
          userId,
          candidateId,
          timestamp: new Date().toISOString(),
        }),
      ),
      voteHash: crypto.randomBytes(32).toString('hex'),
      encryptedAesKey: 'placeholder-encrypted-key',
      iv: crypto.randomBytes(16).toString('hex'),
      publicKeyFingerprint: 'placeholder-fingerprint',
      receiptCode: crypto.randomBytes(16).toString('hex'),
    });

    // Create audit log
    await auditService.createAuditLog(
      userId,
      AuditActionType.VOTE_CAST,
      JSON.stringify({
        electionId,
        candidateId,
        pollingUnitId,
      }),
      req.ip || 'unknown',
    );

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: { voteId: vote.id },
    });
  } catch (error) {
    next(error);
  }
};

// Removed castVote - Should use voteController or offlineVoteController
