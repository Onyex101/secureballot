import { QueryTypes } from 'sequelize';
import db from '../db/models';
import { logger } from '../config/logger';

interface VotingStatistics {
  totalRegisteredVoters: number;
  totalVotesCast: number;
  validVotes: number;
  invalidVotes: number;
  voterTurnoutPercentage: number;
  validVotePercentage: number;
  invalidVotePercentage: number;
}

interface CandidateStatistic {
  candidateId: string;
  name: string;
  party: string;
  partyCode: string;
  votes: number;
  percentage: number;
  rank: number;
}

interface PollingUnitStatistics {
  totalPollingUnits: number;
  pollingUnitsReported: number;
  reportingPercentage: number;
  pollingUnitsNotReported: number;
  averageVotesPerPollingUnit: number;
}

interface ElectionStatistics {
  electionId: string;
  electionName: string;
  electionType: string;
  status: string;
  lastUpdated: string;
  votingStatistics: VotingStatistics;
  candidateStatistics: CandidateStatistic[];
  pollingUnitStatistics: PollingUnitStatistics;
}

export class StatisticsService {
  /**
   * Get comprehensive election statistics
   */
  public async getElectionStatistics(electionId: string): Promise<ElectionStatistics> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(electionId)) {
        throw new Error('Invalid election ID format');
      }

      // Get basic election info
      const electionInfo = await this.getElectionInfo(electionId);

      // Get voting statistics
      const votingStats = await this.getVotingStatistics(electionId);

      // Get candidate statistics
      const candidateStats = await this.getCandidateStatistics(electionId);

      // Get polling unit statistics
      const pollingUnitStats = await this.getPollingUnitStatistics(electionId);

      return {
        electionId,
        electionName: electionInfo.name,
        electionType: electionInfo.type,
        status: electionInfo.status,
        lastUpdated: new Date().toISOString(),
        votingStatistics: votingStats,
        candidateStatistics: candidateStats,
        pollingUnitStatistics: pollingUnitStats,
      };
    } catch (error) {
      logger.error('Error getting election statistics:', error);
      throw new Error(`Failed to get election statistics: ${(error as Error).message}`);
    }
  }

  /**
   * Get basic election information
   */
  private async getElectionInfo(
    electionId: string,
  ): Promise<{ name: string; type: string; status: string }> {
    try {
      const query = `
        SELECT election_name as name, election_type as type, status
        FROM elections 
        WHERE id = :electionId
      `;

      const result = (await db.sequelize.query(query, {
        replacements: { electionId },
        type: QueryTypes.SELECT,
      })) as Array<{ name: string; type: string; status: string }>;

      if (result.length === 0) {
        throw new Error('Election not found');
      }

      return result[0];
    } catch (error) {
      logger.error('Error getting election info:', error);
      throw error;
    }
  }

  /**
   * Get voting statistics using raw SQL
   */
  private async getVotingStatistics(electionId: string): Promise<VotingStatistics> {
    try {
      // Get total votes cast
      const voteCountQuery = `
        SELECT COUNT(*) as total_votes_cast
        FROM votes 
        WHERE election_id = :electionId
      `;

      const voteCountResult = (await db.sequelize.query(voteCountQuery, {
        replacements: { electionId },
        type: QueryTypes.SELECT,
      })) as Array<{ total_votes_cast: number }>;

      const totalVotesCast = parseInt(voteCountResult[0]?.total_votes_cast?.toString() || '0');

      // Get registered voters count (simplified - count all active voters)
      const votersQuery = `
        SELECT COUNT(*) as registered_voters
        FROM voters 
        WHERE is_active = true
      `;

      const votersResult = (await db.sequelize.query(votersQuery, {
        type: QueryTypes.SELECT,
      })) as Array<{ registered_voters: number }>;

      const totalRegisteredVoters = parseInt(votersResult[0]?.registered_voters?.toString() || '0');

      // For now, assume all votes are valid (can be enhanced later)
      const validVotes = totalVotesCast;
      const invalidVotes = 0;

      const voterTurnoutPercentage =
        totalRegisteredVoters > 0
          ? Math.round((totalVotesCast / totalRegisteredVoters) * 10000) / 100
          : 0;

      const validVotePercentage =
        totalVotesCast > 0 ? Math.round((validVotes / totalVotesCast) * 10000) / 100 : 0;

      const invalidVotePercentage =
        totalVotesCast > 0 ? Math.round((invalidVotes / totalVotesCast) * 10000) / 100 : 0;

      return {
        totalRegisteredVoters,
        totalVotesCast,
        validVotes,
        invalidVotes,
        voterTurnoutPercentage,
        validVotePercentage,
        invalidVotePercentage,
      };
    } catch (error) {
      logger.error('Error getting voting statistics:', error);
      throw error;
    }
  }

  /**
   * Get candidate statistics using raw SQL
   */
  private async getCandidateStatistics(electionId: string): Promise<CandidateStatistic[]> {
    try {
      const query = `
        SELECT 
          c.id as candidate_id,
          c.full_name as name,
          c.party_name as party,
          c.party_code as party_code,
          COUNT(v.id) as votes
        FROM candidates c
        LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = :electionId
        WHERE c.election_id = :electionId
        GROUP BY c.id, c.full_name, c.party_name, c.party_code
        ORDER BY COUNT(v.id) DESC
      `;

      const results = (await db.sequelize.query(query, {
        replacements: { electionId },
        type: QueryTypes.SELECT,
      })) as Array<{
        candidate_id: string;
        name: string;
        party: string;
        party_code: string;
        votes: number;
      }>;

      // Calculate total votes for percentage calculation
      const totalVotes = results.reduce(
        (sum, candidate) => sum + parseInt(candidate.votes.toString()),
        0,
      );

      // Convert to expected format and calculate percentages
      return results.map((candidate, index) => {
        const votes = parseInt(candidate.votes.toString());
        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 10000) / 100 : 0;

        return {
          candidateId: candidate.candidate_id,
          name: candidate.name || 'Unknown Candidate',
          party: candidate.party || 'Independent',
          partyCode: candidate.party_code || 'IND',
          votes,
          percentage,
          rank: index + 1,
        };
      });
    } catch (error) {
      logger.error('Error getting candidate statistics:', error);
      throw error;
    }
  }

  /**
   * Get polling unit statistics using raw SQL
   */
  private async getPollingUnitStatistics(electionId: string): Promise<PollingUnitStatistics> {
    try {
      // Get total active polling units
      const totalPollingUnitsQuery = `
        SELECT COUNT(*) as total_polling_units
        FROM polling_units 
        WHERE is_active = true
      `;

      const totalResult = (await db.sequelize.query(totalPollingUnitsQuery, {
        type: QueryTypes.SELECT,
      })) as Array<{ total_polling_units: number }>;

      const totalPollingUnits = parseInt(totalResult[0]?.total_polling_units?.toString() || '0');

      // Get polling units with votes reported for this election
      const reportedPollingUnitsQuery = `
        SELECT COUNT(DISTINCT v.polling_unit_id) as reported_polling_units,
               COUNT(v.id) as total_votes
        FROM votes v
        WHERE v.election_id = :electionId AND v.polling_unit_id IS NOT NULL
      `;

      const reportedResult = (await db.sequelize.query(reportedPollingUnitsQuery, {
        replacements: { electionId },
        type: QueryTypes.SELECT,
      })) as Array<{ reported_polling_units: number; total_votes: number }>;

      const pollingUnitsReported = parseInt(
        reportedResult[0]?.reported_polling_units?.toString() || '0',
      );
      const totalVotes = parseInt(reportedResult[0]?.total_votes?.toString() || '0');

      const reportingPercentage =
        totalPollingUnits > 0
          ? Math.round((pollingUnitsReported / totalPollingUnits) * 10000) / 100
          : 0;

      const pollingUnitsNotReported = totalPollingUnits - pollingUnitsReported;

      const averageVotesPerPollingUnit =
        pollingUnitsReported > 0 ? Math.round((totalVotes / pollingUnitsReported) * 100) / 100 : 0;

      return {
        totalPollingUnits,
        pollingUnitsReported,
        reportingPercentage,
        pollingUnitsNotReported,
        averageVotesPerPollingUnit,
      };
    } catch (error) {
      logger.error('Error getting polling unit statistics:', error);
      throw error;
    }
  }

  /**
   * Get real-time statistics for live updates
   */
  public async getRealTimeStatistics(electionId: string): Promise<{
    totalVotes: number;
    lastVoteTimestamp: Date | null;
    activePollingUnits: number;
  }> {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(electionId)) {
        throw new Error('Invalid election ID format');
      }

      const query = `
        SELECT 
          COUNT(v.id) as total_votes,
          MAX(v.vote_timestamp) as last_vote_timestamp,
          COUNT(DISTINCT v.polling_unit_id) as active_polling_units
        FROM votes v
        WHERE v.election_id = :electionId
      `;

      const result = (await db.sequelize.query(query, {
        replacements: { electionId },
        type: QueryTypes.SELECT,
      })) as Array<{
        total_votes: number;
        last_vote_timestamp: Date | null;
        active_polling_units: number;
      }>;

      if (result.length === 0) {
        return {
          totalVotes: 0,
          lastVoteTimestamp: null,
          activePollingUnits: 0,
        };
      }

      return {
        totalVotes: parseInt(result[0].total_votes?.toString() || '0'),
        lastVoteTimestamp: result[0].last_vote_timestamp,
        activePollingUnits: parseInt(result[0].active_polling_units?.toString() || '0'),
      };
    } catch (error) {
      logger.error('Error getting real-time statistics:', error);
      throw new Error(`Failed to get real-time statistics: ${(error as Error).message}`);
    }
  }
}

export const statisticsService = new StatisticsService();

// Legacy method exports for backward compatibility
export const getElectionStatistics = (electionId: string) =>
  statisticsService.getElectionStatistics(electionId);

export const getElectionResults = async (electionId: string, includeBreakdown: boolean = false) => {
  const stats = await statisticsService.getElectionStatistics(electionId);
  return {
    electionId: stats.electionId,
    electionName: stats.electionName,
    electionType: stats.electionType,
    status: stats.status,
    totalVotesCast: stats.votingStatistics.totalVotesCast,
    results: stats.candidateStatistics.map(candidate => ({
      candidateId: candidate.candidateId,
      candidateName: candidate.name,
      partyAffiliation: candidate.party,
      totalVotes: candidate.votes,
      percentage: candidate.percentage,
      pollingUnitBreakdown: includeBreakdown ? [] : null,
    })),
  };
};

export const getRealTimeVotingStats = () => {
  return {
    timestamp: new Date(),
    activeElections: [],
    totalVotesToday: 0,
  };
};
