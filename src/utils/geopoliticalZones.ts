export interface GeopoliticalZone {
  name: string;
  states: string[];
}

export const NIGERIA_GEOPOLITICAL_ZONES: Record<string, GeopoliticalZone> = {
  'North Central': {
    name: 'North Central',
    states: ['Benue', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau', 'FCT'],
  },
  'North East': {
    name: 'North East',
    states: ['Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe'],
  },
  'North West': {
    name: 'North West',
    states: ['Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara'],
  },
  'South East': {
    name: 'South East',
    states: ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'],
  },
  'South South': {
    name: 'South South',
    states: ['Akwa Ibom', 'Bayelsa', 'Cross River', 'Delta', 'Edo', 'Rivers'],
  },
  'South West': {
    name: 'South West',
    states: ['Ekiti', 'Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo'],
  },
};

/**
 * Get the geopolitical zone for a given state
 * @param stateName - The name of the state
 * @returns The geopolitical zone name or null if state not found
 */
export const getGeopoliticalZone = (stateName: string): string | null => {
  const normalizedStateName = stateName.trim();

  for (const [zoneName, zone] of Object.entries(NIGERIA_GEOPOLITICAL_ZONES)) {
    if (zone.states.some(state => state.toLowerCase() === normalizedStateName.toLowerCase())) {
      return zoneName;
    }
  }

  return null;
};

/**
 * Get all states in a geopolitical zone
 * @param zoneName - The name of the geopolitical zone
 * @returns Array of states in the zone or empty array if zone not found
 */
export const getStatesInZone = (zoneName: string): string[] => {
  const zone = NIGERIA_GEOPOLITICAL_ZONES[zoneName];
  return zone ? zone.states : [];
};

/**
 * Get all geopolitical zones
 * @returns Array of all geopolitical zone names
 */
export const getAllGeopoliticalZones = (): string[] => {
  return Object.keys(NIGERIA_GEOPOLITICAL_ZONES);
};

/**
 * Validate if a state exists in Nigeria
 * @param stateName - The name of the state to validate
 * @returns boolean indicating if the state exists
 */
export const isValidNigerianState = (stateName: string): boolean => {
  return getGeopoliticalZone(stateName) !== null;
};
