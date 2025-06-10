export interface GeopoliticalZone {
    name: string;
    states: string[];
}
export declare const NIGERIA_GEOPOLITICAL_ZONES: Record<string, GeopoliticalZone>;
/**
 * Get the geopolitical zone for a given state
 * @param stateName - The name of the state
 * @returns The geopolitical zone name or null if state not found
 */
export declare const getGeopoliticalZone: (stateName: string) => string | null;
/**
 * Get all states in a geopolitical zone
 * @param zoneName - The name of the geopolitical zone
 * @returns Array of states in the zone or empty array if zone not found
 */
export declare const getStatesInZone: (zoneName: string) => string[];
/**
 * Get all geopolitical zones
 * @returns Array of all geopolitical zone names
 */
export declare const getAllGeopoliticalZones: () => string[];
/**
 * Validate if a state exists in Nigeria
 * @param stateName - The name of the state to validate
 * @returns boolean indicating if the state exists
 */
export declare const isValidNigerianState: (stateName: string) => boolean;
