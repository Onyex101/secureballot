import { fn, col } from 'sequelize';
import Election from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import Vote from '../db/models/Vote';
import PollingUnit from '../db/models/PollingUnit';
import Voter from '../db/models/Voter';
import { ElectionStatus } from '../db/models/Election';
import ElectionStats from '../db/models/ElectionStats';
import { ApiError } from '../middleware/errorHandler';

// Define types for raw SQL results
interface VoteCountResult {
  candidateId: string;
  voteCount: string;
  [key: string]: any;
}

// Define Candidate with party info
interface CandidateWithParty extends Candidate {
  partyName: string;
  partyCode: string;
}

/**
 * Get live election results
 */
export const getLiveResults = async (electionId: string) => {
  // Get the election
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  // Check if election is active or completed
  if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
    throw new ApiError(400, `Election is ${election.status.toLowerCase()}, results not available`);
  }

  // Get all candidates for this election
  const candidates = (await Candidate.findAll({
    where: { electionId },
    attributes: ['id', 'fullName', 'partyName', 'partyCode'],
  })) as CandidateWithParty[];

  // Get registered voters count (potentially needs refinement based on election eligibility)
  const registeredVoters = await Voter.count({
    where: { isActive: true },
    // TODO: Add specific election eligibility criteria here if needed
  });

  // Get total votes for this election
  const totalVotes = await Vote.count({
    where: { electionId },
  });

  // TODO: Calculate valid/invalid votes if required for ElectionStats
  const validVotes = totalVotes; // Placeholder
  const invalidVotes = 0; // Placeholder

  // Get count of votes by candidate
  const candidateVoteCounts = (await Vote.findAll({
    where: { electionId },
    attributes: ['candidateId', [fn('COUNT', col('id')), 'voteCount']],
    group: ['candidateId'],
    raw: true,
  })) as unknown as VoteCountResult[];

  // Map vote counts to candidates
  const candidateResults = candidates.map(candidate => {
    const voteData = candidateVoteCounts.find(vc => vc.candidateId === candidate.id);
    const voteCount = voteData ? parseInt(voteData.voteCount, 10) : 0;
    const percentage = validVotes > 0 ? (voteCount / validVotes) * 100 : 0;

    return {
      id: candidate.id,
      name: candidate.fullName,
      partyName: candidate.partyName,
      partyCode: candidate.partyCode,
      votes: voteCount,
      percentage: Math.round(percentage * 100) / 100,
    };
  });

  // Sort by votes (descending)
  candidateResults.sort((a, b) => b.votes - a.votes);

  // Calculate turnout percentage (based on registered voters)
  const turnoutPercentage =
    registeredVoters > 0 ? Math.round((totalVotes / registeredVoters) * 10000) / 100 : 0;

  // Save or update election stats using correct fields
  const statsData = {
    electionId,
    totalVotes,
    validVotes,
    invalidVotes,
    turnoutPercentage,
    lastUpdated: new Date(),
  };

  await ElectionStats.upsert(statsData);

  return {
    electionId,
    electionName: election.electionName,
    totalVotes,
    validVotes,
    invalidVotes,
    registeredVoters,
    turnoutPercentage,
    candidates: candidateResults,
    lastUpdated: statsData.lastUpdated,
  };
};

/**
 * Get results by region
 */
export const getResultsByRegion = async (
  electionId: string,
  regionType: 'state' | 'lga' | 'ward',
  regionCode?: string,
) => {
  // Get the election
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  // Check if election is active or completed
  if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
    throw new ApiError(400, `Election is ${election.status.toLowerCase()}, results not available`);
  }

  // Get all candidates for this election
  const candidates = (await Candidate.findAll({
    where: { electionId },
    attributes: ['id', 'fullName', 'partyName', 'partyCode'],
  })) as CandidateWithParty[];

  // Define the region field based on regionType
  const regionField = regionType;

  // Build the where clause for filtering polling units
  const pollingUnitWhere: any = {};
  if (regionCode) {
    pollingUnitWhere[regionField] = regionCode;
  }

  // Get distinct regions (states, lgas, or wards) from polling units relevant to the filter
  const regionsData = await PollingUnit.findAll({
    where: pollingUnitWhere,
    attributes: [[fn('DISTINCT', col(regionField)), 'regionIdentifier']],
    group: [regionField],
    raw: true,
  });

  const regionIdentifiers = regionsData.map((r: any) => r.regionIdentifier);

  // Get results for each distinct region identifier
  const regions = await Promise.all(
    regionIdentifiers.map(async (identifier: string) => {
      // Get votes specifically for polling units in this region identifier
      const votesInRegion = (await Vote.findAll({
        where: { electionId },
        include: [
          {
            model: PollingUnit,
            as: 'pollingUnit',
            where: { [regionField]: identifier },
            attributes: [],
            required: true,
          },
        ],
        attributes: ['candidateId', [fn('COUNT', col('id')), 'voteCount']],
        group: ['candidateId'],
        raw: true,
      })) as unknown as VoteCountResult[];

      // Calculate total votes in this region
      const totalVotesInRegion = votesInRegion.reduce(
        (sum, vote) => sum + parseInt(vote.voteCount, 10),
        0,
      );

      // Map results to candidates
      const candidateResults = candidates.map(candidate => {
        const voteData = votesInRegion.find(v => v.candidateId === candidate.id);
        const voteCount = voteData ? parseInt(voteData.voteCount, 10) : 0;
        const percentage = totalVotesInRegion > 0 ? (voteCount / totalVotesInRegion) * 100 : 0;

        return {
          id: candidate.id,
          name: candidate.fullName,
          partyName: candidate.partyName,
          partyCode: candidate.partyCode,
          votes: voteCount,
          percentage: Math.round(percentage * 100) / 100,
        };
      });

      // Sort by votes (descending)
      candidateResults.sort((a, b) => b.votes - a.votes);

      return {
        name: identifier,
        code: identifier,
        totalVotes: totalVotesInRegion,
        candidates: candidateResults,
      };
    }),
  );

  return {
    electionId,
    electionName: election.electionName,
    regionType,
    regions,
    lastUpdated: new Date(),
  };
};

/**
 * Get election statistics
 */
export const getElectionStatistics = async (electionId: string): Promise<ElectionStats> => {
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  let stats = await ElectionStats.findOne({
    where: { electionId },
  });

  // If stats don't exist or are stale, recalculate and save
  if (!stats) {
    const _liveResults = await getLiveResults(electionId);

    stats = await ElectionStats.findOne({ where: { electionId } });

    if (!stats) {
      throw new ApiError(500, 'Failed to create or find election statistics after calculation.');
    }
  }

  return stats;
};
