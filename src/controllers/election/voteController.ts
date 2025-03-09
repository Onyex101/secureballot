import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import crypto from 'crypto';
import db from '../../db/models';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { ElectionStatus } from '../../db/models/Election';
import { VoteSource } from '../../db/models/Vote';
import { logger } from '../../config/logger';
import { sequelize } from '../../server'; // Import the sequelize instance

/**
 * Cast a vote in an election
 * @route POST /api/v1/elections/:electionId/vote
 * @access Private
 */
export const castVote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  // Use a transaction to ensure data consistency
  const transaction = await sequelize.transaction();
  
  try {
    const { electionId } = req.params;
    const { candidateId, encryptedVote } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }
    
    // Check if voter is verified
    const verification = await db.VerificationStatus.findOne({
      where: { userId },
      attributes: ['isVerified'],
      transaction,
    });
    
    if (!verification || !verification.isVerified) {
      const error: ApiError = new Error('Voter is not verified');
      error.statusCode = 403;
      error.code = 'VOTER_NOT_VERIFIED';
      error.isOperational = true;
      throw error;
    }
    
    // Get voter's assigned polling unit
    const voterCard = await db.VoterCard.findOne({
      where: { userId },
      attributes: ['pollingUnitCode'],
      transaction,
    });
    
    if (!voterCard) {
      const error: ApiError = new Error('Voter card not found');
      error.statusCode = 404;
      error.code = 'VOTER_CARD_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Get polling unit ID
    const pollingUnit = await db.PollingUnit.findOne({
      where: { pollingUnitCode: voterCard.pollingUnitCode },
      attributes: ['id'],
      transaction,
    });
    
    if (!pollingUnit) {
      const error: ApiError = new Error('Polling unit not found');
      error.statusCode = 404;
      error.code = 'POLLING_UNIT_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Get election
    const election = await db.Election.findByPk(electionId, {
      attributes: ['id', 'electionName', 'status', 'startDate', 'endDate', 'isActive'],
      transaction,
    });
    
    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'ELECTION_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Check if election is active
    if (!election.isActive || election.status !== ElectionStatus.ACTIVE) {
      const error: ApiError = new Error('Election is not active');
      error.statusCode = 403;
      error.code = 'ELECTION_NOT_ACTIVE';
      error.isOperational = true;
      throw error;
    }
    
    // Check if election is within its timeframe
    const now = new Date();
    if (now < election.startDate || now > election.endDate) {
      const error: ApiError = new Error('Election is not currently open for voting');
      error.statusCode = 403;
      error.code = 'ELECTION_NOT_OPEN';
      error.isOperational = true;
      error.details = {
        startDate: election.startDate,
        endDate: election.endDate,
        currentTime: now,
      };
      throw error;
    }
    
    // Check if voter has already voted in this election
    const existingVote = await db.Vote.findOne({
      where: {
        userId,
        electionId,
      },
      transaction,
    });
    
    if (existingVote) {
      const error: ApiError = new Error('Voter has already cast a vote in this election');
      error.statusCode = 403;
      error.code = 'ALREADY_VOTED';
      error.isOperational = true;
      throw error;
    }
    
    // Verify candidate exists and is active
    const candidate = await db.Candidate.findOne({
      where: {
        id: candidateId,
        electionId,
        isActive: true,
      },
      transaction,
    });
    
    if (!candidate) {
      const error: ApiError = new Error('Invalid candidate');
      error.statusCode = 400;
      error.code = 'INVALID_CANDIDATE';
      error.isOperational = true;
      throw error;
    }
    
    // Process the encrypted vote
    if (!encryptedVote) {
      const error: ApiError = new Error('Encrypted vote data is required');
      error.statusCode = 400;
      error.code = 'MISSING_VOTE_DATA';
      error.isOperational = true;
      throw error;
    }
    
    // Convert base64 encrypted vote to buffer
    let encryptedVoteBuffer: Buffer;
    try {
      encryptedVoteBuffer = Buffer.from(encryptedVote, 'base64');
    } catch (error) {
      const err: ApiError = new Error('Invalid encrypted vote format');
      err.statusCode = 400;
      err.code = 'INVALID_VOTE_FORMAT';
      err.isOperational = true;
      throw err;
    }
    
    // Generate vote hash for integrity verification
    const voteHash = crypto
      .createHash('sha256')
      .update(encryptedVoteBuffer)
      .digest('hex');
    
    // Create the vote record
    const vote = await db.Vote.create({
      userId,
      electionId,
      candidateId,
      pollingUnitId: pollingUnit.id,
      encryptedVoteData: encryptedVoteBuffer,
      voteHash,
      voteTimestamp: new Date(),
      voteSource: VoteSource.WEB,
      isCounted: false, // Will be set to true during vote counting process
    }, { transaction });
    
    // Log the vote casting
    await db.AuditLog.create({
      userId,
      actionType: AuditActionType.VOTE_CAST,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      actionDetails: {
        electionId,
        electionName: election.electionName,
        pollingUnitCode: voterCard.pollingUnitCode,
        voteTimestamp: vote.voteTimestamp,
        voteSource: vote.voteSource,
        voteHash: voteHash.substring(0, 10) + '...' // Only log part of the hash for privacy
      },
    }, { transaction });
    
    // Commit the transaction
    await transaction.commit();
    
    // Generate a receipt code for the voter
    const receiptCode = crypto
      .createHash('sha256')
      .update(`${userId}-${electionId}-${voteHash}`)
      .digest('hex')
      .substring(0, 16);
    
    // Return success response
    res.status(201).json({
      code: 'VOTE_CAST_SUCCESS',
      message: 'Vote cast successfully',
      data: {
        voteId: vote.id,
        timestamp: vote.voteTimestamp,
        electionName: election.electionName,
        receiptCode,
        verificationUrl: `/api/v1/voter/verify-vote/${receiptCode}`
      },
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await transaction.rollback();
    next(error);
  }
};

/**
 * Verify a vote receipt
 * @route GET /api/v1/voter/verify-vote/:receiptCode
 * @access Private
 */
export const verifyVote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { receiptCode } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }
    
    // Find votes by this user
    const votes = await db.Vote.findAll({
      where: { userId },
      include: [
        {
          model: db.Election,
          as: 'election',
          attributes: ['electionName'],
        },
      ],
    });
    
    // Check each vote to see if it matches the receipt code
    let verifiedVote = null;
    
    for (const vote of votes) {
      const calculatedReceiptCode = crypto
        .createHash('sha256')
        .update(`${userId}-${vote.electionId}-${vote.voteHash}`)
        .digest('hex')
        .substring(0, 16);
      
      if (calculatedReceiptCode === receiptCode) {
        verifiedVote = vote;
        break;
      }
    }
    
    if (!verifiedVote) {
      const error: ApiError = new Error('Invalid or expired receipt code');
      error.statusCode = 404;
      error.code = 'INVALID_RECEIPT_CODE';
      error.isOperational = true;
      throw error;
    }
    
    // Log vote verification
    await db.AuditLog.create({
      userId,
      actionType: AuditActionType.VOTE_CAST,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      actionDetails: {
        action: 'verify_vote',
        electionId: verifiedVote.electionId,
        electionName: verifiedVote.election.electionName,
        voteTimestamp: verifiedVote.voteTimestamp,
      },
    });
    
    // Return verification result
    res.status(200).json({
      code: 'VOTE_VERIFIED',
      message: 'Vote verified successfully',
      data: {
        election: verifiedVote.election.electionName,
        timestamp: verifiedVote.voteTimestamp,
        source: verifiedVote.voteSource,
        isCounted: verifiedVote.isCounted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get voter's vote history
 * @route GET /api/v1/voter/vote-history
 * @access Private
 */
export const getVoteHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }
    
    // Find all votes by this user
    const votes = await db.Vote.findAll({
      where: { userId },
      attributes: ['id', 'voteTimestamp', 'voteSource', 'isCounted'],
      include: [
        {
          model: db.Election,
          as: 'election',
          attributes: ['id', 'electionName', 'electionType'],
        },
        {
          model: db.Candidate,
          as: 'candidate',
          attributes: ['fullName', 'partyName'],
        },
        {
          model: db.PollingUnit,
          as: 'pollingUnit',
          attributes: ['pollingUnitName', 'state', 'lga', 'ward'],
        },
      ],
      order: [['voteTimestamp', 'DESC']],
    });
    
    // Generate receipt codes for each vote
    const voteHistory = votes.map(vote => {
      const receiptCode = crypto
        .createHash('sha256')
        .update(`${userId}-${vote.election.id}-${vote.voteHash}`)
        .digest('hex')
        .substring(0, 16);
      
      return {
        id: vote.id,
        election: {
          id: vote.election.id,
          name: vote.election.electionName,
          type: vote.election.electionType,
        },
        candidate: {
          name: vote.candidate.fullName,
          party: vote.candidate.partyName,
        },
        pollingUnit: {
          name: vote.pollingUnit.pollingUnitName,
          state: vote.pollingUnit.state,
          lga: vote.pollingUnit.lga,
          ward: vote.pollingUnit.ward,
        },
        timestamp: vote.voteTimestamp,
        source: vote.voteSource,
        isCounted: vote.isCounted,
        receiptCode,
        verificationUrl: `/api/v1/voter/verify-vote/${receiptCode}`
      };
    });
    
    // Log vote history access
    await db.AuditLog.create({
      userId,
      actionType: AuditActionType.VOTE_CAST,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      actionDetails: {
        action: 'view_vote_history',
        voteCount: votes.length,
      },
    });
    
    // Return vote history
    res.status(200).json({
      code: 'VOTE_HISTORY_RETRIEVED',
      message: 'Vote history retrieved successfully',
      data: voteHistory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Report a vote issue
 * @route POST /api/v1/voter/report-vote-issue
 * @access Private
 */
export const reportVoteIssue = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { electionId, receiptCode, issueType, description } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }
    
    // Validate the receipt code if provided
    if (receiptCode) {
      // Find votes by this user
      const votes = await db.Vote.findAll({
        where: { userId, electionId },
      });
      
      // Check each vote to see if it matches the receipt code
      let validReceipt = false;
      
      for (const vote of votes) {
        const calculatedReceiptCode = crypto
          .createHash('sha256')
          .update(`${userId}-${electionId}-${vote.voteHash}`)
          .digest('hex')
          .substring(0, 16);
        
        if (calculatedReceiptCode === receiptCode) {
          validReceipt = true;
          break;
        }
      }
      
      if (!validReceipt) {
        const error: ApiError = new Error('Invalid receipt code');
        error.statusCode = 400;
        error.code = 'INVALID_RECEIPT_CODE';
        error.isOperational = true;
        throw error;
      }
    }
    
    // Log the vote issue
    await db.AuditLog.create({
      userId,
      actionType: AuditActionType.VOTE_CAST,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      actionDetails: {
        action: 'report_vote_issue',
        electionId,
        issueType,
        description,
        receiptCode: receiptCode || 'not_provided',
      },
      isSuspicious: true, // Flag for investigation
    });
    
    // Create a support ticket in a real implementation
    // Here we're just simulating that process
    
    // Return success response
    res.status(200).json({
      code: 'VOTE_ISSUE_REPORTED',
      message: 'Vote issue reported successfully',
      data: {
        ticketId: `VOTE-${Date.now().toString().substring(0, 10)}`,
        estimatedResponseTime: '24 hours',
      },
    });
  } catch (error) {
    next(error);
  }
};