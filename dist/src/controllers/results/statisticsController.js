"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRealTimeUpdates = exports.getElectionStatistics = exports.getRealTimeVotingStats = exports.getElectionResults = void 0;
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const services_1 = require("../../services");
const logger_1 = require("../../config/logger");
const auditHelpers_1 = require("../../utils/auditHelpers");
/**
 * Get election results (potentially with breakdown)
 * @route GET /api/v1/results/elections/:electionId
 * @access Private (or Public? Check requirements)
 */
const getElectionResults = async (req, res, next) => {
    const { electionId } = req.params;
    const { includePollingUnitBreakdown = false } = req.query;
    const userId = (0, auditHelpers_1.getSafeUserIdForAudit)(req.user?.id); // Safely get user ID for audit logging
    const context = { electionId, includePollingUnitBreakdown };
    try {
        // Get election results
        const results = await services_1.statisticsService.getElectionResults(electionId, includePollingUnitBreakdown === 'true');
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.ELECTION_RESULTS_VIEW, req.ip || '', req.headers['user-agent'] || '', { success: true, ...context });
        res.status(200).json({
            success: true,
            data: results,
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog(userId, AuditLog_1.AuditActionType.ELECTION_RESULTS_VIEW, req.ip || '', req.headers['user-agent'] || '', { success: false, ...context, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log election results view error', logErr));
        next(error);
    }
};
exports.getElectionResults = getElectionResults;
/**
 * Get real-time voting statistics (system-wide)
 * @route GET /api/v1/results/live-stats (Example route)
 * @access Private (or Public? Check requirements)
 */
const getRealTimeVotingStats = async (req, res, next) => {
    const userId = (0, auditHelpers_1.getSafeUserIdForAudit)(req.user?.id); // Safely get user ID for audit logging
    try {
        // Get real-time voting statistics
        const stats = await services_1.statisticsService.getRealTimeVotingStats();
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.REAL_TIME_STATS_VIEW, req.ip || '', req.headers['user-agent'] || '', { success: true });
        res.status(200).json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog(userId, AuditLog_1.AuditActionType.REAL_TIME_STATS_VIEW, req.ip || '', req.headers['user-agent'] || '', { success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log real-time stats view error', logErr));
        next(error);
    }
};
exports.getRealTimeVotingStats = getRealTimeVotingStats;
/**
 * Get election statistics
 * @route GET /api/v1/results/statistics/:electionId
 * @access Private
 */
const getElectionStatistics = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { electionId } = req.params;
        const { regionId } = req.query;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        if (!electionId) {
            throw new errorHandler_1.ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
        }
        // Get election details
        const election = await services_1.electionService.getElectionById(electionId);
        if (!election) {
            throw new errorHandler_1.ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
        }
        // Get vote counts by candidate
        const voteCounts = await services_1.voteService.countVotes(electionId);
        // Calculate total votes
        const totalVotes = voteCounts.reduce((sum, candidate) => sum + candidate.voteCount, 0);
        // Get election statistics from statistics service
        const electionStats = await services_1.statisticsService.getElectionStatistics(electionId);
        // Calculate turnout percentage
        const registeredVoters = electionStats.registeredVoters || 1; // Avoid division by zero
        const turnoutPercentage = (totalVotes / registeredVoters) * 100;
        // Prepare candidate statistics
        const candidateStats = voteCounts.map(candidate => ({
            candidateId: candidate.candidateId,
            candidateName: candidate.candidateName,
            partyName: candidate.partyName,
            partyCode: candidate.partyCode,
            voteCount: candidate.voteCount,
            percentage: totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0,
        }));
        // Get regional breakdown if requested
        let regionalStats = [];
        if (regionId && typeof regionId === 'string') {
            // TODO: Implement regional statistics when service method is available
            regionalStats = []; // Placeholder until getRegionalStatistics is implemented
        }
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.ELECTION_STATISTICS_VIEW, req.ip || '', req.headers['user-agent'] || '', { electionId, regionId, success: true });
        res.status(200).json({
            success: true,
            message: 'Election statistics retrieved successfully',
            data: {
                election: {
                    id: election.id,
                    name: election.electionName,
                    type: election.electionType,
                    status: election.status,
                    startDate: election.startDate,
                    endDate: election.endDate,
                },
                statistics: {
                    totalVotes,
                    registeredVoters,
                    turnoutPercentage: Math.round(turnoutPercentage * 100) / 100,
                    totalPollingUnits: electionStats.totalPollingUnits || 0,
                    activePollingUnits: electionStats.activePollingUnits || 0,
                },
                candidates: candidateStats,
                regional: regionalStats,
                lastUpdated: new Date(),
            },
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(req.user?.id), // Safely get user ID for audit logging
        AuditLog_1.AuditActionType.ELECTION_STATISTICS_VIEW, req.ip || '', req.headers['user-agent'] || '', {
            electionId: req.params.electionId,
            regionId: req.query.regionId,
            success: false,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log election statistics view error', logErr));
        next(error);
    }
};
exports.getElectionStatistics = getElectionStatistics;
/**
 * Get real-time election updates
 * @route GET /api/v1/results/realtime/:electionId
 * @access Private
 */
const getRealTimeUpdates = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { electionId } = req.params;
        const { lastUpdate } = req.query;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        if (!electionId) {
            throw new errorHandler_1.ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
        }
        // Parse lastUpdate timestamp
        let lastUpdateDate;
        if (lastUpdate && typeof lastUpdate === 'string') {
            lastUpdateDate = new Date(lastUpdate);
            if (isNaN(lastUpdateDate.getTime())) {
                throw new errorHandler_1.ApiError(400, 'Invalid lastUpdate timestamp format', 'INVALID_TIMESTAMP');
            }
        }
        // Get real-time updates from statistics service
        const updates = {
            newVotes: 0,
            pollingUnitsReporting: 0,
            lastVoteTimestamp: new Date(),
            pollingActivity: [],
            processingDelay: 0,
        }; // Placeholder until getRealTimeUpdates is implemented
        // Get current vote counts
        const currentVoteCounts = await services_1.voteService.countVotes(electionId);
        const totalVotes = currentVoteCounts.reduce((sum, candidate) => sum + candidate.voteCount, 0);
        // Calculate new votes since last update
        let newVotesSinceUpdate = 0;
        if (lastUpdateDate) {
            // This would require tracking votes by timestamp
            // For now, we'll use the updates service data
            newVotesSinceUpdate = updates.newVotes || 0;
        }
        // Prepare updated statistics
        const updatedStatistics = {
            totalVotes,
            candidates: currentVoteCounts.map(candidate => ({
                candidateId: candidate.candidateId,
                candidateName: candidate.candidateName,
                voteCount: candidate.voteCount,
                percentage: totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0,
            })),
            pollingUnitsReporting: updates.pollingUnitsReporting || 0,
            lastVoteTimestamp: updates.lastVoteTimestamp,
        };
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.REAL_TIME_UPDATES_VIEW, req.ip || '', req.headers['user-agent'] || '', { electionId, lastUpdate, newVotes: newVotesSinceUpdate, success: true });
        res.status(200).json({
            success: true,
            message: 'Real-time updates retrieved successfully',
            data: {
                electionId,
                lastUpdate: new Date().toISOString(),
                newVotesSinceLastUpdate: newVotesSinceUpdate,
                updatedStatistics,
                pollingActivity: updates.pollingActivity || [],
                systemStatus: {
                    healthy: true,
                    lastProcessedVote: updates.lastVoteTimestamp,
                    processingDelay: updates.processingDelay || 0,
                },
            },
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(req.user?.id), // Safely get user ID for audit logging
        AuditLog_1.AuditActionType.REAL_TIME_UPDATES_VIEW, req.ip || '', req.headers['user-agent'] || '', {
            electionId: req.params.electionId,
            lastUpdate: req.query.lastUpdate,
            success: false,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log real-time updates view error', logErr));
        next(error);
    }
};
exports.getRealTimeUpdates = getRealTimeUpdates;
//# sourceMappingURL=statisticsController.js.map