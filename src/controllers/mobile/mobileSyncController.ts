import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { electionService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Synchronize data between mobile app and server
 */
export const syncData = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { type, data } = req.body;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      let responseData;

      // Process different types of sync requests
      switch (type) {
        case 'elections':
          // Get active and upcoming elections
          const elections = await electionService.getElections('active,upcoming');
          responseData = {
            elections: elections.map((election: any) => ({
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
          // Get candidates for a specific election
          if (!data || !data.electionId) {
            throw new Error('Election ID is required for candidate sync');
          }

          const candidatesResult = await electionService.getElectionCandidates(data.electionId);
          responseData = {
            candidates: candidatesResult.candidates.map((candidate: any) => ({
              id: candidate.id,
              name: candidate.fullName,
              party: candidate.partyAffiliation,
              position: candidate.position,
              electionId: data.electionId,
            })),
            lastSyncTimestamp: new Date(),
          };
          break;

        case 'pollingUnits':
          // Get polling units for a specific region
          if (!data || !data.regionId) {
            throw new Error('Region ID is required for polling unit sync');
          }

          const pollingUnitsResult = await electionService.getPollingUnitsByRegion(data.regionId);
          responseData = {
            pollingUnits: pollingUnitsResult.pollingUnits.map((unit: any) => ({
              id: unit.id,
              name: unit.name,
              code: unit.code,
              address: unit.address,
              regionId: data.regionId,
            })),
            lastSyncTimestamp: new Date(),
          };
          break;

        case 'profile':
          // Get voter profile data
          const voterProfile = await electionService.getVoterDetails(userId);
          responseData = {
            profile: {
              id: voterProfile.id,
              nin: voterProfile.nin,
              vin: voterProfile.vin,
              phoneNumber: voterProfile.phoneNumber,
              pollingUnit: voterProfile.pollingUnit,
            },
            lastSyncTimestamp: new Date(),
          };
          break;

        default:
          throw new Error(`Unsupported sync type: ${type}`);
      }

      // Log the sync action
      await auditService.createAuditLog(
        userId,
        'mobile_data_sync',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          syncType: type,
          timestamp: new Date(),
        },
      );

      res.status(200).json({
        success: true,
        message: `Data synchronized successfully for type: ${type}`,
        data: responseData,
      });
    } catch (error) {
      const apiError: ApiError = new Error(
        `Failed to synchronize data: ${(error as Error).message}`,
      );
      apiError.statusCode = 400;
      apiError.code = 'SYNC_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get election details for mobile app
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
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Get election details
      const election = await electionService.getElectionById(electionId);

      if (!election) {
        const error: ApiError = new Error('Election not found');
        error.statusCode = 404;
        error.code = 'RESOURCE_NOT_FOUND';
        error.isOperational = true;
        throw error;
      }

      // Get candidates for the election
      const candidatesResult = await electionService.getElectionCandidates(electionId);

      // Check voter eligibility
      const eligibility = await electionService.checkVoterEligibility(userId, electionId);

      // Log the action
      await auditService.createAuditLog(
        userId,
        'mobile_election_details_view',
        req.ip || '',
        req.headers['user-agent'] || '',
        { electionId },
      );

      res.status(200).json({
        success: true,
        data: {
          election: {
            id: election.id,
            name: election.electionName,
            type: election.electionType,
            startDate: election.startDate,
            endDate: election.endDate,
            status: election.status,
            description: election.description,
          },
          candidates: candidatesResult.candidates.map((candidate: any) => ({
            id: candidate.id,
            name: candidate.fullName,
            party: candidate.partyAffiliation,
            position: candidate.position,
            photoUrl: candidate.photoUrl,
          })),
          eligibility,
        },
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to get election details');
      apiError.statusCode = 400;
      apiError.code = 'ELECTION_DETAILS_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Cast vote from mobile app
 */
export const castVote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { electionId } = req.params;
    const { candidateId, encryptedVote, signature } = req.body;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Check voter eligibility
      const eligibility = await electionService.checkVoterEligibility(userId, electionId);

      if (!eligibility.isEligible) {
        const error: ApiError = new Error(`Voter is not eligible: ${eligibility.reason}`);
        error.statusCode = 403;
        error.code = 'VOTER_NOT_ELIGIBLE';
        error.isOperational = true;
        throw error;
      }

      // Verify signature
      // In a real implementation, this would involve proper signature verification
      const isSignatureValid = true; // Placeholder

      if (!isSignatureValid) {
        throw new Error('Invalid signature');
      }

      // Cast the vote
      const vote = await electionService.castVote(userId, electionId, candidateId, encryptedVote);

      // Log the vote (without revealing the choice)
      await auditService.createAuditLog(
        userId,
        'mobile_vote_cast',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          timestamp: new Date(),
        },
      );

      res.status(201).json({
        success: true,
        message: 'Vote cast successfully',
        data: {
          voteId: vote.id,
          receiptCode: vote.receiptCode,
          timestamp: vote.timestamp,
        },
      });
    } catch (error) {
      const apiError: ApiError = new Error(`Failed to cast vote: ${(error as Error).message}`);
      apiError.statusCode = 400;
      apiError.code = 'VOTE_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
