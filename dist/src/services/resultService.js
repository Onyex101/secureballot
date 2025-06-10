"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getElectionStatistics = exports.getResultsByRegion = exports.getLiveResults = void 0;
const sequelize_1 = require("sequelize");
const Election_1 = __importDefault(require("../db/models/Election"));
const Candidate_1 = __importDefault(require("../db/models/Candidate"));
const Vote_1 = __importDefault(require("../db/models/Vote"));
const PollingUnit_1 = __importDefault(require("../db/models/PollingUnit"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
const Election_2 = require("../db/models/Election");
const ElectionStats_1 = __importDefault(require("../db/models/ElectionStats"));
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Get live election results
 */
const getLiveResults = async (electionId) => {
    // Get the election
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new errorHandler_1.ApiError(404, 'Election not found');
    }
    // Check if election is active or completed
    if (![Election_2.ElectionStatus.ACTIVE, Election_2.ElectionStatus.COMPLETED].includes(election.status)) {
        throw new errorHandler_1.ApiError(400, `Election is ${election.status.toLowerCase()}, results not available`);
    }
    // Get all candidates for this election
    const candidates = (await Candidate_1.default.findAll({
        where: { electionId },
        attributes: ['id', 'fullName', 'partyName', 'partyCode'],
    }));
    // Get registered voters count (potentially needs refinement based on election eligibility)
    const registeredVoters = await Voter_1.default.count({
        where: { isActive: true },
        // TODO: Add specific election eligibility criteria here if needed
    });
    // Get total votes for this election
    const totalVotes = await Vote_1.default.count({
        where: { electionId },
    });
    // TODO: Calculate valid/invalid votes if required for ElectionStats
    const validVotes = totalVotes; // Placeholder
    const invalidVotes = 0; // Placeholder
    // Get count of votes by candidate
    const candidateVoteCounts = (await Vote_1.default.findAll({
        where: { electionId },
        attributes: ['candidateId', [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'voteCount']],
        group: ['candidateId'],
        raw: true,
    }));
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
    const turnoutPercentage = registeredVoters > 0 ? Math.round((totalVotes / registeredVoters) * 10000) / 100 : 0;
    // Save or update election stats using correct fields
    const statsData = {
        electionId,
        totalVotes,
        validVotes,
        invalidVotes,
        turnoutPercentage,
        lastUpdated: new Date(),
    };
    await ElectionStats_1.default.upsert(statsData);
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
exports.getLiveResults = getLiveResults;
/**
 * Get results by region
 */
const getResultsByRegion = async (electionId, regionType, regionCode) => {
    // Get the election
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new errorHandler_1.ApiError(404, 'Election not found');
    }
    // Check if election is active or completed
    if (![Election_2.ElectionStatus.ACTIVE, Election_2.ElectionStatus.COMPLETED].includes(election.status)) {
        throw new errorHandler_1.ApiError(400, `Election is ${election.status.toLowerCase()}, results not available`);
    }
    // Get all candidates for this election
    const candidates = (await Candidate_1.default.findAll({
        where: { electionId },
        attributes: ['id', 'fullName', 'partyName', 'partyCode'],
    }));
    // Define the region field based on regionType
    const regionField = regionType;
    // Build the where clause for filtering polling units
    const pollingUnitWhere = {};
    if (regionCode) {
        pollingUnitWhere[regionField] = regionCode;
    }
    // Get distinct regions (states, lgas, or wards) from polling units relevant to the filter
    const regionsData = await PollingUnit_1.default.findAll({
        where: pollingUnitWhere,
        attributes: [[(0, sequelize_1.fn)('DISTINCT', (0, sequelize_1.col)(regionField)), 'regionIdentifier']],
        group: [regionField],
        raw: true,
    });
    const regionIdentifiers = regionsData.map((r) => r.regionIdentifier);
    // Get results for each distinct region identifier
    const regions = await Promise.all(regionIdentifiers.map(async (identifier) => {
        // Get votes specifically for polling units in this region identifier
        const votesInRegion = (await Vote_1.default.findAll({
            where: { electionId },
            include: [
                {
                    model: PollingUnit_1.default,
                    as: 'polling_unit',
                    where: { [regionField]: identifier },
                    attributes: [],
                    required: true,
                },
            ],
            attributes: ['candidateId', [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('vote.id')), 'voteCount']],
            group: ['candidateId'],
            raw: true,
        }));
        // Calculate total votes in this region
        const totalVotesInRegion = votesInRegion.reduce((sum, vote) => sum + parseInt(vote.voteCount, 10), 0);
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
    }));
    return {
        electionId,
        electionName: election.electionName,
        regionType,
        regions,
        lastUpdated: new Date(),
    };
};
exports.getResultsByRegion = getResultsByRegion;
/**
 * Get election statistics
 */
const getElectionStatistics = async (electionId) => {
    const election = await Election_1.default.findByPk(electionId);
    if (!election) {
        throw new errorHandler_1.ApiError(404, 'Election not found');
    }
    let stats = await ElectionStats_1.default.findOne({
        where: { electionId },
    });
    // If stats don't exist or are stale, recalculate and save
    if (!stats) {
        const _liveResults = await (0, exports.getLiveResults)(electionId);
        stats = await ElectionStats_1.default.findOne({ where: { electionId } });
        if (!stats) {
            throw new errorHandler_1.ApiError(500, 'Failed to create or find election statistics after calculation.');
        }
    }
    return stats;
};
exports.getElectionStatistics = getElectionStatistics;
//# sourceMappingURL=resultService.js.map