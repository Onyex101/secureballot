import { Op } from 'sequelize';
import { Sequelize } from 'sequelize';
import Election from '../db/models/Election';
import Vote from '../db/models/Vote';
import Candidate from '../db/models/Candidate';
import PollingUnit from '../db/models/PollingUnit';
import Voter from '../db/models/Voter';
import UssdVote from '../db/models/UssdVote';

/**
 * Get election statistics
 */
export const getElectionStatistics = async (electionId: string): Promise<any> => {
  // Get the election
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new Error('Election not found');
  }

  // Get total registered voters
  const totalRegisteredVoters = await Voter.count({
    where: Sequelize.literal('polling_unit_code IS NOT NULL'),
  });

  // Get total votes cast
  const totalVotesCast = await Vote.count({
    where: { electionId },
  });

  // Get total USSD votes
  const totalUssdVotes = await UssdVote.count({
    where: { electionId },
  });

  // Get votes by polling unit
  const votesByPollingUnit = await Vote.findAll({
    where: { electionId },
    attributes: ['pollingUnitId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'voteCount']],
    include: [
      {
        model: PollingUnit,
        as: 'pollingUnit',
        attributes: ['id', 'name', 'code'],
      },
    ],
    group: ['pollingUnitId'],
    order: [[Sequelize.literal('voteCount'), 'DESC']],
  });

  // Calculate voter turnout
  const voterTurnout = (() => {
    if (totalRegisteredVoters > 0) {
      return (totalVotesCast / totalRegisteredVoters) * 100;
    }
    return 0;
  })();

  return {
    electionId: election.id,
    electionName: election.electionName,
    electionType: election.electionType,
    startDate: election.startDate,
    endDate: election.endDate,
    status: election.status,
    totalRegisteredVoters,
    totalVotesCast,
    totalUssdVotes,
    voterTurnout,
    votesByPollingUnit,
  };
};

/**
 * Get election results
 */
export const getElectionResults = async (
  electionId: string,
  includePollingUnitBreakdown: boolean = false,
): Promise<any> => {
  // Get the election
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new Error('Election not found');
  }

  // Get all candidates for this election
  const candidates = await Candidate.findAll({
    where: { electionId },
    attributes: ['id', 'fullName', 'partyName'],
  });

  // Get vote counts for each candidate
  const candidateResults = await Promise.all(
    candidates.map(async candidate => {
      // Count web votes
      const webVotes = await Vote.count({
        where: {
          electionId,
          candidateId: candidate.id,
        },
      });

      // Count USSD votes
      const ussdVotes = await UssdVote.count({
        where: {
          electionId,
          candidateId: candidate.id,
        },
      });

      // Total votes
      const totalVotes = webVotes + ussdVotes;

      // Get polling unit breakdown if requested
      let pollingUnitBreakdown = null;
      if (includePollingUnitBreakdown) {
        pollingUnitBreakdown = await Vote.findAll({
          where: {
            electionId,
            candidateId: candidate.id,
          },
          attributes: ['pollingUnitId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'voteCount']],
          include: [
            {
              model: PollingUnit,
              as: 'pollingUnit',
              attributes: ['id', 'name', 'code'],
            },
          ],
          group: ['pollingUnitId'],
          order: [[Sequelize.literal('voteCount'), 'DESC']],
        });
      }

      return {
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        partyAffiliation: candidate.partyName,
        totalVotes,
        webVotes,
        ussdVotes,
        pollingUnitBreakdown,
      };
    }),
  );

  // Sort by total votes in descending order
  candidateResults.sort((a, b) => b.totalVotes - a.totalVotes);

  // Get total votes cast
  const totalVotesCast = candidateResults.reduce((sum, candidate) => sum + candidate.totalVotes, 0);

  // Calculate percentages
  const resultsWithPercentages = candidateResults.map(result => ({
    ...result,
    percentage: totalVotesCast > 0 ? (result.totalVotes / totalVotesCast) * 100 : 0,
  }));

  return {
    electionId: election.id,
    electionName: election.electionName,
    electionType: election.electionType,
    status: election.status,
    totalVotesCast,
    results: resultsWithPercentages,
  };
};

/**
 * Get real-time voting statistics
 */
export const getRealTimeVotingStats = async (): Promise<any> => {
  // Get active elections
  const activeElections = await Election.findAll({
    where: {
      status: 'active',
      startDate: {
        [Op.lte]: new Date(),
      },
      endDate: {
        [Op.gte]: new Date(),
      },
    },
  });

  // Get stats for each active election
  const electionStats = await Promise.all(
    activeElections.map(async election => {
      // Get total votes cast
      const totalVotesCast = await Vote.count({
        where: {
          electionId: election.id,
          voteTimestamp: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      // Get votes by hour for the last 24 hours
      const hourlyVotes = await Vote.findAll({
        where: {
          electionId: election.id,
          voteTimestamp: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        attributes: [
          [Sequelize.fn('date_trunc', 'hour', Sequelize.col('voteTimestamp')), 'hour'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'voteCount'],
        ],
        group: ['hour'],
        order: [[Sequelize.col('hour'), 'ASC']],
      });

      return {
        electionId: election.id,
        electionName: election.electionName,
        electionType: election.electionType,
        totalVotesCast,
        hourlyVotes,
      };
    }),
  );

  return {
    timestamp: new Date(),
    activeElections: electionStats,
  };
};
