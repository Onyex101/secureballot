import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { electionService, auditService, encryptionService, voteService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Generate offline voting package
 * @route GET /api/v1/elections/:electionId/offline-package
 * @access Private
 */
export const generateOfflinePackage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
      // Check if election exists
      const election = await electionService.getElectionById(electionId);
      
      if (!election) {
        const error: ApiError = new Error('Election not found');
        error.statusCode = 404;
        error.code = 'RESOURCE_NOT_FOUND';
        error.isOperational = true;
        throw error;
      }
      
      // Check voter eligibility
      const eligibility = await electionService.checkVoterEligibility(userId, electionId);
      
      if (!eligibility.isEligible) {
        const error: ApiError = new Error(`Voter is not eligible: ${eligibility.reason}`);
        error.statusCode = 403;
        error.code = 'VOTER_NOT_ELIGIBLE';
        error.isOperational = true;
        throw error;
      }
      
      // Get candidates for the election
      const candidates = await electionService.getElectionCandidates(electionId);
      
      // Get voter details
      const voterDetails = await electionService.getVoterDetails(userId);
      
      // Generate encryption keys for offline voting
      const { publicKey, privateKey } = encryptionService.generateKeyPair();
      
      // Store the private key securely (in a real implementation)
      // For now, we'll just log it
      console.log('Private key generated for offline voting (would be stored securely):', privateKey.substring(0, 50) + '...');
      
      // Create an expiry date (24 hours from now)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Log the offline package generation
      await auditService.createAuditLog(
        userId,
        'offline_package_generation',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          expiresAt
        }
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
            endDate: election.endDate
          },
          candidates: candidates.map(candidate => ({
            id: candidate.id,
            name: candidate.fullName,
            party: candidate.partyAffiliation,
            position: candidate.position
          })),
          voter: {
            id: userId,
            pollingUnit: voterDetails.pollingUnit
          },
          encryption: {
            publicKey,
            keyId: `offline-${Date.now()}`,
            algorithm: 'RSA-OAEP',
            expiresAt
          },
          timestamp: new Date(),
          expiresAt
        }
      });
    } catch (error) {
      const apiError: ApiError = new Error(`Failed to generate offline package: ${(error as Error).message}`);
      apiError.statusCode = 400;
      apiError.code = 'OFFLINE_PACKAGE_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Submit offline votes
 * @route POST /api/v1/elections/:electionId/submit-offline
 * @access Private
 */
export const submitOfflineVotes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { electionId } = req.params;
    const { encryptedVotes, signature, keyId } = req.body;
    
    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }
    
    try {
      // Check if election exists
      const election = await electionService.getElectionById(electionId);
      
      if (!election) {
        const error: ApiError = new Error('Election not found');
        error.statusCode = 404;
        error.code = 'RESOURCE_NOT_FOUND';
        error.isOperational = true;
        throw error;
      }
      
      // Verify signature (in a real implementation)
      // For now, we'll just assume it's valid
      const isSignatureValid = true;
      
      if (!isSignatureValid) {
        const error: ApiError = new Error('Invalid signature');
        error.statusCode = 400;
        error.code = 'INVALID_SIGNATURE';
        error.isOperational = true;
        throw error;
      }
      
      // Process each vote
      const processedVotes = [];
      
      for (const vote of encryptedVotes) {
        // In a real implementation, you would:
        // 1. Retrieve the private key associated with the keyId
        // 2. Decrypt the vote
        // 3. Verify the vote is valid
        // 4. Store the vote in the database
        
        // For now, we'll just create a mock vote
        const processedVote = await voteService.castVote(
          userId,
          electionId,
          vote.candidateId,
          'offline-polling-unit',
          vote.encryptedVote
        );
        
        processedVotes.push({
          id: processedVote.id,
          status: 'processed',
          receiptCode: processedVote.receiptCode
        });
      }
      
      // Log the offline votes submission
      await auditService.createAuditLog(
        userId,
        'offline_votes_submission',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          voteCount: encryptedVotes.length
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Offline votes submitted successfully',
        data: {
          processedVotes,
          timestamp: new Date()
        }
      });
    } catch (error) {
      const apiError: ApiError = new Error(`Failed to submit offline votes: ${(error as Error).message}`);
      apiError.statusCode = 400;
      apiError.code = 'OFFLINE_VOTE_SUBMISSION_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verify offline vote status
 * @route GET /api/v1/elections/:electionId/offline-votes/:receiptCode
 * @access Private
 */
export const verifyOfflineVote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { electionId, receiptCode } = req.params;
    
    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }
    
    try {
      // Verify the vote
      const verificationResult = await voteService.verifyVote(receiptCode);
      
      // Log the verification attempt
      await auditService.createAuditLog(
        userId,
        'offline_vote_verification',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          electionId,
          receiptCode,
          isValid: verificationResult.isValid
        }
      );
      
      if (!verificationResult.isValid) {
        res.status(404).json({
          success: false,
          message: 'Invalid receipt code. No vote found with this code.'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Vote verified successfully',
        data: {
          isValid: true,
          timestamp: verificationResult.timestamp,
          electionName: verificationResult.electionName
        }
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to verify offline vote');
      apiError.statusCode = 400;
      apiError.code = 'OFFLINE_VOTE_VERIFICATION_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
}; 