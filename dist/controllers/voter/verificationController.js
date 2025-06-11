"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectVerification = exports.approveVerification = exports.getPendingVerifications = exports.submitVerification = exports.getVerificationStatus = void 0;
const services_1 = require("../../services");
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
/**
 * Get verification status
 * @route GET /api/v1/voter/verification-status
 * @access Private
 */
const getVerificationStatus = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        try {
            // Get verification status
            const verificationStatus = await services_1.verificationService.getVerificationStatus(userId);
            // Log the action using contextual logging (checks user type)
            await (0, auditHelpers_1.createContextualLog)(req, 'verification_status_check', // For voters
            adminLogService_1.AdminAction.VOTER_VERIFICATION_APPROVE, // For admins (closest available action)
            adminLogService_1.ResourceType.VERIFICATION_REQUEST, null, { action: 'status_check', success: true });
            res.status(200).json({
                success: true,
                data: verificationStatus,
            });
        }
        catch (error) {
            throw new errorHandler_1.ApiError(404, 'Verification status not found', 'VERIFICATION_STATUS_NOT_FOUND');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.getVerificationStatus = getVerificationStatus;
/**
 * Submit verification request
 * @route POST /api/v1/voter/submit-verification
 * @access Private
 */
const submitVerification = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        const { documentType, documentNumber, documentImageUrl } = req.body;
        if (!documentType || !documentNumber || !documentImageUrl) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields', 'MISSING_REQUIRED_FIELDS');
        }
        try {
            // Submit verification request
            const result = await services_1.verificationService.submitVerificationRequest(userId, documentType, documentNumber, documentImageUrl);
            // Log the action using contextual logging (checks user type)
            await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.VERIFICATION, // For voters
            adminLogService_1.AdminAction.VOTER_VERIFICATION_APPROVE, // For admins (closest available action)
            adminLogService_1.ResourceType.VERIFICATION_REQUEST, result.id, {
                documentType,
                verificationId: result.id,
                action: 'submit',
                success: true,
            });
            res.status(200).json({
                success: true,
                message: 'Verification request submitted successfully',
                data: result,
            });
        }
        catch (error) {
            throw new errorHandler_1.ApiError(400, 'Failed to submit verification request', 'VERIFICATION_REQUEST_FAILED');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.submitVerification = submitVerification;
/**
 * Get pending verification requests (admin only)
 * @route GET /api/v1/admin/pending-verifications
 * @access Private (Admin)
 */
const getPendingVerifications = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        // Get pending verifications
        const result = await services_1.verificationService.getPendingVerifications(Number(page), Number(limit));
        // Log the action (admin route - use admin logs)
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.VOTER_VERIFICATION_APPROVE, // Using closest available action
        adminLogService_1.ResourceType.VERIFICATION_REQUEST, null, { query: req.query, action: 'pending_verifications_view' });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPendingVerifications = getPendingVerifications;
/**
 * Approve verification request (admin only)
 * @route POST /api/v1/admin/approve-verification/:id
 * @access Private (Admin)
 */
const approveVerification = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const adminId = req.user?.id;
        if (!adminId) {
            throw new errorHandler_1.ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        try {
            // Approve verification
            const result = await services_1.verificationService.approveVerification(id, adminId, notes);
            // Log the action (admin route - use admin logs)
            await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.VOTER_VERIFICATION_APPROVE, adminLogService_1.ResourceType.VERIFICATION_REQUEST, id, {
                verificationId: id,
                notes,
                success: true,
            });
            res.status(200).json({
                success: true,
                message: 'Verification request approved',
                data: result,
            });
        }
        catch (error) {
            throw new errorHandler_1.ApiError(400, 'Failed to approve verification request', 'VERIFICATION_APPROVAL_FAILED');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.approveVerification = approveVerification;
/**
 * Reject verification request (admin only)
 * @route POST /api/v1/admin/reject-verification/:id
 * @access Private (Admin)
 */
const rejectVerification = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user?.id;
        if (!adminId) {
            throw new errorHandler_1.ApiError(401, 'Admin ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        if (!reason) {
            throw new errorHandler_1.ApiError(400, 'Rejection reason is required', 'MISSING_REJECTION_REASON');
        }
        try {
            // Reject verification
            const result = await services_1.verificationService.rejectVerification(id, adminId, reason);
            // Log the action (admin route - use admin logs)
            await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.VOTER_VERIFICATION_REJECT, adminLogService_1.ResourceType.VERIFICATION_REQUEST, id, {
                verificationId: id,
                reason,
                success: true,
            });
            res.status(200).json({
                success: true,
                message: 'Verification request rejected',
                data: result,
            });
        }
        catch (error) {
            throw new errorHandler_1.ApiError(400, 'Failed to reject verification request', 'VERIFICATION_REJECTION_FAILED');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.rejectVerification = rejectVerification;
//# sourceMappingURL=verificationController.js.map