import { Op, WhereOptions } from 'sequelize';
import PollingUnit from '../db/models/PollingUnit';
import { ApiError } from '../middleware/errorHandler';
import { logWarn } from '../utils/logger';

/**
 * Get all polling units with pagination and filtering
 */
export const getPollingUnits = async (
  filters: { state?: string; lga?: string; ward?: string },
  search?: string,
  page: number = 1,
  limit: number = 50,
): Promise<{
  pollingUnits: PollingUnit[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  // Build filter conditions
  const whereConditions: WhereOptions = {};

  // Apply region filters
  if (filters.state) whereConditions.state = filters.state;
  if (filters.lga) whereConditions.lga = filters.lga;
  if (filters.ward) whereConditions.ward = filters.ward;

  if (search) {
    (whereConditions as any)[Op.or] = [
      { pollingUnitName: { [Op.iLike]: `%${search}%` } },
      { pollingUnitCode: { [Op.iLike]: `%${search}%` } },
      { address: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Calculate pagination
  const offset = (page - 1) * limit;

  // Fetch polling units with pagination
  const { count, rows: pollingUnits } = await PollingUnit.findAndCountAll({
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

/**
 * Get polling unit by ID
 */
export const getPollingUnitById = async (id: string): Promise<PollingUnit> => {
  const pollingUnit = await PollingUnit.findByPk(id);

  if (!pollingUnit) {
    throw new ApiError(404, 'Polling unit not found');
  }

  return pollingUnit;
};

/**
 * Get polling unit by code
 */
export const getPollingUnitByCode = async (code: string): Promise<PollingUnit> => {
  const pollingUnit = await PollingUnit.findOne({
    where: { pollingUnitCode: code },
  });
  if (!pollingUnit) {
    throw new ApiError(404, 'Polling unit not found');
  }
  return pollingUnit;
};

/**
 * Create a new polling unit
 */
export const createPollingUnit = async (
  pollingUnitName: string,
  pollingUnitCode: string,
  address: string | null,
  state: string,
  lga: string,
  ward: string,
  latitude?: number,
  longitude?: number,
  registeredVoters?: number,
): Promise<PollingUnit> => {
  // Check if polling unit with same code already exists
  const existingUnit = await PollingUnit.findOne({
    where: { pollingUnitCode },
  });

  if (existingUnit) {
    throw new ApiError(409, 'Polling unit with this code already exists');
  }

  // Create new polling unit
  const pollingUnit = await PollingUnit.create({
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

/**
 * Update a polling unit
 */
export const updatePollingUnit = async (
  id: string,
  updates: {
    pollingUnitName?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    registeredVoters?: number;
    isActive?: boolean;
    assignedOfficer?: string | null;
  },
): Promise<PollingUnit> => {
  const pollingUnit = await PollingUnit.findByPk(id);

  if (!pollingUnit) {
    throw new ApiError(404, 'Polling unit not found');
  }

  // Update fields
  await pollingUnit.update(updates);

  return pollingUnit;
};

/**
 * Get nearby polling units based on coordinates
 */
export const getNearbyPollingUnits = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  limit: number = 10,
): Promise<PollingUnit[]> => {
  // This is a simplified implementation
  // In a real application, you would use a spatial database or a more sophisticated algorithm

  // Convert radius from km to degrees (approximate)
  const radiusDegrees = radiusKm / 111;

  const pollingUnits = await PollingUnit.findAll({
    where: {
      latitude: {
        [Op.between]: [latitude - radiusDegrees, latitude + radiusDegrees],
      },
      longitude: {
        [Op.between]: [longitude - radiusDegrees, longitude + radiusDegrees],
      },
    },
    limit,
  });

  // Sort by distance (simplified calculation)
  return pollingUnits.sort((a, b) => {
    const distA = Math.sqrt(
      Math.pow((a.latitude || 0) - latitude, 2) + Math.pow((a.longitude || 0) - longitude, 2),
    );
    const distB = Math.sqrt(
      Math.pow((b.latitude || 0) - latitude, 2) + Math.pow((b.longitude || 0) - longitude, 2),
    );
    return distA - distB;
  });
};

/**
 * Get voter's assigned polling unit
 */
export const getVoterPollingUnit = (voterId: string) => {
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

/**
 * Count polling units by region
 */
export const countPollingUnitsByRegion = (filters: {
  state?: string;
  lga?: string;
  ward?: string;
}): Promise<number> => {
  // TODO: Implement actual counting logic
  const whereConditions: WhereOptions = {};
  if (filters.state) whereConditions.state = filters.state;
  if (filters.lga) whereConditions.lga = filters.lga;
  if (filters.ward) whereConditions.ward = filters.ward;
  return PollingUnit.count({ where: whereConditions }); // Example implementation
  // return Promise.resolve(25);
};

/**
 * Count registered voters by region
 */
export const countRegisteredVotersByRegion = async (filters: {
  state?: string;
  lga?: string;
  ward?: string;
}): Promise<number> => {
  logWarn('countRegisteredVotersByRegion is using mock data');
  // TODO: Implement actual counting logic (summing registeredVoters)
  const whereConditions: WhereOptions = {};
  if (filters.state) whereConditions.state = filters.state;
  if (filters.lga) whereConditions.lga = filters.lga;
  if (filters.ward) whereConditions.ward = filters.ward;
  const result = await PollingUnit.sum('registeredVoters', { where: whereConditions });
  return result || 0; // Example implementation
  // return Promise.resolve(15000);
};

/**
 * Get active elections by region
 */
export const getActiveElectionsByRegion = (_filters: {
  state?: string;
  lga?: string;
  ward?: string;
}): Promise<any[]> => {
  logWarn('getActiveElectionsByRegion is using mock data');
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
