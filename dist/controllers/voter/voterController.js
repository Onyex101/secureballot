"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.requestVerification = exports.checkEligibility = exports.getPollingUnit = exports.updateProfile = exports.getProfile = void 0;
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const auditHelpers_1 = require("../../utils/auditHelpers");
const logger_1 = require("../../config/logger");
/**
 * Get voter profile
 * @route GET /api/v1/voter/profile
 * @access Private
 */
const getProfile = async (req, res, next) => {
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Get voter profile
        const voter = await services_1.voterService.getVoterProfile(userId);
        // Log the profile view
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.PROFILE_UPDATE, req.ip || '', req.headers['user-agent'] || '', { success: true, action: 'view_profile' });
        res.status(200).json({
            success: true,
            data: voter,
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), AuditLog_1.AuditActionType.PROFILE_UPDATE, req.ip || '', req.headers['user-agent'] || '', { success: false, action: 'view_profile', error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log profile view error', logErr));
        next(error);
    }
};
exports.getProfile = getProfile;
/**
 * Update voter profile
 * @route PUT /api/v1/voter/profile
 * @access Private
 */
const updateProfile = async (req, res, next) => {
    const userId = req.user?.id;
    const { phoneNumber, dateOfBirth } = req.body;
    const updatedFields = { phoneNumber, dateOfBirth }; // For logging
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Minimal validation, consider more robust validation middleware
        const updates = {};
        if (phoneNumber)
            updates.phoneNumber = phoneNumber;
        if (dateOfBirth)
            updates.dateOfBirth = new Date(dateOfBirth);
        if (Object.keys(updates).length === 0) {
            throw new errorHandler_1.ApiError(400, 'No valid fields provided for update', 'NO_UPDATE_FIELDS');
        }
        // Update voter profile
        const updatedVoter = await services_1.voterService.updateVoterProfile(userId, updates);
        // Log the profile update
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.PROFILE_UPDATE, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            updatedFields: Object.keys(updates),
        });
        // Return only relevant parts of profile, not full model object potentially
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                // Return a subset of data
                id: updatedVoter.id,
                phoneNumber: updatedVoter.phoneNumber,
                dateOfBirth: updatedVoter.dateOfBirth,
            },
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), AuditLog_1.AuditActionType.PROFILE_UPDATE, req.ip || '', req.headers['user-agent'] || '', {
            success: false,
            updatedFields: Object.keys(updatedFields),
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log profile update error', logErr));
        next(error);
    }
};
exports.updateProfile = updateProfile;
/**
 * Get voter's assigned polling unit
 * @route GET /api/v1/voter/polling-unit
 * @access Private
 */
const getPollingUnit = async (req, res, next) => {
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Get voter's polling unit
        const pollingUnit = await services_1.voterService.getVoterPollingUnit(userId);
        // Log the polling unit view
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.USER_ASSIGNED_PU_VIEW, req.ip || '', req.headers['user-agent'] || '', { success: true, pollingUnitId: pollingUnit.id });
        res.status(200).json({
            success: true,
            data: pollingUnit,
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog(userId || 'unknown', AuditLog_1.AuditActionType.USER_ASSIGNED_PU_VIEW, req.ip || '', req.headers['user-agent'] || '', { success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log assigned PU view error', logErr));
        next(error);
    }
};
exports.getPollingUnit = getPollingUnit;
/**
 * Check voter eligibility for an election
 * @route GET /api/v1/voter/eligibility/:electionId
 * @access Private
 */
const checkEligibility = async (req, res, next) => {
    const userId = req.user?.id;
    const { electionId } = req.params;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!electionId) {
            throw new errorHandler_1.ApiError(400, 'electionId parameter is required', 'MISSING_ELECTION_ID');
        }
        // Check voter eligibility
        const eligibility = await services_1.voterService.checkVoterEligibility(userId, electionId);
        // Log the eligibility check
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.VOTER_ELIGIBILITY_CHECK, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            electionId,
            isEligible: eligibility.isEligible,
            reason: eligibility.reason,
        });
        res.status(200).json({
            success: true,
            data: eligibility,
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog(userId || 'unknown', AuditLog_1.AuditActionType.VOTER_ELIGIBILITY_CHECK, req.ip || '', req.headers['user-agent'] || '', { success: false, electionId, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log eligibility check error', logErr));
        next(error);
    }
};
exports.checkEligibility = checkEligibility;
/**
 * Request voter verification
 * @route POST /api/v1/voter/request-verification
 * @access Private
 */
const requestVerification = async (req, res, next) => {
    const userId = req.user?.id;
    const { documentType, documentNumber, documentImageUrl } = req.body;
    const context = { documentType, documentNumber }; // For logging
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!documentType || !documentNumber || !documentImageUrl) {
            throw new errorHandler_1.ApiError(400, 'documentType, documentNumber, and documentImageUrl are required', 'MISSING_VERIFICATION_DATA');
        }
        // Request verification - NOTE: Service might throw 'Not Implemented'
        const verificationStatus = await services_1.voterService.requestVerification(userId);
        // Log the verification request
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.VOTER_VERIFICATION_REQUEST, req.ip || '', req.headers['user-agent'] || '', { success: true, ...context, status: verificationStatus?.verificationLevel || 'submitted' });
        res.status(200).json({
            success: true,
            message: 'Verification request submitted successfully.',
            data: { status: verificationStatus?.verificationLevel || 'submitted' }, // Return current status
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog(userId || 'unknown', AuditLog_1.AuditActionType.VOTER_VERIFICATION_REQUEST, req.ip || '', req.headers['user-agent'] || '', { success: false, ...context, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log verification request error', logErr));
        next(error);
    }
};
exports.requestVerification = requestVerification;
/**
 * Change voter password
 * @route POST /api/v1/voter/change-password
 * @access Private
 */
const changePassword = async (req, res, next) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!currentPassword || !newPassword) {
            throw new errorHandler_1.ApiError(400, 'currentPassword and newPassword are required', 'MISSING_PASSWORD_FIELDS');
        }
        // Add password complexity validation if needed here or in service
        // Change password using service
        await services_1.voterService.changePassword(userId, currentPassword, newPassword);
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.PASSWORD_CHANGE, req.ip || '', req.headers['user-agent'] || '', { success: true });
        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        // Log failure
        try {
            await services_1.auditService.createAuditLog(userId || 'unknown', AuditLog_1.AuditActionType.PASSWORD_CHANGE, req.ip || '', req.headers['user-agent'] || '', { success: false, error: error.message });
        }
        catch (logErr) {
            logger_1.logger.error(`Failed to log password change error: ${logErr instanceof Error ? logErr.message : String(logErr)}`);
        }
        next(error);
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=voterController.js.map