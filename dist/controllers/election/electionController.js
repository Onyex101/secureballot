"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getElectionDashboard = exports.getVotingStatus = exports.getCandidateById = exports.getElectionCandidates = exports.getElectionById = exports.getElections = void 0;
const models_1 = __importDefault(require("../../db/models"));
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const Election_1 = require("../../db/models/Election");
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
const logger_1 = require("../../config/logger");
/**
 * Get all active elections
 * @route GET /api/v1/elections
 * @access Private
 */
const getElections = async (req, res, next) => {
    const { status = 'active', type, page = 1, limit = 10 } = req.query;
    const userId = req.user?.id;
    const queryParams = { status, type, page, limit };
    try {
        const result = await services_1.electionService.getElectionsWithPagination({
            status: status,
            type: type,
            page: Number(page),
            limit: Number(limit),
            search: req.query.search,
        });
        const { elections } = result;
        // Fetch candidates for each election
        const electionsWithCandidates = await Promise.all(elections.map(async (election) => {
            try {
                // Get candidates for this election (limit to first 50 candidates for list view)
                const candidatesResult = await services_1.electionService.getElectionCandidates(election.id, 1, 50);
                return {
                    ...election.toJSON(),
                    candidates: candidatesResult.candidates,
                    candidateCount: candidatesResult.pagination.total,
                };
            }
            catch (error) {
                // If there's an error fetching candidates, return election without candidates
                logger_1.logger.warn(`Failed to fetch candidates for election ${election.id}:`, error);
                return {
                    ...election.toJSON(),
                    candidates: [],
                    candidateCount: 0,
                };
            }
        }));
        // Get voter profile using voterService
        let voterProfile = null;
        if (userId) {
            try {
                voterProfile = await services_1.voterService.getVoterProfile(userId);
            }
            catch (voterError) {
                logger_1.logger.warn(`Failed to get profile for user ${userId}:`, voterError);
            }
        }
        // Log election view using contextual logging
        if (userId) {
            await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters
            adminLogService_1.AdminAction.ELECTION_LIST_VIEW, // For admins
            adminLogService_1.ResourceType.ELECTION, null, { filter: queryParams, resultsCount: result.pagination.total, success: true });
        }
        // Return paginated results
        res.status(200).json({
            success: true,
            code: 'ELECTIONS_RETRIEVED',
            message: 'Elections retrieved successfully',
            data: {
                elections: electionsWithCandidates,
                pagination: result.pagination,
                // Extract verification status from profile
                voterStatus: voterProfile?.verification
                    ? { isVerified: voterProfile.verification.identityVerified }
                    : null,
                // Include available election types
                availableElectionTypes: Object.values(Election_1.ElectionType),
            },
        });
    }
    catch (error) {
        // Log failure using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters
        adminLogService_1.AdminAction.ELECTION_LIST_VIEW, // For admins
        adminLogService_1.ResourceType.ELECTION, null, { filter: queryParams, success: false, error: error.message }).catch(logErr => logger_1.logger.error('Failed to log election list view error', logErr));
        next(error);
    }
};
exports.getElections = getElections;
/**
 * Get election details by ID
 * @route GET /api/v1/elections/:electionId
 * @access Private
 */
const getElectionById = async (req, res, next) => {
    const { id: electionId } = req.params;
    const userId = req.user?.id;
    try {
        // Get election using electionService
        const election = await services_1.electionService.getElectionById(electionId);
        if (!election) {
            throw new errorHandler_1.ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
        }
        // Get candidates using electionService (assuming we want all for details page)
        const candidatesResult = await services_1.electionService.getElectionCandidates(electionId, 1, 1000); // Get all candidates
        // Check if voter has already voted using direct DB access
        // TODO: Add voteService.checkIfVoted
        let hasVoted = false;
        if (userId) {
            try {
                const existingVote = await models_1.default.Vote.findOne({ where: { userId, electionId } });
                hasVoted = !!existingVote;
            }
            catch (voteCheckError) {
                logger_1.logger.warn(`Failed to check vote status for user ${userId} in election ${electionId}:`, voteCheckError);
            }
        }
        // Get voter profile using voterService
        let voterProfile = null;
        if (userId) {
            try {
                voterProfile = await services_1.voterService.getVoterProfile(userId);
            }
            catch (voterError) {
                logger_1.logger.warn(`Failed to get profile for user ${userId}:`, voterError);
            }
        }
        // Calculate display status (moved from service)
        const now = new Date();
        // Define a broader type for displayStatus
        let displayStatus = election.status;
        if (election.status === Election_1.ElectionStatus.SCHEDULED &&
            now >= election.startDate &&
            now <= election.endDate) {
            displayStatus = 'active_soon'; // Consider making this ACTIVE directly in a background job
        }
        else if (election.status === Election_1.ElectionStatus.ACTIVE && now > election.endDate) {
            displayStatus = 'ended'; // Consider making this COMPLETED directly in a background job
        }
        else if (election.status === Election_1.ElectionStatus.SCHEDULED && now < election.startDate) {
            displayStatus = 'upcoming';
        }
        // Log election view using contextual logging
        if (userId) {
            await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters
            adminLogService_1.AdminAction.ELECTION_DETAIL_VIEW, // For admins
            adminLogService_1.ResourceType.ELECTION, electionId, {
                electionName: election.electionName,
                success: true,
            });
        }
        // Return election details
        res.status(200).json({
            code: 'ELECTION_RETRIEVED',
            message: 'Election retrieved successfully',
            data: {
                election: {
                    ...election.toJSON(),
                    candidates: candidatesResult.candidates,
                    displayStatus,
                },
                voterStatus: {
                    hasVoted,
                    isVerified: voterProfile?.verification?.identityVerified || false,
                },
            },
        });
    }
    catch (error) {
        // Log failure using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters
        adminLogService_1.AdminAction.ELECTION_DETAIL_VIEW, // For admins
        adminLogService_1.ResourceType.ELECTION, electionId, { success: false, error: error.message }).catch(logErr => logger_1.logger.error('Failed to log election detail view error', logErr));
        next(error);
    }
};
exports.getElectionById = getElectionById;
/**
 * Get candidates for an election
 * @route GET /api/v1/elections/:electionId/candidates
 * @access Private
 */
const getElectionCandidates = async (req, res, next) => {
    const { electionId } = req.params;
    const { page = 1, limit = 50, search } = req.query;
    const userId = req.user?.id;
    const queryParams = { page, limit, search }; // For logging
    try {
        // Use electionService to get candidates - This service method exists
        const result = await services_1.electionService.getElectionCandidates(electionId, Number(page), Number(limit), search);
        // Log action using contextual logging
        if (userId) {
            await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters - still counts as viewing election-related data
            adminLogService_1.AdminAction.CANDIDATE_LIST_VIEW, // For admins - more specific action
            adminLogService_1.ResourceType.CANDIDATE, electionId, { view: 'candidates', query: queryParams, success: true });
        }
        res.status(200).json({
            code: 'CANDIDATES_RETRIEVED',
            message: 'Candidates retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        // Log failure using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters
        adminLogService_1.AdminAction.CANDIDATE_LIST_VIEW, // For admins
        adminLogService_1.ResourceType.CANDIDATE, electionId, {
            view: 'candidates',
            query: queryParams,
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log candidate list view error', logErr));
        next(error);
    }
};
exports.getElectionCandidates = getElectionCandidates;
/**
 * Get candidate details by ID
 * @route GET /api/v1/elections/:electionId/candidates/:candidateId
 * @access Private
 */
const getCandidateById = async (req, res, next) => {
    const { electionId, candidateId } = req.params;
    const userId = req.user?.id;
    try {
        // TODO: Add candidateService.getCandidateById
        const candidate = await models_1.default.Candidate.findOne({
            where: {
                id: candidateId,
                electionId,
                isActive: true, // Ensure candidate is active for this election context
            },
            // Include necessary attributes
        });
        if (!candidate) {
            throw new errorHandler_1.ApiError(404, 'Candidate not found for this election', 'CANDIDATE_NOT_FOUND');
        }
        // Log action using contextual logging
        if (userId) {
            await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters - still election-related
            adminLogService_1.AdminAction.CANDIDATE_DETAIL_VIEW, // For admins - more specific action
            adminLogService_1.ResourceType.CANDIDATE, candidateId, { electionId, view: 'candidate_details', success: true });
        }
        res.status(200).json({
            code: 'CANDIDATE_RETRIEVED',
            message: 'Candidate retrieved successfully',
            data: { candidate },
        });
    }
    catch (error) {
        // Log failure using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters
        adminLogService_1.AdminAction.CANDIDATE_DETAIL_VIEW, // For admins
        adminLogService_1.ResourceType.CANDIDATE, candidateId, {
            electionId,
            view: 'candidate_details',
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log candidate detail view error', logErr));
        next(error);
    }
};
exports.getCandidateById = getCandidateById;
/**
 * Get voter status for an election (eligibility, voted status)
 * @route GET /api/v1/elections/:electionId/voter-status
 * @access Private
 */
const getVotingStatus = async (req, res, next) => {
    const { electionId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.ApiError(401, 'Authentication required to check voting status', 'AUTH_REQUIRED');
    }
    try {
        // Check eligibility using voterService
        const eligibility = await services_1.voterService.checkVoterEligibility(userId, electionId);
        // Check voted status using direct DB access
        // TODO: Add voteService.checkIfVoted
        const existingVote = await models_1.default.Vote.findOne({ where: { userId, electionId } });
        const hasVoted = !!existingVote;
        // Log action based on user type
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters - viewing election-specific status
        adminLogService_1.AdminAction.ELECTION_DETAIL_VIEW, // For admins - viewing voter status for election
        adminLogService_1.ResourceType.ELECTION, electionId, {
            view: 'voter_status',
            eligibility: eligibility.isEligible,
            hasVoted,
            success: true,
        });
        res.status(200).json({
            success: true,
            code: 'VOTER_STATUS_RETRIEVED',
            message: 'Voter status retrieved successfully',
            data: {
                electionId,
                userId,
                isEligible: eligibility.isEligible,
                eligibilityReason: eligibility.reason,
                hasVoted,
            },
        });
    }
    catch (error) {
        // Log failure based on user type
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters
        adminLogService_1.AdminAction.ELECTION_DETAIL_VIEW, // For admins
        adminLogService_1.ResourceType.ELECTION, electionId, {
            view: 'voter_status',
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log voter status view error', logErr));
        next(error);
    }
};
exports.getVotingStatus = getVotingStatus;
/**
 * Get comprehensive election dashboard data
 * @route GET /api/v1/elections/:electionId/dashboard
 * @access Private
 */
const getElectionDashboard = async (req, res, next) => {
    const { electionId } = req.params;
    const userId = req.user?.id;
    try {
        // Get comprehensive dashboard data using electionService
        const dashboardData = await services_1.electionService.getElectionDashboard(electionId);
        // Log action using contextual logging
        if (userId) {
            await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters
            adminLogService_1.AdminAction.DASHBOARD_VIEW, // For admins - this is a dashboard view
            adminLogService_1.ResourceType.ELECTION, electionId, {
                view: 'dashboard',
                success: true,
            });
        }
        res.status(200).json({
            success: true,
            code: 'ELECTION_DASHBOARD_RETRIEVED',
            message: 'Election dashboard data retrieved successfully',
            data: dashboardData,
        });
    }
    catch (error) {
        // Log failure using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.ELECTION_VIEW, // For voters
        adminLogService_1.AdminAction.DASHBOARD_VIEW, // For admins
        adminLogService_1.ResourceType.ELECTION, electionId, { view: 'dashboard', success: false, error: error.message }).catch(logErr => logger_1.logger.error('Failed to log dashboard view error', logErr));
        next(error);
    }
};
exports.getElectionDashboard = getElectionDashboard;
//# sourceMappingURL=electionController.js.map