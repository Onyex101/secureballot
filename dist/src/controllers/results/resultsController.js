"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getElectionStatistics = exports.getResultsByRegion = exports.getLiveResults = void 0;
// import db from '../../db/models'; // Remove direct db access
const errorHandler_1 = require("../../middleware/errorHandler");
const Election_1 = require("../../db/models/Election");
const services_1 = require("../../services"); // Add services
const AuditLog_1 = require("../../db/models/AuditLog"); // Add AuditActionType
const logger_1 = require("../../config/logger"); // Add logger
const auditHelpers_1 = require("../../utils/auditHelpers");
/**
 * Get live election results
 * @route GET /api/v1/results/live/:electionId
 * @access Public
 */
const getLiveResults = async (req, res, next) => {
    const { electionId } = req.params;
    const viewerId = (0, auditHelpers_1.getUserIdFromRequest)(req); // Safely get user ID for audit logging
    try {
        // Get election using service
        const election = await services_1.electionService.getElectionById(electionId);
        if (!election) {
            // Use ApiError constructor
            throw new errorHandler_1.ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
        }
        // Check if election is active or completed
        if (![Election_1.ElectionStatus.ACTIVE, Election_1.ElectionStatus.COMPLETED].includes(election.status)) {
            throw new errorHandler_1.ApiError(403, 'Results are not available for this election status', 'RESULTS_NOT_AVAILABLE');
        }
        // Get live results using the result service
        const results = await services_1.resultService.getLiveResults(electionId);
        // Log success
        await services_1.auditService.createAuditLog(viewerId, AuditLog_1.AuditActionType.RESULTS_VIEW_LIVE, req.ip || '', req.headers['user-agent'] || '', { success: true, electionId });
        res.status(200).json({
            success: true,
            data: {
                election: {
                    id: election.id,
                    name: election.electionName,
                    type: election.electionType,
                    status: election.status,
                },
                results,
            },
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog(viewerId, AuditLog_1.AuditActionType.RESULTS_VIEW_LIVE, req.ip || '', req.headers['user-agent'] || '', { success: false, electionId, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log live results view error', logErr));
        next(error);
    }
};
exports.getLiveResults = getLiveResults;
/**
 * Get election results by region
 * @route GET /api/v1/results/region/:electionId
 * @access Public
 */
const getResultsByRegion = async (req, res, next) => {
    const { electionId } = req.params;
    const { regionType = 'state', regionCode } = req.query;
    const viewerId = (0, auditHelpers_1.getUserIdFromRequest)(req); // Safely get user ID for audit logging
    const context = { electionId, regionType, regionCode }; // For logging
    try {
        // Validate regionType
        if (regionType !== 'state' && regionType !== 'lga' && regionType !== 'ward') {
            throw new errorHandler_1.ApiError(400, 'Invalid region type. Must be one of: state, lga, ward', 'INVALID_REGION_TYPE');
        }
        if (!regionCode) {
            throw new errorHandler_1.ApiError(400, 'regionCode query parameter is required', 'MISSING_REGION_CODE');
        }
        // Get election using service
        const election = await services_1.electionService.getElectionById(electionId);
        if (!election) {
            throw new errorHandler_1.ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
        }
        // Check if election allows result viewing
        if (![Election_1.ElectionStatus.ACTIVE, Election_1.ElectionStatus.COMPLETED].includes(election.status)) {
            throw new errorHandler_1.ApiError(403, 'Results are not available for this election status', 'RESULTS_NOT_AVAILABLE');
        }
        // Get results by region using the result service
        const results = await services_1.resultService.getResultsByRegion(electionId, regionType, regionCode);
        // Log success
        await services_1.auditService.createAuditLog(viewerId, AuditLog_1.AuditActionType.RESULTS_VIEW_REGION, req.ip || '', req.headers['user-agent'] || '', { success: true, ...context });
        res.status(200).json({
            success: true,
            data: {
                election: {
                    id: election.id,
                    name: election.electionName,
                    type: election.electionType,
                    status: election.status,
                },
                regionType,
                regionCode,
                results,
            },
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog(viewerId, AuditLog_1.AuditActionType.RESULTS_VIEW_REGION, req.ip || '', req.headers['user-agent'] || '', { success: false, ...context, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log region results view error', logErr));
        next(error);
    }
};
exports.getResultsByRegion = getResultsByRegion;
/**
 * Get comprehensive election statistics
 * @route GET /api/v1/results/statistics/:electionId
 * @access Public
 */
const getElectionStatistics = async (req, res, next) => {
    const { electionId } = req.params;
    const viewerId = (0, auditHelpers_1.getUserIdFromRequest)(req); // Safely get user ID for audit logging
    try {
        // Get election using service
        const election = await services_1.electionService.getElectionById(electionId);
        if (!election) {
            throw new errorHandler_1.ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
        }
        // Check if election allows stats viewing
        if (![Election_1.ElectionStatus.ACTIVE, Election_1.ElectionStatus.COMPLETED].includes(election.status)) {
            throw new errorHandler_1.ApiError(403, 'Statistics are not available for this election status', 'STATS_NOT_AVAILABLE');
        }
        // Get election statistics using the result service
        const statistics = await services_1.resultService.getElectionStatistics(electionId);
        // Log success
        await services_1.auditService.createAuditLog(viewerId, AuditLog_1.AuditActionType.RESULTS_VIEW_STATS, req.ip || '', req.headers['user-agent'] || '', { success: true, electionId });
        res.status(200).json({
            success: true,
            data: {
                election: {
                    id: election.id,
                    name: election.electionName,
                    type: election.electionType,
                    status: election.status,
                },
                statistics,
            },
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog(viewerId, AuditLog_1.AuditActionType.RESULTS_VIEW_STATS, req.ip || '', req.headers['user-agent'] || '', { success: false, electionId, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log stats view error', logErr));
        next(error);
    }
};
exports.getElectionStatistics = getElectionStatistics;
//# sourceMappingURL=resultsController.js.map