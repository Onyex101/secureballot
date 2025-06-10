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
const models_1 = __importDefault(require("../db/models"));
const sequelize_1 = require("sequelize");
const geopoliticalZones_1 = require("../utils/geopoliticalZones");
class AppError extends Error {
    statusCode;
    details;
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
            const [liveResults, _electionStats, regionalBreakdown, pollingUnitsData, votingStatus] = await Promise.all([
                this.getLiveResults(request.electionId),
                this.getElectionStats(request.electionId),
                request.includeRegionalBreakdown ? this.getRegionalBreakdown(request.electionId) : null,
                this.getPollingUnitsStats(request.electionId),
                request.userId
                    ? this.getVotingStatus(request.electionId, request.userId)
                    : this.getDefaultVotingStatus(),
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
                recentActivity: request.includeRealTime
                    ? await this.getRecentActivity(request.electionId)
                    : [],
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
            logger_1.default.error('Error in getComprehensiveDashboardData:', error, {
                electionId: request.electionId,
            });
            throw error;
        }
    }
    getLiveResults(electionId) {
        return (0, resultService_1.getLiveResults)(electionId);
    }
    getElectionStats(electionId) {
        return ElectionStats_1.default.findOne({ where: { electionId } });
    }
    async getPollingUnitsStats(_electionId) {
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
        try {
            // Get age distribution from voters who have voted
            const ageGroupQuery = (await models_1.default.sequelize.query(`
        SELECT 
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 18 AND 25 THEN '18-25'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 26 AND 35 THEN '26-35'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 36 AND 45 THEN '36-45'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 46 AND 55 THEN '46-55'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_voter.date_of_birth)) BETWEEN 56 AND 65 THEN '56-65'
            ELSE '65+'
          END as age_range,
          COUNT(*) as vote_count
        FROM votes v
        JOIN voters v_voter ON v.user_id = v_voter.id
        WHERE v.election_id = :electionId
        GROUP BY age_range
        ORDER BY vote_count DESC
      `, {
                replacements: { electionId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            // Get gender distribution from voters who have voted
            const genderQuery = (await models_1.default.sequelize.query(`
        SELECT 
          v_voter.gender,
          COUNT(*) as vote_count
        FROM votes v
        JOIN voters v_voter ON v.user_id = v_voter.id
        WHERE v.election_id = :electionId
        GROUP BY v_voter.gender
      `, {
                replacements: { electionId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            // Calculate total votes for percentages
            const totalVotes = await Vote_1.default.count({ where: { electionId } });
            // Transform age groups
            const ageGroups = ageGroupQuery.map((group) => ({
                range: group.age_range,
                voteCount: parseInt(group.vote_count, 10),
                percentage: totalVotes > 0
                    ? Math.round((parseInt(group.vote_count, 10) / totalVotes) * 10000) / 100
                    : 0,
            }));
            // Transform gender data
            const genderData = genderQuery.reduce((acc, item) => {
                acc[item.gender.toLowerCase()] = parseInt(item.vote_count, 10);
                return acc;
            }, { male: 0, female: 0 });
            return {
                ageGroups,
                gender: genderData,
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching demographics:', error);
            return {
                ageGroups: [],
                gender: { male: 0, female: 0 },
            };
        }
    }
    async getLiveUpdates(electionId) {
        try {
            // Get recent election-related activities as live updates
            const recentResults = (await models_1.default.sequelize.query(`
        SELECT 
          CONCAT('result-', ROW_NUMBER() OVER (ORDER BY created_at DESC)) as id,
          'results' as type,
          CONCAT('New results from ', pu.polling_unit_name) as title,
          CONCAT('Latest vote counts updated for ', pu.state, ' - ', pu.lga) as message,
          created_at as timestamp,
          'medium' as priority,
          'polling_unit' as source
        FROM votes v
        JOIN polling_units pu ON v.polling_unit_id = pu.id
        WHERE v.election_id = :electionId
        GROUP BY pu.id, pu.polling_unit_name, pu.state, pu.lga, DATE_TRUNC('hour', v.created_at)
        ORDER BY MAX(v.created_at) DESC
        LIMIT 5
      `, {
                replacements: { electionId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            // Add system announcements (could be from a dedicated announcements table)
            const systemUpdates = [
                {
                    id: 'system-1',
                    type: 'announcement',
                    title: 'Election Progress Update',
                    message: 'Voting is proceeding smoothly across all regions',
                    timestamp: new Date().toISOString(),
                    priority: 'medium',
                    source: 'system',
                },
            ];
            const formattedResults = recentResults.map((result) => ({
                id: result.id,
                type: result.type,
                title: result.title,
                message: result.message,
                timestamp: new Date(result.timestamp).toISOString(),
                priority: result.priority,
                source: result.source,
            }));
            return [...systemUpdates, ...formattedResults].slice(0, 10);
        }
        catch (error) {
            logger_1.default.error('Error fetching live updates:', error);
            return [
                {
                    id: 'default-1',
                    type: 'announcement',
                    title: 'Election in Progress',
                    message: 'Real-time updates are being processed',
                    timestamp: new Date().toISOString(),
                    priority: 'low',
                    source: 'system',
                },
            ];
        }
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
                eligibilityReason: eligibility.reason ||
                    (eligibility.isEligible ? 'User is eligible to vote' : 'User is not eligible'),
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
        try {
            // Get votes by state
            const stateVotes = (await models_1.default.sequelize.query(`
        SELECT 
          pu.state,
          COUNT(v.id) as total_votes,
          COUNT(DISTINCT pu.id) as polling_units_reported
        FROM votes v
        JOIN polling_units pu ON v.polling_unit_id = pu.id
        WHERE v.election_id = :electionId
        GROUP BY pu.state
      `, {
                replacements: { electionId },
                type: sequelize_1.QueryTypes.SELECT,
            }));
            // Get registered voters by state (approximation)
            const registeredVotersByState = (await models_1.default.sequelize.query(`
        SELECT 
          state,
          COUNT(*) as registered_voters
        FROM voters
        WHERE is_active = true
        GROUP BY state
      `, {
                type: sequelize_1.QueryTypes.SELECT,
            }));
            // Group by geopolitical zones
            const regionalTurnout = new Map();
            stateVotes.forEach((stateData) => {
                const zone = (0, geopoliticalZones_1.getGeopoliticalZone)(stateData.state);
                if (zone) {
                    const registeredInState = registeredVotersByState.find((r) => r.state === stateData.state);
                    if (!regionalTurnout.has(zone)) {
                        regionalTurnout.set(zone, {
                            totalVotes: 0,
                            registeredVoters: 0,
                            statesReported: 0,
                            totalStatesInZone: geopoliticalZones_1.NIGERIA_GEOPOLITICAL_ZONES[zone]?.states.length || 0,
                        });
                    }
                    const zoneData = regionalTurnout.get(zone);
                    zoneData.totalVotes += parseInt(stateData.total_votes, 10);
                    zoneData.registeredVoters += registeredInState
                        ? parseInt(registeredInState.registered_voters, 10)
                        : 0;
                    zoneData.statesReported += 1;
                }
            });
            return Array.from(regionalTurnout.entries()).map(([regionName, data]) => ({
                regionName,
                turnoutPercentage: data.registeredVoters > 0
                    ? Math.round((data.totalVotes / data.registeredVoters) * 10000) / 100
                    : 0,
                statesReported: data.statesReported,
                totalStatesInZone: data.totalStatesInZone,
                totalVotes: data.totalVotes,
                registeredVoters: data.registeredVoters,
            }));
        }
        catch (error) {
            logger_1.default.error('Error fetching regional turnout:', error);
            return [];
        }
    }
    async getStateResults(electionId) {
        try {
            const stateResults = await (0, resultService_1.getResultsByRegion)(electionId, 'state');
            return (stateResults.regions?.map((region) => ({
                state: region.regionIdentifier,
                leadingParty: region.leadingCandidate?.partyCode || 'Unknown',
                percentage: region.leadingCandidate?.percentage || 0,
                totalVotes: region.totalVotes,
                turnoutPercentage: region.turnoutPercentage || 0,
                reportingStatus: 'partial',
            })) || []);
        }
        catch (error) {
            logger_1.default.error('Error fetching state results:', error);
            return [];
        }
    }
    mapElectionType(type) {
        const typeMap = {
            Presidential: 'presidential',
            Gubernatorial: 'gubernatorial',
            HouseOfReps: 'house-of-reps',
            Senatorial: 'senatorial',
        };
        return typeMap[type] || 'presidential';
    }
    mapElectionStatus(status) {
        const statusMap = {
            draft: 'upcoming',
            scheduled: 'upcoming',
            active: 'active',
            completed: 'completed',
            paused: 'suspended',
            cancelled: 'suspended',
        };
        return statusMap[status] || 'upcoming';
    }
    generateColor(index) {
        const colors = [
            '#0066CC',
            '#FF0000',
            '#00AA00',
            '#800080',
            '#FF8800',
            '#008080',
            '#CC0066',
            '#666600',
            '#CC6600',
            '#0080FF',
        ];
        return colors[index % colors.length];
    }
}
exports.dashboardService = new DashboardService();
//# sourceMappingURL=dashboardService.js.map