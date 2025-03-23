import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import PollingUnit from '../db/models/PollingUnit';

/**
 * Get all polling units with pagination and filtering
 */
export const getPollingUnits = async (
  regionId?: string,
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
  const whereConditions: any = {};

  if (regionId) {
    whereConditions.regionId = regionId;
  }

  if (search) {
    whereConditions[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { code: { [Op.like]: `%${search}%` } },
      { address: { [Op.like]: `%${search}%` } },
    ];
  }

  // Calculate pagination
  const offset = (page - 1) * limit;

  // Fetch polling units with pagination
  const { count, rows: pollingUnits } = await PollingUnit.findAndCountAll({
    where: whereConditions,
    limit,
    offset,
    order: [['name', 'ASC']],
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
    throw new Error('Polling unit not found');
  }

  return pollingUnit;
};

/**
 * Get polling unit by code
 */
export const getPollingUnitByCode = async (code: string): Promise<PollingUnit | null> => {
  return await PollingUnit.findOne({
    where: { pollingUnitCode: code },
  });
};

/**
 * Create a new polling unit
 */
export const createPollingUnit = async (
  name: string,
  code: string,
  address: string,
  regionId: string,
  latitude?: number,
  longitude?: number,
): Promise<PollingUnit> => {
  // Check if polling unit with same code already exists
  const existingUnit = await PollingUnit.findOne({
    where: { pollingUnitCode: code },
  });

  if (existingUnit) {
    throw new Error('Polling unit with this code already exists');
  }

  // Create new polling unit
  const pollingUnit = await PollingUnit.create({
    id: uuidv4(),
    pollingUnitName: name,
    pollingUnitCode: code,
    address,
    state: regionId.split('-')[0], // Assuming regionId format is "state-lga-ward"
    lga: regionId.split('-')[1] || '',
    ward: regionId.split('-')[2] || '',
    latitude,
    longitude,
    registeredVoters: 0,
  });

  return pollingUnit;
};

/**
 * Update a polling unit
 */
export const updatePollingUnit = async (
  id: string,
  updates: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  },
): Promise<PollingUnit> => {
  const pollingUnit = await PollingUnit.findByPk(id);

  if (!pollingUnit) {
    throw new Error('Polling unit not found');
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
export const getVoterPollingUnit = async (voterId: string) => {
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
export const countPollingUnitsByRegion = async (regionId: string): Promise<number> => {
  // In a real implementation, this would count polling units in the region
  // For now, returning mock data
  return 25;
};

/**
 * Count registered voters by region
 */
export const countRegisteredVotersByRegion = async (regionId: string): Promise<number> => {
  // In a real implementation, this would sum registered voters in the region
  // For now, returning mock data
  return 15000;
};

/**
 * Get active elections by region
 */
export const getActiveElectionsByRegion = async (regionId: string): Promise<any[]> => {
  // In a real implementation, this would fetch active elections for the region
  // For now, returning mock data
  return [
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
  ];
};
