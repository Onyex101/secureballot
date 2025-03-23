import { fn, col } from 'sequelize';
import Election from '../db/models/Election';
import Candidate from '../db/models/Candidate';
import Vote, { VoteSource } from '../db/models/Vote';
import UssdVote from '../db/models/UssdVote';
import PollingUnit from '../db/models/PollingUnit';
import Voter from '../db/models/Voter';
import { ElectionStatus } from '../db/models/Election';
import ElectionStats from '../db/models/ElectionStats';

// Define types for raw SQL results
interface VoteCountResult {
  candidateId: string;
  voteCount: string;
  [key: string]: any;
}

// Define types for stats object
interface ElectionStatsData {
  electionId: string;
  totalVotes: number;
  registeredVoters: number;
  turnoutPercentage: number;
  lastUpdated: Date;
}

// Define Candidate with partyAffiliation
interface CandidateWithPartyAffiliation extends Candidate {
  partyAffiliation: string;
}

/**
 * Get live election results
 */
export const getLiveResults = async (electionId: string) => {
  // Get the election
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new Error('Election not found');
  }

  // Check if election is active or completed
  if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
    throw new Error(`Election is ${election.status.toLowerCase()}, results not available`);
  }

  // Get all candidates for this election
  const candidates = (await Candidate.findAll({
    where: { electionId },
    attributes: ['id', 'fullName', 'partyAffiliation'],
  })) as unknown as CandidateWithPartyAffiliation[];

  // Get registered voters count (those eligible for this election)
  const registeredVoters = await Voter.count({
    where: { isActive: true },
    // Additional eligibility criteria would be applied here based on election rules
  });

  // Get total votes for this election
  const totalVotes = await Vote.count({
    where: { electionId },
  });

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
    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

    return {
      id: candidate.id,
      name: candidate.fullName,
      party: candidate.partyAffiliation,
      votes: voteCount,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
    };
  });

  // Sort by votes (descending)
  candidateResults.sort((a, b) => b.votes - a.votes);

  // Calculate voting progress percentage
  const votingProgress =
    registeredVoters > 0 ? Math.round((totalVotes / registeredVoters) * 100) : 0;

  // Save or update election stats
  const statsData: ElectionStatsData = {
    electionId,
    totalVotes,
    registeredVoters,
    turnoutPercentage: votingProgress,
    lastUpdated: new Date(),
  };

  await ElectionStats.upsert(statsData as any);

  return {
    electionId,
    electionName: election.electionName,
    totalVotes,
    registeredVoters,
    votingProgress,
    candidates: candidateResults,
    lastUpdated: new Date(),
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
    throw new Error('Election not found');
  }

  // Check if election is active or completed
  if (![ElectionStatus.ACTIVE, ElectionStatus.COMPLETED].includes(election.status)) {
    throw new Error(`Election is ${election.status.toLowerCase()}, results not available`);
  }

  // Get all candidates for this election
  const candidates = (await Candidate.findAll({
    where: { electionId },
    attributes: ['id', 'fullName', 'partyAffiliation'],
  })) as unknown as CandidateWithPartyAffiliation[];

  // Build the query based on region type
  const whereClause: any = { electionId };

  // If regionCode is provided, filter by that region
  if (regionCode) {
    // Join with PollingUnit to filter by region
    // This assumes the PollingUnit model has fields like stateCode, lgaCode, wardCode
    whereClause['$polling_unit.' + regionType + 'Code$'] = regionCode;
  }

  // Get polling units grouped by the specified region type
  const pollingUnits = await PollingUnit.findAll({
    attributes: [
      [col(regionType + 'Code'), 'regionCode'],
      [col(regionType + 'Name'), 'regionName'],
    ],
    group: [regionType + 'Code', regionType + 'Name'],
    raw: true,
  });

  // Get results for each region
  const regions = await Promise.all(
    pollingUnits.map(async (pu: any) => {
      // Get votes in this region for this election
      const votesInRegion = (await Vote.findAll({
        where: { electionId },
        include: [
          {
            model: PollingUnit,
            as: 'polling_unit',
            where: { [regionType + 'Code']: pu.regionCode },
            attributes: [],
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
          party: candidate.partyAffiliation,
          votes: voteCount,
          percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        };
      });

      // Sort by votes (descending)
      candidateResults.sort((a, b) => b.votes - a.votes);

      return {
        name: pu.regionName,
        code: pu.regionCode,
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
export const getElectionStatistics = async (electionId: string) => {
  // Get the election
  const election = await Election.findByPk(electionId);
  if (!election) {
    throw new Error('Election not found');
  }

  // Get election stats if they exist
  let stats = (await ElectionStats.findOne({
    where: { electionId },
  })) as unknown as ElectionStatsData;

  // If stats don't exist, calculate them
  if (!stats) {
    // Get registered voters count
    const registeredVoters = await Voter.count({
      where: { isActive: true },
      // Additional eligibility criteria would be applied here
    });

    // Get total votes for this election
    const totalVotes = await Vote.count({
      where: { electionId },
    });

    // Calculate turnout percentage
    const turnoutPercentage =
      registeredVoters > 0 ? Math.round((totalVotes / registeredVoters) * 100) : 0;

    // Create stats record
    const statsData: ElectionStatsData = {
      electionId,
      totalVotes,
      registeredVoters,
      turnoutPercentage,
      lastUpdated: new Date(),
    };

    stats = (await ElectionStats.create(statsData as any)) as unknown as ElectionStatsData;
  }

  // Get votes by source (web, mobile, ussd, offline)
  const votesBySource = (await Vote.findAll({
    where: { electionId },
    attributes: ['voteSource', [fn('COUNT', col('id')), 'voteCount']],
    group: ['voteSource'],
    raw: true,
  })) as unknown as Array<{ voteSource: VoteSource; voteCount: string }>;

  // Get votes by time (hour of day)
  const votesByTime = (await Vote.findAll({
    where: { electionId },
    attributes: [
      [fn('date_trunc', 'hour', col('voteTimestamp')), 'hour'],
      [fn('COUNT', col('id')), 'voteCount'],
    ],
    group: [fn('date_trunc', 'hour', col('voteTimestamp'))],
    order: [[fn('date_trunc', 'hour', col('voteTimestamp')), 'ASC']],
    raw: true,
  })) as unknown as Array<{ hour: Date; voteCount: string }>;

  // Format votes by source
  const formattedVotesBySource = votesBySource.map(source => {
    const count = parseInt(source.voteCount, 10);
    const percentage = stats.totalVotes > 0 ? (count / stats.totalVotes) * 100 : 0;

    return {
      source: source.voteSource,
      count,
      percentage: Math.round(percentage * 100) / 100,
    };
  });

  // Format votes by time
  const formattedVotesByTime = votesByTime.map(timeSlot => {
    const hour = new Date(timeSlot.hour).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      hour,
      count: parseInt(timeSlot.voteCount, 10),
    };
  });

  return {
    electionId,
    electionName: election.electionName,
    totalRegisteredVoters: stats.registeredVoters,
    totalVotesCast: stats.totalVotes,
    turnoutPercentage: stats.turnoutPercentage,
    votesBySource: formattedVotesBySource,
    votesByTime: formattedVotesByTime,
    lastUpdated: stats.lastUpdated,
  };
};
