"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRealTimeVotingStats = exports.getElectionResults = exports.getElectionStatistics = exports.statisticsService = exports.StatisticsService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = __importDefault(require("../db/models"));
const logger_1 = require("../config/logger");
class StatisticsService {
    /**
     * Get comprehensive election statistics
     */
    async getElectionStatistics(electionId) {
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
        }
        catch (error) {
            logger_1.logger.error('Error getting election statistics:', error);
            throw new Error(`Failed to get election statistics: ${error.message}`);
        }
    }
    /**
     * Get basic election information
     */
    async getElectionInfo(electionId) {
        try {
            const query = `
        SELECT election_name as name, election_type as type, status
        FROM elections 
        WHERE id = :electionId;
      `;
            const result = (await models_1.default.sequelize.query(query, {
                replacements: { electionId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            if (result.length === 0) {
                throw new Error('Election not found');
            }
            return result[0];
        }
        catch (error) {
            logger_1.logger.error('Error getting election info:', error);
            throw error;
        }
    }
    /**
     * Get voting statistics using raw SQL
     */
    async getVotingStatistics(electionId) {
        try {
            // Get total votes cast
            const voteCountQuery = `
        SELECT COUNT(*) as total_votes_cast
        FROM votes 
        WHERE election_id = :electionId;
      `;
            const voteCountResult = (await models_1.default.sequelize.query(voteCountQuery, {
                replacements: { electionId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            const totalVotesCast = parseInt(voteCountResult[0]?.total_votes_cast?.toString() || '0');
            // Get registered voters count (simplified - count all active voters)
            const votersQuery = `
        SELECT COUNT(*) as registered_voters
        FROM voters 
        WHERE is_active = true;
      `;
            const votersResult = (await models_1.default.sequelize.query(votersQuery, {
                type: sequelize_1.QueryTypes.SELECT,
            }));
            const totalRegisteredVoters = parseInt(votersResult[0]?.registered_voters?.toString() || '0');
            // For now, assume all votes are valid (can be enhanced later)
            const validVotes = totalVotesCast;
            const invalidVotes = 0;
            const voterTurnoutPercentage = totalRegisteredVoters > 0
                ? Math.round((totalVotesCast / totalRegisteredVoters) * 10000) / 100
                : 0;
            const validVotePercentage = totalVotesCast > 0 ? Math.round((validVotes / totalVotesCast) * 10000) / 100 : 0;
            const invalidVotePercentage = totalVotesCast > 0 ? Math.round((invalidVotes / totalVotesCast) * 10000) / 100 : 0;
            return {
                totalRegisteredVoters,
                totalVotesCast,
                validVotes,
                invalidVotes,
                voterTurnoutPercentage,
                validVotePercentage,
                invalidVotePercentage,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting voting statistics:', error);
            throw error;
        }
    }
    /**
     * Get candidate statistics using raw SQL
     */
    async getCandidateStatistics(electionId) {
        try {
            const query = `
        SELECT 
          c.id as candidate_id,
          c.full_name as name,
          c.party_name as party,
          c.party_code as party_code,
          c.manifesto as manifesto,
          COUNT(v.id) as votes
        FROM candidates c
        LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = :electionId
        WHERE c.election_id = :electionId
        GROUP BY c.id, c.full_name, c.party_name, c.party_code, c.manifesto
        ORDER BY COUNT(v.id) DESC;
      `;
            const results = (await models_1.default.sequelize.query(query, {
                replacements: { electionId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            // Calculate total votes for percentage calculation
            const totalVotes = results.reduce((sum, candidate) => sum + parseInt(candidate.votes.toString()), 0);
            // Convert to expected format and calculate percentages
            return results.map((candidate, index) => {
                const votes = parseInt(candidate.votes.toString());
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 10000) / 100 : 0;
                return {
                    candidateId: candidate.candidate_id,
                    name: candidate.name || 'Unknown Candidate',
                    party: candidate.party || 'Independent',
                    partyCode: candidate.party_code || 'IND',
                    manifesto: candidate.manifesto || '',
                    votes,
                    percentage,
                    rank: index + 1,
                };
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting candidate statistics:', error);
            throw error;
        }
    }
    /**
     * Get polling unit statistics using raw SQL
     */
    async getPollingUnitStatistics(electionId) {
        try {
            // Get total active polling units
            const totalPollingUnitsQuery = `
        SELECT COUNT(*) as total_polling_units
        FROM polling_units 
        WHERE is_active = true;
      `;
            const totalResult = (await models_1.default.sequelize.query(totalPollingUnitsQuery, {
                type: sequelize_1.QueryTypes.SELECT,
            }));
            const totalPollingUnits = parseInt(totalResult[0]?.total_polling_units?.toString() || '0');
            // Get polling units with votes reported for this election
            const reportedPollingUnitsQuery = `
        SELECT COUNT(DISTINCT v.polling_unit_id) as reported_polling_units,
               COUNT(v.id) as total_votes
        FROM votes v
        WHERE v.election_id = :electionId AND v.polling_unit_id IS NOT NULL;
      `;
            const reportedResult = (await models_1.default.sequelize.query(reportedPollingUnitsQuery, {
                replacements: { electionId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            const pollingUnitsReported = parseInt(reportedResult[0]?.reported_polling_units?.toString() || '0');
            const totalVotes = parseInt(reportedResult[0]?.total_votes?.toString() || '0');
            const reportingPercentage = totalPollingUnits > 0
                ? Math.round((pollingUnitsReported / totalPollingUnits) * 10000) / 100
                : 0;
            const pollingUnitsNotReported = totalPollingUnits - pollingUnitsReported;
            const averageVotesPerPollingUnit = pollingUnitsReported > 0 ? Math.round((totalVotes / pollingUnitsReported) * 100) / 100 : 0;
            return {
                totalPollingUnits,
                pollingUnitsReported,
                reportingPercentage,
                pollingUnitsNotReported,
                averageVotesPerPollingUnit,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting polling unit statistics:', error);
            throw error;
        }
    }
    /**
     * Get real-time statistics for live updates
     */
    async getRealTimeStatistics(electionId) {
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
        WHERE v.election_id = :electionId;
      `;
            const result = (await models_1.default.sequelize.query(query, {
                replacements: { electionId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
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
        }
        catch (error) {
            logger_1.logger.error('Error getting real-time statistics:', error);
            throw new Error(`Failed to get real-time statistics: ${error.message}`);
        }
    }
}
exports.StatisticsService = StatisticsService;
exports.statisticsService = new StatisticsService();
// Legacy method exports for backward compatibility
const getElectionStatistics = (electionId) => exports.statisticsService.getElectionStatistics(electionId);
exports.getElectionStatistics = getElectionStatistics;
const getElectionResults = async (electionId, includeBreakdown = false) => {
    const stats = await exports.statisticsService.getElectionStatistics(electionId);
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
exports.getElectionResults = getElectionResults;
const getRealTimeVotingStats = () => {
    return {
        timestamp: new Date(),
        activeElections: [],
        totalVotesToday: 0,
    };
};
exports.getRealTimeVotingStats = getRealTimeVotingStats;
//# sourceMappingURL=statisticsService.js.map