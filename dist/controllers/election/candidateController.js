"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCandidate = exports.updateCandidate = exports.createCandidate = exports.getCandidateById = exports.getCandidates = void 0;
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const auditHelpers_1 = require("../../utils/auditHelpers");
const logger_1 = require("../../config/logger");
/**
 * Get all candidates for an election
 * @route GET /api/v1/elections/:electionId/candidates
 * @access Private
 */
const getCandidates = async (req, res, next) => {
    const { electionId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;
    const userId = (0, auditHelpers_1.getSafeUserIdForAudit)(req.user?.id);
    const queryParams = { search, page, limit };
    try {
        // Get candidates
        const result = await services_1.candidateService.getCandidates(electionId, search, Number(page), Number(limit));
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.CANDIDATE_LIST_VIEW, req.ip || '', req.headers['user-agent'] || '', {
            electionId,
            query: queryParams,
            success: true,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog(userId, AuditLog_1.AuditActionType.CANDIDATE_LIST_VIEW, req.ip || '', req.headers['user-agent'] || '', {
            electionId,
            query: queryParams,
            success: false,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log candidate list view error', logErr));
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
    const userId = (0, auditHelpers_1.getSafeUserIdForAudit)(req.user?.id);
    try {
        // Get candidate
        const candidate = await services_1.candidateService.getCandidateById(id);
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.CANDIDATE_VIEW, req.ip || '', req.headers['user-agent'] || '', { candidateId: id, success: true });
        res.status(200).json({
            success: true,
            data: candidate,
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog(userId, AuditLog_1.AuditActionType.CANDIDATE_VIEW, req.ip || '', req.headers['user-agent'] || '', { candidateId: id, success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log candidate view error', logErr));
        next(error);
    }
};
exports.getCandidateById = getCandidateById;
/**
 * Create a new candidate (admin only)
 * @route POST /api/v1/elections/:electionId/candidates
 * @access Private (Admin)
 */
const createCandidate = async (req, res, next) => {
    const { electionId } = req.params;
    const { fullName, partyAffiliation, position, biography, photoUrl } = req.body;
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!fullName || !partyAffiliation || !position) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields: fullName, partyAffiliation, position', 'MISSING_REQUIRED_FIELDS');
        }
        // Create candidate
        const candidate = await services_1.candidateService.createCandidate(fullName, electionId, partyAffiliation, position, biography, photoUrl);
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.CANDIDATE_CREATE, req.ip || '', req.headers['user-agent'] || '', {
            electionId,
            candidateId: candidate.id,
            candidateName: candidate.fullName,
            success: true,
        });
        res.status(201).json({
            success: true,
            message: 'Candidate created successfully',
            data: candidate,
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), AuditLog_1.AuditActionType.CANDIDATE_CREATE, req.ip || '', req.headers['user-agent'] || '', {
            electionId,
            candidateName: fullName,
            success: false,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log candidate creation error', logErr));
        next(error);
    }
};
exports.createCandidate = createCandidate;
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
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.CANDIDATE_UPDATE, req.ip || '', req.headers['user-agent'] || '', {
            candidateId: id,
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
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), AuditLog_1.AuditActionType.CANDIDATE_UPDATE, req.ip || '', req.headers['user-agent'] || '', {
            candidateId: id,
            updatedFields: Object.keys(updates),
            success: false,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log candidate update error', logErr));
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
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.CANDIDATE_DELETE, req.ip || '', req.headers['user-agent'] || '', { candidateId: id, success: true });
        res.status(200).json({
            success: true,
            message: 'Candidate deleted successfully',
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), AuditLog_1.AuditActionType.CANDIDATE_DELETE, req.ip || '', req.headers['user-agent'] || '', { candidateId: id, success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log candidate deletion error', logErr));
        next(error);
    }
};
exports.deleteCandidate = deleteCandidate;
//# sourceMappingURL=candidateController.js.map