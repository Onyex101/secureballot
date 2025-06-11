import Voter from '../db/models/Voter';
import VerificationStatus from '../db/models/VerificationStatus';
import PollingUnit from '../db/models/PollingUnit';
/**
 * Get voter profile by ID
 */
export declare const getVoterProfile: (voterId: string) => Promise<any>;
/**
 * Update voter profile
 */
export declare const updateVoterProfile: (voterId: string, updates: {
    phoneNumber?: string;
    dateOfBirth?: Date;
}) => Promise<Voter>;
/**
 * Get voter's assigned polling unit
 */
export declare const getVoterPollingUnit: (voterId: string) => Promise<PollingUnit>;
/**
 * Check voter eligibility for an election
 */
export declare const checkVoterEligibility: (voterId: string, electionId: string) => Promise<{
    isEligible: boolean;
    reason?: string;
}>;
/**
 * Request verification
 */
export declare const requestVerification: (voterId: string) => Promise<VerificationStatus>;
/**
 * Change voter password - Deprecated with new authentication system
 */
export declare const changePassword: (_voterId: string, _currentPassword: string, _newPassword: string) => Promise<boolean>;
/**
 * Get voter public key
 */
export declare const getVoterPublicKey: (voterId: string) => Promise<string | null>;
/**
 * Get total voter count
 */
export declare const getVoterCount: () => Promise<number>;
/**
 * Get voter by NIN (National Identification Number)
 */
export declare const getVoterByNin: (nin: string) => Promise<any>;
