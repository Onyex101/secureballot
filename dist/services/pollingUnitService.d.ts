import PollingUnit from '../db/models/PollingUnit';
/**
 * Get all polling units with pagination and filtering
 */
export declare const getPollingUnits: (filters: {
    state?: string;
    lga?: string;
    ward?: string;
}, search?: string, page?: number, limit?: number) => Promise<{
    pollingUnits: PollingUnit[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
/**
 * Get polling unit by ID
 */
export declare const getPollingUnitById: (id: string) => Promise<PollingUnit>;
/**
 * Get polling unit by code
 */
export declare const getPollingUnitByCode: (code: string) => Promise<PollingUnit>;
/**
 * Create a new polling unit
 */
export declare const createPollingUnit: (pollingUnitName: string, pollingUnitCode: string, address: string | null, state: string, lga: string, ward: string, latitude?: number, longitude?: number, registeredVoters?: number) => Promise<PollingUnit>;
/**
 * Update a polling unit
 */
export declare const updatePollingUnit: (id: string, updates: {
    pollingUnitName?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    registeredVoters?: number;
    isActive?: boolean;
    assignedOfficer?: string | null;
}) => Promise<PollingUnit>;
/**
 * Get nearby polling units based on coordinates
 */
export declare const getNearbyPollingUnits: (latitude: number, longitude: number, radiusKm?: number, limit?: number) => Promise<PollingUnit[]>;
/**
 * Get voter's assigned polling unit
 */
export declare const getVoterPollingUnit: (voterId: string) => {
    id: string;
    pollingUnit: {
        id: string;
        pollingUnitName: string;
        pollingUnitCode: string;
        address: string;
        state: string;
        lga: string;
        ward: string;
        latitude: number;
        longitude: number;
        registeredVoters: number;
    };
};
/**
 * Count polling units by region
 */
export declare const countPollingUnitsByRegion: (filters: {
    state?: string;
    lga?: string;
    ward?: string;
}) => Promise<number>;
/**
 * Count registered voters by region
 */
export declare const countRegisteredVotersByRegion: (filters: {
    state?: string;
    lga?: string;
    ward?: string;
}) => Promise<number>;
/**
 * Get active elections by region
 */
export declare const getActiveElectionsByRegion: (_filters: {
    state?: string;
    lga?: string;
    ward?: string;
}) => Promise<any[]>;
