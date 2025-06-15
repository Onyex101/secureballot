"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCandidate = exports.updateCandidate = exports.createCandidates = exports.getCandidateById = exports.getCandidates = void 0;
const services_1 = require("../../services");
const AuditLog_1 = require("../../db/models/AuditLog");
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
/**
 * Get candidates for an election
 * @route GET /api/v1/elections/:electionId/candidates
 * @access Private
 */
const getCandidates = async (req, res, next) => {
    const { electionId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;
    const queryParams = { search, page, limit };
    try {
        // Get candidates
        const result = await services_1.candidateService.getCandidates(electionId, search, Number(page), Number(limit));
        // Log the action based on user type
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.CANDIDATE_LIST_VIEW, // For voters
        adminLogService_1.AdminAction.CANDIDATE_LIST_VIEW, // For admins
        adminLogService_1.ResourceType.CANDIDATE, electionId, {
            query: queryParams,
            resultsCount: result.pagination.total,
            success: true,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // Log failure based on user type
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.CANDIDATE_LIST_VIEW, // For voters
        adminLogService_1.AdminAction.CANDIDATE_LIST_VIEW, // For admins
        adminLogService_1.ResourceType.CANDIDATE, electionId, {
            query: queryParams,
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log candidate list view error', logErr));
        next(error);
    }
};
exports.getCandidates = getCandidates;
/**
 * Get candidate by ID
 * @route GET /api/v1/candidates/:id
 * @access Private
 */
const getCandidateById = async (req, res, next) => {
    const { id } = req.params;
    try {
        // Get candidate
        const candidate = await services_1.candidateService.getCandidateById(id);
        // Log the action based on user type
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.CANDIDATE_VIEW, // For voters
        adminLogService_1.AdminAction.CANDIDATE_DETAIL_VIEW, // For admins
        adminLogService_1.ResourceType.CANDIDATE, id, {
            candidateName: candidate.fullName,
            electionId: candidate.electionId,
            success: true,
        });
        res.status(200).json({
            success: true,
            data: candidate,
        });
    }
    catch (error) {
        // Log failure based on user type
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.CANDIDATE_VIEW, // For voters
        adminLogService_1.AdminAction.CANDIDATE_DETAIL_VIEW, // For admins
        adminLogService_1.ResourceType.CANDIDATE, id, {
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log candidate view error', logErr));
        next(error);
    }
};
exports.getCandidateById = getCandidateById;
/**
 * Create multiple candidates (admin only)
 * @route POST /api/v1/elections/:electionId/candidates
 * @access Private (Admin)
 */
const createCandidates = async (req, res, next) => {
    const { electionId } = req.params;
    const { candidates } = req.body;
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!candidates || !Array.isArray(candidates) || candidates.length < 2) {
            throw new errorHandler_1.ApiError(400, 'At least 2 candidates must be provided', 'INSUFFICIENT_CANDIDATES');
        }
        // Validate each candidate has required fields
        for (const candidate of candidates) {
            if (!candidate.fullName || !candidate.partyCode || !candidate.partyName) {
                throw new errorHandler_1.ApiError(400, 'Missing required fields: fullName, partyCode, partyName for one or more candidates', 'MISSING_REQUIRED_FIELDS');
            }
        }
        // Create candidates
        const createdCandidates = await services_1.candidateService.createMultipleCandidates(electionId, candidates);
        // Log the action (admin-only route - use admin logs)
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.CANDIDATE_CREATE, adminLogService_1.ResourceType.CANDIDATE, null, {
            electionId,
            candidateCount: createdCandidates.length,
            candidateNames: createdCandidates.map((c) => c.fullName),
            success: true,
        });
        res.status(201).json({
            success: true,
            message: `${createdCandidates.length} candidates created successfully`,
            data: {
                candidates: createdCandidates,
                count: createdCandidates.length,
            },
        });
    }
    catch (error) {
        // Log error (admin-only route - use admin logs)
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.CANDIDATE_CREATE, adminLogService_1.ResourceType.CANDIDATE, null, {
            electionId,
            candidateCount: candidates?.length || 0,
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log candidate creation error', logErr));
        next(error);
    }
};
exports.createCandidates = createCandidates;
/**
 * Update a candidate (admin only)
 * @route PUT /api/v1/candidates/:id
 * @access Private (Admin)
 */
const updateCandidate = async (req, res, next) => {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Update candidate
        const candidate = await services_1.candidateService.updateCandidate(id, updates);
        // Log the action (admin-only route - use admin logs)
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.CANDIDATE_UPDATE, adminLogService_1.ResourceType.CANDIDATE, id, {
            updatedFields: Object.keys(updates),
            success: true,
        });
        res.status(200).json({
            success: true,
            message: 'Candidate updated successfully',
            data: candidate,
        });
    }
    catch (error) {
        // Log error (admin-only route - use admin logs)
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.CANDIDATE_UPDATE, adminLogService_1.ResourceType.CANDIDATE, id, {
            updatedFields: Object.keys(updates),
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log candidate update error', logErr));
        next(error);
    }
};
exports.updateCandidate = updateCandidate;
/**
 * Delete a candidate (admin only)
 * @route DELETE /api/v1/candidates/:id
 * @access Private (Admin)
 */
const deleteCandidate = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Delete candidate
        await services_1.candidateService.deleteCandidate(id);
        // Log the action (admin-only route - use admin logs)
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.CANDIDATE_DELETE, adminLogService_1.ResourceType.CANDIDATE, id, {
            success: true,
        });
        res.status(200).json({
            success: true,
            message: 'Candidate deleted successfully',
        });
    }
    catch (error) {
        // Log error (admin-only route - use admin logs)
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.CANDIDATE_DELETE, adminLogService_1.ResourceType.CANDIDATE, id, {
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log candidate deletion error', logErr));
        next(error);
    }
};
exports.deleteCandidate = deleteCandidate;
//# sourceMappingURL=candidateController.js.map