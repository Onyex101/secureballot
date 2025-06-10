"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRealTimeVotingStats = exports.getElectionResults = exports.getElectionStatistics = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("sequelize");
const Election_1 = __importDefault(require("../db/models/Election"));
const Vote_1 = __importDefault(require("../db/models/Vote"));
const Candidate_1 = __importDefault(require("../db/models/Candidate"));
const PollingUnit_1 = __importDefault(require("../db/models/PollingUnit"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
const UssdVote_1 = __importDefault(require("../db/models/UssdVote"));
/**
 * Get election statistics
 */
const getElectionStatistics = async (electionId) => {
    // Get the election
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new Error('Election not found');
    }
    // Get total registered voters
    const totalRegisteredVoters = await Voter_1.default.count({
        where: sequelize_2.Sequelize.literal('polling_unit_code IS NOT NULL'),
    });
    // Get total votes cast
    const totalVotesCast = await Vote_1.default.count({
        where: { electionId },
    });
    // Get total USSD votes
    const totalUssdVotes = await UssdVote_1.default.count({
        where: { electionId },
    });
    // Get votes by polling unit
    const votesByPollingUnit = await Vote_1.default.findAll({
        where: { electionId },
        attributes: ['pollingUnitId', [sequelize_2.Sequelize.fn('COUNT', sequelize_2.Sequelize.col('id')), 'voteCount']],
        include: [
            {
                model: PollingUnit_1.default,
                as: 'pollingUnit',
                attributes: ['id', 'name', 'code'],
            },
        ],
        group: ['pollingUnitId'],
        order: [[sequelize_2.Sequelize.literal('voteCount'), 'DESC']],
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
exports.getElectionStatistics = getElectionStatistics;
/**
 * Get election results
 */
const getElectionResults = async (electionId, includePollingUnitBreakdown = false) => {
    // Get the election
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new Error('Election not found');
    }
    // Get all candidates for this election
    const candidates = await Candidate_1.default.findAll({
        where: { electionId },
        attributes: ['id', 'fullName', 'partyName'],
    });
    // Get vote counts for each candidate
    const candidateResults = await Promise.all(candidates.map(async (candidate) => {
        // Count web votes
        const webVotes = await Vote_1.default.count({
            where: {
                electionId,
                candidateId: candidate.id,
            },
        });
        // Count USSD votes
        const ussdVotes = await UssdVote_1.default.count({
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
            pollingUnitBreakdown = await Vote_1.default.findAll({
                where: {
                    electionId,
                    candidateId: candidate.id,
                },
                attributes: ['pollingUnitId', [sequelize_2.Sequelize.fn('COUNT', sequelize_2.Sequelize.col('id')), 'voteCount']],
                include: [
                    {
                        model: PollingUnit_1.default,
                        as: 'pollingUnit',
                        attributes: ['id', 'name', 'code'],
                    },
                ],
                group: ['pollingUnitId'],
                order: [[sequelize_2.Sequelize.literal('voteCount'), 'DESC']],
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
    }));
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
exports.getElectionResults = getElectionResults;
/**
 * Get real-time voting statistics
 */
const getRealTimeVotingStats = async () => {
    // Get active elections
    const activeElections = await Election_1.default.findAll({
        where: {
            status: 'active',
            startDate: {
                [sequelize_1.Op.lte]: new Date(),
            },
            endDate: {
                [sequelize_1.Op.gte]: new Date(),
            },
        },
    });
    // Get stats for each active election
    const electionStats = await Promise.all(activeElections.map(async (election) => {
        // Get total votes cast
        const totalVotesCast = await Vote_1.default.count({
            where: {
                electionId: election.id,
                voteTimestamp: {
                    [sequelize_1.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
            },
        });
        // Get votes by hour for the last 24 hours
        const hourlyVotes = await Vote_1.default.findAll({
            where: {
                electionId: election.id,
                voteTimestamp: {
                    [sequelize_1.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
            attributes: [
                [sequelize_2.Sequelize.fn('date_trunc', 'hour', sequelize_2.Sequelize.col('voteTimestamp')), 'hour'],
                [sequelize_2.Sequelize.fn('COUNT', sequelize_2.Sequelize.col('id')), 'voteCount'],
            ],
            group: ['hour'],
            order: [[sequelize_2.Sequelize.col('hour'), 'ASC']],
        });
        return {
            electionId: election.id,
            electionName: election.electionName,
            electionType: election.electionType,
            totalVotesCast,
            hourlyVotes,
        };
    }));
    return {
        timestamp: new Date(),
        activeElections: electionStats,
    };
};
exports.getRealTimeVotingStats = getRealTimeVotingStats;
//# sourceMappingURL=statisticsService.js.map