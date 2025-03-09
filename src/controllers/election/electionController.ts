import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import db from '../../db/models';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { ElectionStatus } from '../../db/models/Election';
import { logger } from '../../config/logger';
import { Op } from 'sequelize';

/**
 * Get all active elections
 * @route GET /api/v1/elections
 * @access Private
 */
export const getElections = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status = 'active', type, page = 1, limit = 10 } = req.query;
    const userId = req.user?.id;
    
    // Calculate offset for pagination
    const offset = (Number(page) - 1) * Number(limit);
    
    // Prepare filters
    const whereClause: any = {};
    
    // Filter by status
    if (status === 'active') {
      whereClause.isActive = true;
      whereClause.status = ElectionStatus.ACTIVE;
    } else if (status === 'upcoming') {
      whereClause.startDate = { [Op.gt]: new Date() };
    } else if (status === 'past') {
      whereClause.endDate = { [Op.lt]: new Date() };
    }
    
    // Filter by election type
    if (type) {
      whereClause.electionType = type;
    }
    
    // Get elections with pagination
    const { count, rows: elections } = await db.Election.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'electionName', 'electionType', 'startDate', 
        'endDate', 'description', 'isActive', 'status'
      ],
      order: [['startDate', 'ASC']],
      limit: Number(limit),
      offset,
    });
    
    // Get voter's verification status for eligibility check
    let verificationStatus = null;
    if (userId) {
      verificationStatus = await db.VerificationStatus.findOne({
        where: { userId },
        attributes: ['isVerified'],
      });
    }
    
    // Log election view
    if (userId) {
      await db.AuditLog.create({
        userId,
        actionType: AuditActionType.ELECTION_VIEW,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        actionDetails: { 
          filter: { status, type },
          resultsCount: count
        },
      });
    }
    
    // Return paginated results
    res.status(200).json({
      code: 'ELECTIONS_RETRIEVED',
      message: 'Elections retrieved successfully',
      data: {
        elections,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit)),
        },
        voterStatus: verificationStatus ? {
          isVerified: verificationStatus.isVerified
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get election details by ID
 * @route GET /api/v1/elections/:electionId
 * @access Private
 */
export const getElectionById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { electionId } = req.params;
    const userId = req.user?.id;
    
    // Get election with candidates
    const election = await db.Election.findByPk(electionId, {
      attributes: [
        'id', 'electionName', 'electionType', 'startDate', 
        'endDate', 'description', 'isActive', 'status'
      ],
      include: [
        {
          model: db.Candidate,
          as: 'candidates',
          attributes: [
            'id', 'fullName', 'partyCode', 'partyName', 
            'bio', 'photoUrl', 'position', 'isActive'
          ],
          where: { isActive: true },
          required: false,
        },
      ],
    });
    
    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'ELECTION_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Check if voter has already voted in this election
    let hasVoted = false;
    if (userId) {
      const existingVote = await db.Vote.findOne({
        where: {
          userId,
          electionId,
        },
        attributes: ['id', 'voteTimestamp'],
      });
      
      hasVoted = !!existingVote;
    }
    
    // Get voter's verification status for eligibility check
    let verificationStatus = null;
    if (userId) {
      verificationStatus = await db.VerificationStatus.findOne({
        where: { userId },
        attributes: ['isVerified'],
      });
    }
    
    // Calculate election status for display
    const now = new Date();
    let displayStatus = election.status;
    
    if (election.status === ElectionStatus.SCHEDULED && now >= election.startDate && now <= election.endDate) {
      displayStatus = 'active_soon';
    } else if (election.status === ElectionStatus.ACTIVE && now > election.endDate) {
      displayStatus = 'ended';
    } else if (election.status === ElectionStatus.SCHEDULED && now < election.startDate) {
      displayStatus = 'upcoming';
    }
    
    // Log election view
    if (userId) {
      await db.AuditLog.create({
        userId,
        actionType: AuditActionType.ELECTION_VIEW,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        actionDetails: { 
          electionId,
          electionName: election.electionName
        },
      });
    }
    
    // Return election details
    res.status(200).json({
      code: 'ELECTION_RETRIEVED',
      message: 'Election retrieved successfully',
      data: {
        election: {
          ...election.get(),
          displayStatus,
        },
        voterStatus: {
          hasVoted,
          isVerified: verificationStatus ? verificationStatus.isVerified : false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get candidates for an election
 * @route GET /api/v1/elections/:electionId/candidates
 * @access Private
 */
export const getElectionCandidates = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { electionId } = req.params;
    const userId = req.user?.id;
    
    // Get election
    const election = await db.Election.findByPk(electionId, {
      attributes: ['id', 'electionName', 'electionType'],
    });
    
    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'ELECTION_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Get candidates
    const candidates = await db.Candidate.findAll({
      where: {
        electionId,
        isActive: true,
      },
      attributes: [
        'id', 'fullName', 'partyCode', 'partyName', 
        'bio', 'photoUrl', 'position', 'manifesto'
      ],
      order: [['partyName', 'ASC']],
    });
    
    // Log candidate view
    if (userId) {
      await db.AuditLog.create({
        userId,
        actionType: AuditActionType.ELECTION_VIEW,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        actionDetails: { 
          action: 'view_candidates',
          electionId,
          electionName: election.electionName,
          candidateCount: candidates.length
        },
      });
    }
    
    // Return candidates
    res.status(200).json({
      code: 'CANDIDATES_RETRIEVED',
      message: 'Election candidates retrieved successfully',
      data: {
        election: {
          id: election.id,
          name: election.electionName,
          type: election.electionType,
        },
        candidates,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get candidate details by ID
 * @route GET /api/v1/elections/:electionId/candidates/:candidateId
 * @access Private
 */
export const getCandidateById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { electionId, candidateId } = req.params;
    const userId = req.user?.id;
    
    // Get candidate
    const candidate = await db.Candidate.findOne({
      where: {
        id: candidateId,
        electionId,
        isActive: true,
      },
      attributes: [
        'id', 'fullName', 'partyCode', 'partyName', 
        'bio', 'photoUrl', 'position', 'manifesto'
      ],
      include: [
        {
          model: db.Election,
          as: 'election',
          attributes: ['id', 'electionName', 'electionType'],
        },
      ],
    });
    
    if (!candidate) {
      const error: ApiError = new Error('Candidate not found');
      error.statusCode = 404;
      error.code = 'CANDIDATE_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Log candidate view
    if (userId) {
      await db.AuditLog.create({
        userId,
        actionType: AuditActionType.ELECTION_VIEW,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        actionDetails: { 
          action: 'view_candidate_details',
          electionId,
          candidateId,
          candidateName: candidate.fullName,
          partyName: candidate.partyName
        },
      });
    }
    
    // Return candidate details
    res.status(200).json({
      code: 'CANDIDATE_RETRIEVED',
      message: 'Candidate retrieved successfully',
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check voter's voting status for an election
 * @route GET /api/v1/elections/:electionId/voting-status
 * @access Private
 */
export const getVotingStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { electionId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }
    
    // Get election
    const election = await db.Election.findByPk(electionId, {
      attributes: ['id', 'electionName', 'status', 'startDate', 'endDate'],
    });
    
    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'ELECTION_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Check if voter has already voted
    const existingVote = await db.Vote.findOne({
      where: {
        userId,
        electionId,
      },
      attributes: ['id', 'voteTimestamp', 'candidateId', 'voteSource'],
      include: [
        {
          model: db.Candidate,
          as: 'candidate',
          attributes: ['fullName', 'partyName'],
        },
      ],
    });
    
    // Get voter's verification status
    const verification = await db.VerificationStatus.findOne({
      where: { userId },
      attributes: ['isVerified'],
    });
    
    // Calculate election status
    const now = new Date();
    let electionStatus = election.status;
    
    if (election.status === ElectionStatus.SCHEDULED && now >= election.startDate && now <= election.endDate) {
      electionStatus = 'active_soon';
    } else if (now > election.endDate) {
      electionStatus = 'ended';
    } else if (now < election.startDate) {
      electionStatus = 'upcoming';
    }
    
    // Return voting status
    res.status(200).json({
      code: 'VOTING_STATUS_RETRIEVED',
      message: 'Voting status retrieved successfully',
      data: {
        election: {
          id: election.id,
          name: election.electionName,
          status: electionStatus,
          startDate: election.startDate,
          endDate: election.endDate,
        },
        voter: {
          isVerified: verification?.isVerified || false,
          hasVoted: !!existingVote,
          ...(existingVote ? {
            voteDetails: {
              timestamp: existingVote.voteTimestamp,
              source: existingVote.voteSource,
              candidateName: existingVote.candidate?.fullName,
              partyName: existingVote.candidate?.partyName,
            }
          } : {}),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};