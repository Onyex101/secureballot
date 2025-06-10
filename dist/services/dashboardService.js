"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const electionService_1 = require("./electionService");
const resultService_1 = require("./resultService");
const voterService_1 = require("./voterService");
const ElectionStats_1 = __importDefault(require("../db/models/ElectionStats"));
const Vote_1 = __importDefault(require("../db/models/Vote"));
const Candidate_1 = __importDefault(require("../db/models/Candidate"));
const PollingUnit_1 = __importDefault(require("../db/models/PollingUnit"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
class AppError extends Error {
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
class DashboardService {
    async getComprehensiveDashboardData(request) {
        try {
            logger_1.default.info('Generating dashboard data', { electionId: request.electionId });
            const startTime = Date.now();
            let queryCount = 0;
            // Validate election exists
            const election = await (0, electionService_1.getElectionById)(request.electionId);
            queryCount++;
            if (!election) {
                throw new AppError('Election not found', 404);
            }
            // Parallel data fetching for performance
            const [liveResults, electionStats, regionalBreakdown, pollingUnitsData, votingStatus] = await Promise.all([
                this.getLiveResults(request.electionId),
                this.getElectionStats(request.electionId),
                request.includeRegionalBreakdown ? this.getRegionalBreakdown(request.electionId) : null,
                this.getPollingUnitsStats(request.electionId),
                request.userId ? this.getVotingStatus(request.electionId, request.userId) : this.getDefaultVotingStatus()
            ]);
            queryCount += 5;
            // Get registered voters count
            const totalRegisteredVoters = await Voter_1.default.count({ where: { isActive: true } });
            queryCount++;
            // Transform election data
            const electionInfo = {
                id: election.id,
                title: election.electionName,
                type: this.mapElectionType(election.electionType),
                status: this.mapElectionStatus(election.status),
                startDate: election.startDate.toISOString(),
                endDate: election.endDate.toISOString(),
                description: election.description || undefined,
                totalRegisteredVoters,
                totalPollingUnits: pollingUnitsData.total,
            };
            // Transform candidates data
            const candidates = liveResults.candidates.map((candidate, index) => ({
                id: candidate.id,
                fullName: candidate.name,
                partyName: candidate.partyName,
                partyCode: candidate.partyCode,
                votes: candidate.votes,
                percentage: candidate.percentage,
                color: this.generateColor(index),
                ranking: index + 1,
            }));
            // Overview stats
            const overview = {
                totalVotesCast: liveResults.totalVotes,
                voterTurnout: liveResults.turnoutPercentage,
                validVotes: liveResults.validVotes,
                invalidVotes: liveResults.invalidVotes,
                totalRegisteredVoters,
                pollingUnitsReported: `${pollingUnitsData.reported}/${pollingUnitsData.total}`,
                reportingPercentage: pollingUnitsData.reportingPercentage,
            };
            // Statistics
            const statistics = {
                totalVotesCast: liveResults.totalVotes,
                validVotes: liveResults.validVotes,
                invalidVotes: liveResults.invalidVotes,
                turnoutPercentage: liveResults.turnoutPercentage,
                candidateResults: liveResults.candidates.map((c) => ({
                    candidateId: c.id,
                    candidateName: c.name,
                    partyName: c.partyName,
                    partyCode: c.partyCode,
                    votes: c.votes,
                    percentage: c.percentage,
                })),
                regionalBreakdown: regionalBreakdown || [],
                demographics: await this.getDemographics(request.electionId),
                voteDistribution: liveResults.candidates.map((c) => ({
                    candidateId: c.id,
                    candidateName: c.name,
                    partyName: c.partyName,
                    partyCode: c.partyCode,
                    votes: c.votes,
                    percentage: c.percentage,
                })),
            };
            // Real-time data
            const realTime = {
                pollingUnitsReported: pollingUnitsData.reported,
                totalPollingUnits: pollingUnitsData.total,
                reportingPercentage: pollingUnitsData.reportingPercentage,
                lastUpdated: new Date().toISOString(),
                liveUpdates: request.includeRealTime ? await this.getLiveUpdates(request.electionId) : [],
                recentActivity: request.includeRealTime ? await this.getRecentActivity(request.electionId) : [],
            };
            const dashboardData = {
                election: electionInfo,
                overview,
                candidates,
                statistics,
                realTime,
                voting: votingStatus,
                metadata: {
                    dataSource: 'Secure Ballot Database',
                    generatedAt: new Date().toISOString(),
                    cacheExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    apiVersion: '1.0.0',
                    totalQueries: queryCount,
                    responseTime: Date.now() - startTime,
                },
                timestamp: new Date().toISOString(),
            };
            // Add regional data if requested
            if (request.includeRegionalBreakdown && regionalBreakdown) {
                dashboardData.regional = {
                    breakdown: regionalBreakdown,
                    turnoutByRegion: await this.getRegionalTurnout(request.electionId),
                    stateResults: await this.getStateResults(request.electionId),
                };
                queryCount += 2;
            }
            return dashboardData;
        }
        catch (error) {
            logger_1.default.error('Error in getComprehensiveDashboardData:', error, { electionId: request.electionId });
            throw error;
        }
    }
    async getLiveResults(electionId) {
        return await (0, resultService_1.getLiveResults)(electionId);
    }
    async getElectionStats(electionId) {
        return await ElectionStats_1.default.findOne({ where: { electionId } });
    }
    async getPollingUnitsStats(electionId) {
        // Get total polling units
        const total = await PollingUnit_1.default.count();
        // For now, assume all polling units have reported
        // This could be enhanced to track actual reporting status
        const reported = total;
        const reportingPercentage = total > 0 ? Math.round((reported / total) * 1000) / 10 : 0;
        return { total, reported, reportingPercentage };
    }
    async getRegionalBreakdown(electionId) {
        try {
            const regionalData = await (0, electionService_1.getVotesByGeopoliticalZones)(electionId);
            return regionalData.map((region) => ({
                regionName: region.zone,
                voteCount: region.totalVotes,
                percentage: region.percentage,
                statesReported: region.statesReported || 0,
                totalStatesInZone: region.totalStates || 0,
                turnoutPercentage: region.turnoutPercentage || 0,
                leadingParty: region.leadingParty,
            }));
        }
        catch (error) {
            logger_1.default.error('Error fetching regional breakdown:', error);
            return [];
        }
    }
    async getDemographics(electionId) {
        // This would require additional demographic data in the database
        // For now, return basic structure
        return {
            ageGroups: [],
            gender: { male: 0, female: 0 },
        };
    }
    async getLiveUpdates(electionId) {
        // This would require a separate updates/announcements table
        // For now, return empty array
        return [];
    }
    async getRecentActivity(electionId) {
        try {
            const recentVotes = await Vote_1.default.findAll({
                where: { electionId },
                include: [
                    {
                        model: PollingUnit_1.default,
                        as: 'polling_unit',
                        attributes: ['pollingUnitName', 'state', 'lga'],
                    },
                    {
                        model: Candidate_1.default,
                        as: 'candidate',
                        attributes: ['fullName', 'partyName'],
                    },
                ],
                order: [['voteTimestamp', 'DESC']],
                limit: 10,
            });
            return recentVotes.map((vote) => ({
                id: vote.id,
                timestamp: vote.voteTimestamp.toISOString(),
                source: vote.voteSource || 'web',
                pollingUnit: vote.polling_unit?.pollingUnitName || 'Unknown',
                state: vote.polling_unit?.state || 'Unknown',
                lga: vote.polling_unit?.lga || 'Unknown',
                candidate: vote.candidate?.fullName,
                party: vote.candidate?.partyName,
                activityType: 'vote_cast',
            }));
        }
        catch (error) {
            logger_1.default.error('Error fetching recent activity:', error);
            return [];
        }
    }
    async getVotingStatus(electionId, userId) {
        try {
            // Check if user has voted
            const existingVote = await Vote_1.default.findOne({
                where: { userId, electionId },
                include: [{ model: Candidate_1.default, as: 'candidate' }],
            });
            // Check eligibility
            const eligibility = await (0, voterService_1.checkVoterEligibility)(userId, electionId);
            return {
                hasVoted: !!existingVote,
                canVote: eligibility.isEligible,
                votedCandidateId: existingVote?.candidateId,
                voteTimestamp: existingVote?.voteTimestamp?.toISOString(),
                eligibilityReason: eligibility.reason || (eligibility.isEligible ? 'User is eligible to vote' : 'User is not eligible'),
            };
        }
        catch (error) {
            logger_1.default.error('Error checking voting status:', error);
            return this.getDefaultVotingStatus();
        }
    }
    getDefaultVotingStatus() {
        return {
            hasVoted: false,
            canVote: false,
            eligibilityReason: 'User authentication required',
        };
    }
    async getRegionalTurnout(electionId) {
        // This would require more sophisticated regional data aggregation
        // For now, return empty array
        return [];
    }
    async getStateResults(electionId) {
        try {
            const stateResults = await (0, resultService_1.getResultsByRegion)(electionId, 'state');
            return stateResults.regions?.map((region) => ({
                state: region.regionIdentifier,
                leadingParty: region.leadingCandidate?.partyCode || 'Unknown',
                percentage: region.leadingCandidate?.percentage || 0,
                totalVotes: region.totalVotes,
                turnoutPercentage: region.turnoutPercentage || 0,
                reportingStatus: 'partial',
            })) || [];
        }
        catch (error) {
            logger_1.default.error('Error fetching state results:', error);
            return [];
        }
    }
    mapElectionType(type) {
        const typeMap = {
            'Presidential': 'presidential',
            'Gubernatorial': 'gubernatorial',
            'HouseOfReps': 'house-of-reps',
            'Senatorial': 'senatorial',
        };
        return typeMap[type] || 'presidential';
    }
    mapElectionStatus(status) {
        const statusMap = {
            'draft': 'upcoming',
            'scheduled': 'upcoming',
            'active': 'active',
            'completed': 'completed',
            'paused': 'suspended',
            'cancelled': 'suspended',
        };
        return statusMap[status] || 'upcoming';
    }
    generateColor(index) {
        const colors = [
            '#0066CC', '#FF0000', '#00AA00', '#800080', '#FF8800',
            '#008080', '#CC0066', '#666600', '#CC6600', '#0080FF'
        ];
        return colors[index % colors.length];
    }
}
exports.dashboardService = new DashboardService();
//# sourceMappingURL=dashboardService.js.map