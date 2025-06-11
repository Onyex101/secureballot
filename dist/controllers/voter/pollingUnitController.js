"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyPollingUnits = exports.getPollingUnitById = exports.getPollingUnits = void 0;
const services_1 = require("../../services");
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
const errorHandler_1 = require("../../middleware/errorHandler");
/**
 * Get all polling units with pagination and filtering
 * @route GET /api/v1/voter/polling-units
 * @access Private
 */
const getPollingUnits = async (req, res, next) => {
    try {
        const { regionId, search, page = 1, limit = 50 } = req.query;
        // Get polling units
        const result = await services_1.pollingUnitService.getPollingUnits({ state: regionId }, search, Number(page), Number(limit));
        // Log the action using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, 'polling_unit_list_view', // For voters
        adminLogService_1.AdminAction.POLLING_UNIT_LIST_VIEW, // For admins
        adminLogService_1.ResourceType.POLLING_UNIT, null, { query: req.query, success: true });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPollingUnits = getPollingUnits;
/**
 * Get polling unit by ID
 * @route GET /api/v1/voter/polling-units/:id
 * @access Private
 */
const getPollingUnitById = async (req, res, next) => {
    try {
        const { id } = req.params;
        try {
            // Get polling unit
            const pollingUnit = await services_1.pollingUnitService.getPollingUnitById(id);
            // Log the action using contextual logging
            await (0, auditHelpers_1.createContextualLog)(req, 'polling_unit_view', // For voters
            adminLogService_1.AdminAction.POLLING_UNIT_LIST_VIEW, // For admins (closest available)
            adminLogService_1.ResourceType.POLLING_UNIT, id, { success: true });
            res.status(200).json({
                success: true,
                data: pollingUnit,
            });
        }
        catch (error) {
            throw new errorHandler_1.ApiError(404, 'Polling unit not found', 'POLLING_UNIT_NOT_FOUND');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.getPollingUnitById = getPollingUnitById;
/**
 * Get nearby polling units
 * @route GET /api/v1/voter/polling-units/nearby
 * @access Private
 */
const getNearbyPollingUnits = async (req, res, next) => {
    try {
        const { latitude, longitude, radius = 5, limit = 10 } = req.query;
        if (!latitude || !longitude) {
            throw new errorHandler_1.ApiError(400, 'Latitude and longitude are required', 'MISSING_COORDINATES');
        }
        // Get nearby polling units
        const pollingUnits = await services_1.pollingUnitService.getNearbyPollingUnits(Number(latitude), Number(longitude), Number(radius), Number(limit));
        // Log the action using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, 'nearby_polling_units_view', // For voters
        adminLogService_1.AdminAction.POLLING_UNIT_LIST_VIEW, // For admins
        adminLogService_1.ResourceType.POLLING_UNIT, null, {
            latitude,
            longitude,
            radius,
            limit,
            success: true,
        });
        res.status(200).json({
            success: true,
            data: pollingUnits,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getNearbyPollingUnits = getNearbyPollingUnits;
//# sourceMappingURL=pollingUnitController.js.map