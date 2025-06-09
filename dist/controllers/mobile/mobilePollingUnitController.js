"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyPollingUnits = void 0;
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const logger_1 = require("../../config/logger");
/**
 * Find nearby polling units
 */
const getNearbyPollingUnits = async (req, res, next) => {
    const userId = req.user?.id;
    const { latitude, longitude, radius = 5, limit = 10 } = req.query;
    const _searchParams = { latitude, longitude, radius, limit };
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!latitude || !longitude) {
            throw new errorHandler_1.ApiError(400, 'Latitude and longitude are required', 'MISSING_COORDINATES');
        }
        // Get nearby polling units
        // Assuming service returns PollingUnit[] potentially augmented with distance
        const pollingUnits = await services_1.pollingUnitService.getNearbyPollingUnits(Number(latitude), Number(longitude), Number(radius), Number(limit));
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MOBILE_NEARBY_PU_SEARCH, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            latitude: Number(latitude),
            longitude: Number(longitude),
            radius: Number(radius),
            limit: Number(limit),
            resultsCount: pollingUnits.length,
        });
        res.status(200).json({
            success: true,
            data: {
                pollingUnits: pollingUnits.map((unit) => ({
                    id: unit.id,
                    name: unit.pollingUnitName,
                    code: unit.pollingUnitCode,
                    address: unit.address,
                    latitude: unit.latitude,
                    longitude: unit.longitude,
                    distance: unit.distance,
                })),
                searchParams: {
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    radius: Number(radius),
                    limit: Number(limit),
                },
            },
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog(userId || 'unknown', AuditLog_1.AuditActionType.MOBILE_NEARBY_PU_SEARCH, req.ip || '', req.headers['user-agent'] || '', {
            success: false,
            latitude: latitude ? Number(latitude) : undefined,
            longitude: longitude ? Number(longitude) : undefined,
            radius: radius ? Number(radius) : undefined,
            limit: limit ? Number(limit) : undefined,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log nearby PU search error', logErr));
        next(error);
    }
};
exports.getNearbyPollingUnits = getNearbyPollingUnits;
//# sourceMappingURL=mobilePollingUnitController.js.map