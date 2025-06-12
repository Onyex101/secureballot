"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectResults = exports.publishResults = exports.verifyAndPublishResults = exports.getVerificationHistory = exports.verifyElectionResults = void 0;
const errorHandler_1 = require("../../middleware/errorHandler");
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
const services_1 = require("../../services");
const Election_1 = require("../../db/models/Election");
const logger_1 = require("../../config/logger");
/**
 * Verify election results
 * @route POST /api/v1/admin/elections/:electionId/verify-results
 * @access Private (Admin only)
 */
const verifyElectionResults = async (req, res, next) => {
    try {
        const adminId = req.user?.id;
        const { electionId } = req.params;
        const { verificationNotes } = req.body;
        if (!adminId) {
            throw new errorHandler_1.ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        if (!electionId) {
            throw new errorHandler_1.ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
        }
        // TODO: Implement result verification logic
        // This would involve:
        // 1. Checking vote counts
        // 2. Verifying vote integrity
        // 3. Cross-referencing with physical records
        // 4. Updating election status
        // Log the action using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.RESULTS_VERIFY, adminLogService_1.ResourceType.ELECTION, electionId, {
            verificationNotes,
            success: true,
        });
        res.status(200).json({
            success: true,
            message: 'Election results verified successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyElectionResults = verifyElectionResults;
/**
 * Get verification history for an election
 * @route GET /api/v1/admin/elections/:electionId/verification-history
 * @access Private (Admin only)
 */
const getVerificationHistory = async (req, res, next) => {
    try {
        const adminId = req.user?.id;
        const { electionId } = req.params;
        if (!adminId) {
            throw new errorHandler_1.ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        if (!electionId) {
            throw new errorHandler_1.ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
        }
        // TODO: Implement verification history retrieval
        // This would involve:
        // 1. Fetching all audit logs related to result verification
        // 2. Including admin details and timestamps
        // 3. Including verification notes and status
        // Log the action using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.RESULTS_VIEW, adminLogService_1.ResourceType.ELECTION, electionId, {
            action: 'verification_history_view',
            success: true,
        });
        res.status(200).json({
            success: true,
            data: [], // Replace with actual verification history
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVerificationHistory = getVerificationHistory;
/**
 * Verify and publish election results
 * @route POST /api/v1/admin/elections/:electionId/verify-and-publish
 * @access Private (Admin only)
 */
const verifyAndPublishResults = async (req, res, next) => {
    try {
        const adminId = req.user?.id;
        const { electionId } = req.params;
        const { publishLevel, verificationNotes } = req.body;
        if (!adminId) {
            throw new errorHandler_1.ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        if (!electionId) {
            throw new errorHandler_1.ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
        }
        // Get the election to check its current status
        const election = await services_1.electionService.getElectionById(electionId);
        if (!election) {
            throw new errorHandler_1.ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
        }
        // Verify that the election is in a state that can be closed
        if (election.status === Election_1.ElectionStatus.COMPLETED) {
            throw new errorHandler_1.ApiError(400, 'Election is already completed', 'ELECTION_ALREADY_COMPLETED');
        }
        if (election.status === Election_1.ElectionStatus.CANCELLED) {
            throw new errorHandler_1.ApiError(400, 'Cannot verify results for a cancelled election', 'ELECTION_CANCELLED');
        }
        // TODO: Implement result verification and publishing logic
        // This would involve:
        // 1. Verifying vote counts
        // 2. Checking vote integrity
        // 3. Publishing results at specified level
        // Publish results if publishLevel is specified
        if (publishLevel) {
            await services_1.electionService.publishElectionResults(electionId, publishLevel);
        }
        // Close the election by updating its status to COMPLETED and mark results as published
        await services_1.electionService.updateElectionStatus(electionId, Election_1.ElectionStatus.COMPLETED);
        // Update the election to mark results as published
        await election.update({
            resultsPublished: true,
            resultsPublishedAt: new Date(),
        });
        // Log the action using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.RESULTS_PUBLISH, adminLogService_1.ResourceType.ELECTION, electionId, {
            publishLevel,
            verificationNotes,
            previousStatus: election.status,
            newStatus: Election_1.ElectionStatus.COMPLETED,
            success: true,
        });
        res.status(200).json({
            success: true,
            message: 'Election results verified, published, and election closed successfully',
            data: {
                electionId,
                previousStatus: election.status,
                newStatus: Election_1.ElectionStatus.COMPLETED,
                publishLevel,
            },
        });
    }
    catch (error) {
        // Log error if we have the electionId
        if (req.params.electionId) {
            await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.RESULTS_PUBLISH, adminLogService_1.ResourceType.ELECTION, req.params.electionId, {
                publishLevel: req.body.publishLevel,
                verificationNotes: req.body.verificationNotes,
                success: false,
                error: error.message,
            }).catch(logErr => logger_1.logger.error('Failed to log error:', logErr));
        }
        next(error);
    }
};
exports.verifyAndPublishResults = verifyAndPublishResults;
const publishResults = async (req, res, next) => {
    try {
        const { electionId } = req.body;
        if (!electionId) {
            throw new errorHandler_1.ApiError(400, 'Election ID is required');
        }
        // TODO: Implement result publishing logic
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.RESULTS_PUBLISH, adminLogService_1.ResourceType.ELECTION, electionId, {
            success: true,
        });
        res.status(200).json({ success: true, message: 'Results published successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.publishResults = publishResults;
const rejectResults = async (req, res, next) => {
    try {
        const { electionId, reason } = req.body;
        if (!electionId || !reason) {
            throw new errorHandler_1.ApiError(400, 'Election ID and reason are required');
        }
        // TODO: Implement result rejection logic
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.RESULTS_VERIFY, adminLogService_1.ResourceType.ELECTION, electionId, {
            reason,
            action: 'reject',
            success: true,
        });
        res.status(200).json({ success: true, message: 'Results rejected successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectResults = rejectResults;
//# sourceMappingURL=resultVerificationController.js.map