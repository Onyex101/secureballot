import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import db from '../../db/models';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { ElectionStatus } from '../../db/models/Election';
import { logger } from '../../config/logger';
import { sequelize } from '../../server';

/**
 * Get live election results
 * @route GET /api/v1/results/live/:electionId
 * @access Public
 */
export const getLiveResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { electionId } = req.params;
    
    // Get election
    const election = await db.Election.findByPk(electionId, {
      attributes: ['id', 'electionName', 'electionType', 'status', 'startDate', 'endDate'],
    });
    
    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'ELECTION_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Check if election results can be shown
    // Only show results if election is active or completed
    if (election.status !== ElectionStatus.ACTIVE && 
        election.status !== ElectionStatus.COMPLETED) {
      const error: ApiError = new Error('Results not available for this election');
      error.statusCode = 403;
      error.code = 'RESULTS_NOT_AVAILABLE';
      error.isOperational = true;
      throw error;
    }
    
    // Get candidates with vote counts
    const candidates = await db.Candidate.findAll({
      where: {
        electionId,
        isActive: true,
      },
      attributes: [
        'id', 'fullName', 'partyCode', 'partyName', 'photoUrl',
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM votes
            WHERE votes.candidate_id = "Candidate".id
          )`),
          'voteCount'
        ],
      ],
      order: [[sequelize.literal('voteCount'), 'DESC']],
    });
    
    // Get total vote count
    const { count: totalVotes } = await db.Vote.findAndCountAll({
      where: { electionId },
    });
    
    // Calculate vote percentages
    const candidatesWithPercentage = candidates.map(candidate => {
      const voteCount = (candidate as any).dataValues.voteCount; // Cast to access literal count
      const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) : '0.00';
      
      return {
        id: candidate.id,
        fullName: candidate.fullName,
        partyCode: candidate.partyCode,
        partyName: candidate.partyName,
        photoUrl: candidate.photoUrl,
        voteCount,
        percentage: parseFloat(percentage),
      };
    });
    
    // Get latest election stats if available
    const electionStats = await db.ElectionStats.findOne({
      where: { electionId },
      order: [['lastUpdated', 'DESC']],
    });
    
    // Return results
    res.status(200).json({
      code: 'RESULTS_RETRIEVED',
      message: 'Election results retrieved successfully',
      data: {
        election: {
          id: election.id,
          name: election.electionName,
          type: election.electionType,
          status: election.status,
          startDate: election.startDate,
          endDate: election.endDate,
        },
        results: {
          candidates: candidatesWithPercentage,
          totalVotes,
          lastUpdated: new Date(),
        },
        stats: electionStats ? {
          turnoutPercentage: electionStats.turnoutPercentage,
          maleVoters: electionStats.maleVoters,
          femaleVoters: electionStats.femaleVoters,
          urbanVoters: electionStats.urbanVoters,
          ruralVoters: electionStats.ruralVoters,
          ageDistribution: electionStats.ageDistribution,
          lastUpdated: electionStats.lastUpdated,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get election results by region
 * @route GET /api/v1/results/region/:electionId
 * @access Public
 */
export const getResultsByRegion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { electionId } = req.params;
    const { regionType = 'state', regionCode } = req.query;
    
    // Get election
    const election = await db.Election.findByPk(electionId, {
      attributes: ['id', 'electionName', 'electionType', 'status'],
    });
    
    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'ELECTION_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Check if election results can be shown
    if (election.status !== ElectionStatus.ACTIVE && 
        election.status !== ElectionStatus.COMPLETED) {
      const error: ApiError = new Error('Results not available for this election');
      error.statusCode = 403;
      error.code = 'RESULTS_NOT_AVAILABLE';
      error.isOperational = true;
      throw error;
    }
    
    // Prepare where clause for region filtering
    const regionWhereClause: any = {};
    
    if (regionType === 'state' && regionCode) {
      regionWhereClause.state = regionCode;
    } else if (regionType === 'lga' && regionCode) {
      regionWhereClause.lga = regionCode;
    } else if (regionType === 'ward' && regionCode) {
      regionWhereClause.ward = regionCode;
    }
    
    // Get polling units in the region
    const pollingUnits = await db.PollingUnit.findAll({
      where: regionWhereClause,
      attributes: ['id', 'pollingUnitCode', 'pollingUnitName', 'state', 'lga', 'ward'],
    });
    
    if (pollingUnits.length === 0) {
      const error: ApiError = new Error('No polling units found for the specified region');
      error.statusCode = 404;
      error.code = 'REGION_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Get polling unit IDs
    const pollingUnitIds = pollingUnits.map(pu => pu.id);
    
    // Get candidates
    const candidates = await db.Candidate.findAll({
      where: {
        electionId,
        isActive: true,
      },
      attributes: ['id', 'fullName', 'partyCode', 'partyName'],
    });
    
    // Get vote counts by polling unit and candidate
    const voteCounts = await db.Vote.findAll({
      where: {
        electionId,
        pollingUnitId: pollingUnitIds,
      },
      attributes: [
        'pollingUnitId',
        'candidateId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['pollingUnitId', 'candidateId'],
    });
    
    // Format results by region
    let formattedResults: any[] = [];
    
    if (regionType === 'state') {
      // Group by state
      const states = [...new Set(pollingUnits.map(pu => pu.state))];
      
      formattedResults = states.map(state => {
        const statePollingUnitIds = pollingUnits
          .filter(pu => pu.state === state)
          .map(pu => pu.id);
        
        // Calculate vote counts for each candidate in this state
        const candidateResults = candidates.map(candidate => {
          const votes = voteCounts
            .filter(vc => 
              statePollingUnitIds.includes(vc.pollingUnitId) && 
              vc.candidateId === candidate.id
            )
            .reduce((sum, vc) => sum + parseInt((vc as any).dataValues.count, 10), 0);
          
          return {
            candidateId: candidate.id,
            candidateName: candidate.fullName,
            partyCode: candidate.partyCode,
            partyName: candidate.partyName,
            votes,
          };
        });
        
        // Sort candidates by votes
        candidateResults.sort((a, b) => b.votes - a.votes);
        
        // Calculate total votes in this state
        const totalVotes = candidateResults.reduce((sum, c) => sum + c.votes, 0);
        
        return {
          regionName: state,
          regionCode: state,
          regionType: 'state',
          totalVotes,
          candidates: candidateResults,
        };
      });
    } else if (regionType === 'lga') {
      // Group by LGA
      // Similar logic to state grouping
      const lgas = [...new Set(pollingUnits.map(pu => pu.lga))];
      
      formattedResults = lgas.map(lga => {
        const lgaPollingUnitIds = pollingUnits
          .filter(pu => pu.lga === lga)
          .map(pu => pu.id);
        
        // Get state of this LGA
        const state = pollingUnits.find(pu => pu.lga === lga)?.state || '';
        
        // Calculate vote counts for each candidate in this LGA
        const candidateResults = candidates.map(candidate => {
          const votes = voteCounts
            .filter(vc => 
              lgaPollingUnitIds.includes(vc.pollingUnitId) && 
              vc.candidateId === candidate.id
            )
            .reduce((sum, vc) => sum + parseInt((vc as any).dataValues.count, 10), 0);
          
          return {
            candidateId: candidate.id,
            candidateName: candidate.fullName,
            partyCode: candidate.partyCode,
            partyName: candidate.partyName,
            votes,
          };
        });
        
        // Sort candidates by votes
        candidateResults.sort((a, b) => b.votes - a.votes);
        
        // Calculate total votes in this LGA
        const totalVotes = candidateResults.reduce((sum, c) => sum + c.votes, 0);
        
        return {
          regionName: lga,
          regionCode: lga,
          regionType: 'lga',
          parentRegion: state,
          totalVotes,
          candidates: candidateResults,
        };
      });
    } else {
      // Group by polling unit
      formattedResults = pollingUnits.map(pu => {
        // Calculate vote counts for each candidate in this polling unit
        const candidateResults = candidates.map(candidate => {
          const voteCount = voteCounts
            .find(vc => vc.pollingUnitId === pu.id && vc.candidateId === candidate.id);
          
          const votes = voteCount ? parseInt((voteCount as any).dataValues.count, 10) : 0;
          
          return {
            candidateId: candidate.id,
            candidateName: candidate.fullName,
            partyCode: candidate.partyCode,
            partyName: candidate.partyName,
            votes,
          };
        });
        
        // Sort candidates by votes
        candidateResults.sort((a, b) => b.votes - a.votes);
        
        // Calculate total votes in this polling unit
        const totalVotes = candidateResults.reduce((sum, c) => sum + c.votes, 0);
        
        return {
          regionName: pu.pollingUnitName,
          regionCode: pu.pollingUnitCode,
          regionType: 'pollingUnit',
          parentRegion: pu.lga,
          state: pu.state,
          lga: pu.lga,
          ward: pu.ward,
          totalVotes,
          candidates: candidateResults,
        };
      });
    }
    
    // Return results
    res.status(200).json({
      code: 'REGION_RESULTS_RETRIEVED',
      message: 'Region results retrieved successfully',
      data: {
        election: {
          id: election.id,
          name: election.electionName,
          type: election.electionType,
        },
        regionType,
        regionResults: formattedResults,
        totalPollingUnits: pollingUnits.length,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get election statistics
 * @route GET /api/v1/results/statistics/:electionId
 * @access Public
 */
export const getElectionStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { electionId } = req.params;
    
    // Get election
    const election = await db.Election.findByPk(electionId, {
      attributes: ['id', 'electionName', 'electionType', 'status', 'startDate', 'endDate'],
    });
    
    if (!election) {
      const error: ApiError = new Error('Election not found');
      error.statusCode = 404;
      error.code = 'ELECTION_NOT_FOUND';
      error.isOperational = true;
      throw error;
    }
    
    // Check if election results can be shown
    if (election.status !== ElectionStatus.ACTIVE && 
        election.status !== ElectionStatus.COMPLETED) {
      const error: ApiError = new Error('Results not available for this election');
      error.statusCode = 403;
      error.code = 'RESULTS_NOT_AVAILABLE';
      error.isOperational = true;
      throw error;
    }
    
    // Get the latest election stats
    const electionStats = await db.ElectionStats.findOne({
      where: { electionId },
      order: [['lastUpdated', 'DESC']],
    });
    
    // Get total registered voters
    const { count: totalRegisteredVoters } = await db.Voter.findAndCountAll({
      include: [
        {
          model: db.VerificationStatus,
          as: 'verificationStatus',
          where: { isVerified: true },
        },
      ],
    });
    
    // Get total votes cast
    const { count: totalVotes } = await db.Vote.findAndCountAll({
      where: { electionId },
    });
    
    // Calculate turnout
    const turnoutPercentage = totalRegisteredVoters > 0 
      ? ((totalVotes / totalRegisteredVoters) * 100).toFixed(2) 
      : '0.00';
    
    // Get votes by source
    const votesBySource = await db.Vote.findAll({
      where: { electionId },
      attributes: [
        'voteSource',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['voteSource'],
    });
    
    // Format votes by source
    const formattedVotesBySource = votesBySource.map(src => ({
      source: src.voteSource,
      count: parseInt((src as any).dataValues.count, 10),
      percentage: totalVotes > 0 
        ? (parseInt((src as any).dataValues.count, 10) / totalVotes * 100).toFixed(2) 
        : '0.00',
    }));
    
    // Return statistics
    res.status(200).json({
      code: 'STATISTICS_RETRIEVED',
      message: 'Election statistics retrieved successfully',
      data: {
        election: {
          id: election.id,
          name: election.electionName,
          type: election.electionType,
          startDate: election.startDate,
          endDate: election.endDate,
        },
        statistics: {
          totalRegisteredVoters,
          totalVotes,
          turnoutPercentage: parseFloat(turnoutPercentage),
          votesBySource: formattedVotesBySource,
          ...(electionStats ? {
            genderDistribution: {
              male: electionStats.maleVoters,
              female: electionStats.femaleVoters,
              malePercentage: totalVotes > 0 
                ? ((electionStats.maleVoters / totalVotes) * 100).toFixed(2) 
                : '0.00',
              femalePercentage: totalVotes > 0 
                ? ((electionStats.femaleVoters / totalVotes) * 100).toFixed(2) 
                : '0.00',
            },
            locationDistribution: {
              urban: electionStats.urbanVoters,
              rural: electionStats.ruralVoters,
              urbanPercentage: totalVotes > 0 
                ? ((electionStats.urbanVoters / totalVotes) * 100).toFixed(2) 
                : '0.00',
              ruralPercentage: totalVotes > 0 
                ? ((electionStats.ruralVoters / totalVotes) * 100).toFixed(2) 
                : '0.00',
            },
            ageDistribution: electionStats.ageDistribution,
          } : {}),
          lastUpdated: electionStats?.lastUpdated || new Date(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};