"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidNigerianState = exports.getAllGeopoliticalZones = exports.getStatesInZone = exports.getGeopoliticalZone = exports.NIGERIA_GEOPOLITICAL_ZONES = void 0;
exports.NIGERIA_GEOPOLITICAL_ZONES = {
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
const getGeopoliticalZone = (stateName) => {
    const normalizedStateName = stateName.trim();
    for (const [zoneName, zone] of Object.entries(exports.NIGERIA_GEOPOLITICAL_ZONES)) {
        if (zone.states.some(state => state.toLowerCase() === normalizedStateName.toLowerCase())) {
            return zoneName;
        }
    }
    return null;
};
exports.getGeopoliticalZone = getGeopoliticalZone;
/**
 * Get all states in a geopolitical zone
 * @param zoneName - The name of the geopolitical zone
 * @returns Array of states in the zone or empty array if zone not found
 */
const getStatesInZone = (zoneName) => {
    const zone = exports.NIGERIA_GEOPOLITICAL_ZONES[zoneName];
    return zone ? zone.states : [];
};
exports.getStatesInZone = getStatesInZone;
/**
 * Get all geopolitical zones
 * @returns Array of all geopolitical zone names
 */
const getAllGeopoliticalZones = () => {
    return Object.keys(exports.NIGERIA_GEOPOLITICAL_ZONES);
};
exports.getAllGeopoliticalZones = getAllGeopoliticalZones;
/**
 * Validate if a state exists in Nigeria
 * @param stateName - The name of the state to validate
 * @returns boolean indicating if the state exists
 */
const isValidNigerianState = (stateName) => {
    return (0, exports.getGeopoliticalZone)(stateName) !== null;
};
exports.isValidNigerianState = isValidNigerianState;
//# sourceMappingURL=geopoliticalZones.js.map