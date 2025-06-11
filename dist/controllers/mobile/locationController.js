"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPollingUnit = void 0;
const services_1 = require("../../services");
const auditHelpers_1 = require("../../utils/auditHelpers");
const AuditLog_1 = require("../../db/models/AuditLog");
const adminLogService_1 = require("../../services/adminLogService");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../../config/logger");
/**
 * Get user's assigned polling unit
 * @route GET /api/v1/mobile/my-polling-unit (Example route)
 * @access Private
 */
const getUserPollingUnit = async (req, res, next) => {
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Get user's polling unit using voterService
        const pollingUnit = await services_1.voterService.getVoterPollingUnit(userId);
        if (!pollingUnit) {
            // Service should ideally throw, but handle case where it might return null
            throw new errorHandler_1.ApiError(404, 'Polling unit not assigned or found for voter', 'POLLING_UNIT_NOT_FOUND');
        }
        // Log the action using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.USER_ASSIGNED_PU_VIEW, adminLogService_1.AdminAction.POLLING_UNIT_LIST_VIEW, adminLogService_1.ResourceType.POLLING_UNIT, pollingUnit.id, { success: true, pollingUnitId: pollingUnit.id });
        res.status(200).json({
            success: true,
            data: {
                // Return the polling unit details directly
                pollingUnit: {
                    id: pollingUnit.id,
                    name: pollingUnit.pollingUnitName,
                    code: pollingUnit.pollingUnitCode,
                    address: pollingUnit.address,
                    state: pollingUnit.state,
                    lga: pollingUnit.lga,
                    ward: pollingUnit.ward,
                    latitude: pollingUnit.latitude,
                    longitude: pollingUnit.longitude,
                    // Remove hardcoded times
                },
            },
        });
    }
    catch (error) {
        // Log failure using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.USER_ASSIGNED_PU_VIEW, adminLogService_1.AdminAction.POLLING_UNIT_LIST_VIEW, adminLogService_1.ResourceType.POLLING_UNIT, null, { success: false, error: error.message }).catch(logErr => logger_1.logger.error('Failed to log user polling unit view error', logErr));
        next(error);
    }
};
exports.getUserPollingUnit = getUserPollingUnit;
//# sourceMappingURL=locationController.js.map