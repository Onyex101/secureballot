"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegionStatistics = exports.updatePollingUnit = exports.createPollingUnit = exports.getRegionPollingUnits = void 0;
const errorHandler_1 = require("../../middleware/errorHandler");
const services_1 = require("../../services");
const AuditLog_1 = require("../../db/models/AuditLog");
const logger_1 = require("../../config/logger");
/**
 * Get polling units in a region (assumed to be state)
 * @route GET /api/v1/admin/regions/:state/polling-units
 * @access Private (Regional Officer)
 */
const getRegionPollingUnits = async (req, res, next) => {
    const { state } = req.params;
    const { page = 1, limit = 50, search, lga, ward } = req.query;
    const userId = req.user?.id || 'unknown';
    try {
        const filters = {
            state,
            lga: lga,
            ward: ward,
        };
        const result = await services_1.pollingUnitService.getPollingUnits(filters, search, Number(page), Number(limit));
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.REGION_POLLING_UNITS_VIEW, req.ip || '', req.headers['user-agent'] || '', { state, query: req.query, success: true });
        res.status(200).json({
            success: true,
            message: 'Polling units retrieved successfully',
            data: {
                pollingUnits: result.pollingUnits,
                pagination: {
                    total: result.pagination.total,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(result.pagination.total / Number(limit)),
                },
            },
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog(userId, AuditLog_1.AuditActionType.REGION_POLLING_UNITS_VIEW, req.ip || '', req.headers['user-agent'] || '', { state, query: req.query, success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log region polling units view error', logErr));
        next(error);
    }
};
exports.getRegionPollingUnits = getRegionPollingUnits;
/**
 * Create a new polling unit
 * @route POST /api/v1/admin/polling-units
 * @access Private (Regional Officer)
 */
const createPollingUnit = async (req, res, next) => {
    const { pollingUnitName, pollingUnitCode, address, state, lga, ward, latitude, longitude } = req.body;
    const userId = req.user?.id || 'unknown';
    try {
        if (!state || !lga || !ward) {
            throw new errorHandler_1.ApiError(400, 'State, LGA, and Ward are required to create a polling unit', 'MISSING_LOCATION_DATA');
        }
        const pollingUnit = await services_1.pollingUnitService.createPollingUnit(pollingUnitName, pollingUnitCode, address, state, lga, ward, latitude ? Number(latitude) : undefined, longitude ? Number(longitude) : undefined, undefined);
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.POLLING_UNIT_CREATE, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            pollingUnitId: pollingUnit.id,
            pollingUnitCode: pollingUnit.pollingUnitCode,
            state,
            lga,
            ward,
        });
        res.status(201).json({
            success: true,
            message: 'Polling unit created successfully',
            data: { pollingUnit },
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog(userId, AuditLog_1.AuditActionType.POLLING_UNIT_CREATE, req.ip || '', req.headers['user-agent'] || '', { success: false, pollingUnitCode, state, lga, ward, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log polling unit creation error', logErr));
        next(error);
    }
};
exports.createPollingUnit = createPollingUnit;
/**
 * Update a polling unit
 * @route PUT /api/v1/admin/polling-units/:pollingUnitId
 * @access Private (Regional Officer)
 */
const updatePollingUnit = async (req, res, next) => {
    const { pollingUnitId } = req.params;
    const { pollingUnitName, address, latitude, longitude } = req.body;
    const userId = req.user?.id || 'unknown';
    try {
        const existingPollingUnit = await services_1.pollingUnitService.getPollingUnitById(pollingUnitId);
        if (!existingPollingUnit) {
            throw new errorHandler_1.ApiError(404, 'Polling unit not found', 'RESOURCE_NOT_FOUND');
        }
        const updatedPollingUnit = await services_1.pollingUnitService.updatePollingUnit(pollingUnitId, {
            pollingUnitName,
            address,
            latitude: latitude ? Number(latitude) : undefined,
            longitude: longitude ? Number(longitude) : undefined,
        });
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.POLLING_UNIT_UPDATE, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            pollingUnitId,
            updatedFields: Object.keys(req.body)
                .filter(k => ['pollingUnitName', 'address', 'latitude', 'longitude'].includes(k))
                .join(', '),
        });
        res.status(200).json({
            success: true,
            message: 'Polling unit updated successfully',
            data: { pollingUnit: updatedPollingUnit },
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog(userId, AuditLog_1.AuditActionType.POLLING_UNIT_UPDATE, req.ip || '', req.headers['user-agent'] || '', {
            success: false,
            pollingUnitId,
            updatedFields: Object.keys(req.body).join(', '),
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log polling unit update error', logErr));
        next(error);
    }
};
exports.updatePollingUnit = updatePollingUnit;
/**
 * Get statistics for a region (state)
 * @route GET /api/v1/admin/regions/:state/statistics
 * @access Private (Regional Officer)
 */
const getRegionStatistics = async (req, res, next) => {
    const { state } = req.params;
    const userId = req.user?.id || 'unknown';
    try {
        const regionFilters = { state };
        const pollingUnitsCount = await services_1.pollingUnitService.countPollingUnitsByRegion(regionFilters);
        const registeredVotersCount = await services_1.pollingUnitService.countRegisteredVotersByRegion(regionFilters);
        const activeElections = await services_1.pollingUnitService.getActiveElectionsByRegion(regionFilters);
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.REGION_STATS_VIEW, req.ip || '', req.headers['user-agent'] || '', { state, success: true });
        res.status(200).json({
            success: true,
            message: 'Region statistics retrieved successfully',
            data: {
                region: {
                    id: state,
                    name: `State of ${state}`,
                },
                pollingUnitsCount,
                registeredVotersCount,
                activeElectionsCount: activeElections.length,
            },
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog(userId, AuditLog_1.AuditActionType.REGION_STATS_VIEW, req.ip || '', req.headers['user-agent'] || '', { state, success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log region stats view error', logErr));
        next(error);
    }
};
exports.getRegionStatistics = getRegionStatistics;
//# sourceMappingURL=regionalOfficerController.js.map