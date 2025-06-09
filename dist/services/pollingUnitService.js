"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveElectionsByRegion = exports.countRegisteredVotersByRegion = exports.countPollingUnitsByRegion = exports.getVoterPollingUnit = exports.getNearbyPollingUnits = exports.updatePollingUnit = exports.createPollingUnit = exports.getPollingUnitByCode = exports.getPollingUnitById = exports.getPollingUnits = void 0;
const sequelize_1 = require("sequelize");
const PollingUnit_1 = __importDefault(require("../db/models/PollingUnit"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
/**
 * Get all polling units with pagination and filtering
 */
const getPollingUnits = async (filters, search, page = 1, limit = 50) => {
    // Build filter conditions
    const whereConditions = {};
    // Apply region filters
    if (filters.state)
        whereConditions.state = filters.state;
    if (filters.lga)
        whereConditions.lga = filters.lga;
    if (filters.ward)
        whereConditions.ward = filters.ward;
    if (search) {
        whereConditions[sequelize_1.Op.or] = [
            { pollingUnitName: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { pollingUnitCode: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { address: { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    // Calculate pagination
    const offset = (page - 1) * limit;
    // Fetch polling units with pagination
    const { count, rows: pollingUnits } = await PollingUnit_1.default.findAndCountAll({
        where: whereConditions,
        limit,
        offset,
        order: [['pollingUnitName', 'ASC']],
    });
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    return {
        pollingUnits,
        pagination: {
            total: count,
            page,
            limit,
            totalPages,
        },
    };
};
exports.getPollingUnits = getPollingUnits;
/**
 * Get polling unit by ID
 */
const getPollingUnitById = async (id) => {
    const pollingUnit = await PollingUnit_1.default.findByPk(id);
    if (!pollingUnit) {
        throw new errorHandler_1.ApiError(404, 'Polling unit not found');
    }
    return pollingUnit;
};
exports.getPollingUnitById = getPollingUnitById;
/**
 * Get polling unit by code
 */
const getPollingUnitByCode = async (code) => {
    const pollingUnit = await PollingUnit_1.default.findOne({
        where: { pollingUnitCode: code },
    });
    if (!pollingUnit) {
        throw new errorHandler_1.ApiError(404, 'Polling unit not found');
    }
    return pollingUnit;
};
exports.getPollingUnitByCode = getPollingUnitByCode;
/**
 * Create a new polling unit
 */
const createPollingUnit = async (pollingUnitName, pollingUnitCode, address, state, lga, ward, latitude, longitude, registeredVoters) => {
    // Check if polling unit with same code already exists
    const existingUnit = await PollingUnit_1.default.findOne({
        where: { pollingUnitCode },
    });
    if (existingUnit) {
        throw new errorHandler_1.ApiError(409, 'Polling unit with this code already exists');
    }
    // Create new polling unit
    const pollingUnit = await PollingUnit_1.default.create({
        pollingUnitName,
        pollingUnitCode,
        address,
        state,
        lga,
        ward,
        latitude,
        longitude,
        registeredVoters: registeredVoters || 0,
    });
    return pollingUnit;
};
exports.createPollingUnit = createPollingUnit;
/**
 * Update a polling unit
 */
const updatePollingUnit = async (id, updates) => {
    const pollingUnit = await PollingUnit_1.default.findByPk(id);
    if (!pollingUnit) {
        throw new errorHandler_1.ApiError(404, 'Polling unit not found');
    }
    // Update fields
    await pollingUnit.update(updates);
    return pollingUnit;
};
exports.updatePollingUnit = updatePollingUnit;
/**
 * Get nearby polling units based on coordinates
 */
const getNearbyPollingUnits = async (latitude, longitude, radiusKm = 5, limit = 10) => {
    // This is a simplified implementation
    // In a real application, you would use a spatial database or a more sophisticated algorithm
    // Convert radius from km to degrees (approximate)
    const radiusDegrees = radiusKm / 111;
    const pollingUnits = await PollingUnit_1.default.findAll({
        where: {
            latitude: {
                [sequelize_1.Op.between]: [latitude - radiusDegrees, latitude + radiusDegrees],
            },
            longitude: {
                [sequelize_1.Op.between]: [longitude - radiusDegrees, longitude + radiusDegrees],
            },
        },
        limit,
    });
    // Sort by distance (simplified calculation)
    return pollingUnits.sort((a, b) => {
        const distA = Math.sqrt(Math.pow((a.latitude || 0) - latitude, 2) + Math.pow((a.longitude || 0) - longitude, 2));
        const distB = Math.sqrt(Math.pow((b.latitude || 0) - latitude, 2) + Math.pow((b.longitude || 0) - longitude, 2));
        return distA - distB;
    });
};
exports.getNearbyPollingUnits = getNearbyPollingUnits;
/**
 * Get voter's assigned polling unit
 */
const getVoterPollingUnit = (voterId) => {
    // In a real implementation, this would fetch the voter's assigned polling unit from the database
    // For now, returning mock data
    return {
        id: voterId,
        pollingUnit: {
            id: 'pu-123',
            pollingUnitName: 'Ward 1 Polling Unit 5',
            pollingUnitCode: 'PU12345',
            address: '123 Main Street, Lagos',
            state: 'Lagos',
            lga: 'Ikeja',
            ward: 'Ward 1',
            latitude: 6.5244,
            longitude: 3.3792,
            registeredVoters: 1500,
        },
    };
};
exports.getVoterPollingUnit = getVoterPollingUnit;
/**
 * Count polling units by region
 */
const countPollingUnitsByRegion = (filters) => {
    // TODO: Implement actual counting logic
    const whereConditions = {};
    if (filters.state)
        whereConditions.state = filters.state;
    if (filters.lga)
        whereConditions.lga = filters.lga;
    if (filters.ward)
        whereConditions.ward = filters.ward;
    return PollingUnit_1.default.count({ where: whereConditions }); // Example implementation
    // return Promise.resolve(25);
};
exports.countPollingUnitsByRegion = countPollingUnitsByRegion;
/**
 * Count registered voters by region
 */
const countRegisteredVotersByRegion = async (filters) => {
    (0, logger_1.logWarn)('countRegisteredVotersByRegion is using mock data');
    // TODO: Implement actual counting logic (summing registeredVoters)
    const whereConditions = {};
    if (filters.state)
        whereConditions.state = filters.state;
    if (filters.lga)
        whereConditions.lga = filters.lga;
    if (filters.ward)
        whereConditions.ward = filters.ward;
    const result = await PollingUnit_1.default.sum('registeredVoters', { where: whereConditions });
    return result || 0; // Example implementation
    // return Promise.resolve(15000);
};
exports.countRegisteredVotersByRegion = countRegisteredVotersByRegion;
/**
 * Get active elections by region
 */
const getActiveElectionsByRegion = (_filters) => {
    (0, logger_1.logWarn)('getActiveElectionsByRegion is using mock data');
    // TODO: Implement actual fetching logic (This is complex, depends on how elections map to regions)
    // Might involve checking election eligibility rules against region filters.
    return Promise.resolve([
        {
            id: 'election-1',
            electionName: 'Presidential Election 2023',
            electionType: 'Presidential',
            startDate: new Date('2023-02-25'),
            endDate: new Date('2023-02-25'),
        },
        {
            id: 'election-2',
            electionName: 'Gubernatorial Election 2023',
            electionType: 'Gubernatorial',
            startDate: new Date('2023-03-11'),
            endDate: new Date('2023-03-11'),
        },
    ]);
};
exports.getActiveElectionsByRegion = getActiveElectionsByRegion;
//# sourceMappingURL=pollingUnitService.js.map