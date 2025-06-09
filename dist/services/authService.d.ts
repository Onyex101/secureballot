import Voter from '../db/models/Voter';
import AdminUser from '../db/models/AdminUser';
interface VoterRegistrationData {
    nin: string;
    vin: string;
    phoneNumber: string;
    dateOfBirth: Date;
    password: string;
    fullName: string;
    pollingUnitCode: string;
    state: string;
    gender: string;
    lga: string;
    ward: string;
}
/**
 * Check if a voter exists with the given NIN or VIN
 */
export declare const checkVoterExists: (nin: string, vin: string) => Promise<boolean>;
/**
 * Register a new voter
 */
export declare const registerVoter: (data: VoterRegistrationData) => Promise<Voter>;
/**
 * Authenticate a voter
 */
export declare const authenticateVoter: (identifier: string, password: string) => Promise<{
    id: string;
    nin: string;
    vin: string;
    phoneNumber: string;
    fullName: string;
    dateOfBirth: Date;
    pollingUnitCode: string;
    state: string;
    lga: string;
    ward: string;
    gender: string;
    isActive: boolean;
    lastLogin: Date | null;
    mfaEnabled: boolean;
    requiresMfa: boolean;
    createdAt: Date;
}>;
/**
 * Authenticate a voter for USSD
 */
export declare const authenticateVoterForUssd: (nin: string, vin: string, phoneNumber: string) => Promise<{
    id: string;
    nin: string;
    vin: string;
    phoneNumber: string;
}>;
/**
 * Authenticate an admin user
 */
export declare const authenticateAdmin: (email: string, password: string) => Promise<AdminUser>;
/**
 * Generate JWT token
 */
export declare const generateToken: (userId: string, role?: string, expiresIn?: string) => string;
/**
 * Generate password reset token
 */
export declare const generatePasswordResetToken: (phoneNumber: string) => Promise<{
    token: string;
    expiryDate: Date;
}>;
/**
 * Reset password using token
 */
export declare const resetPassword: (token: string, newPassword: string) => Promise<boolean>;
/**
 * Log user out (invalidate token)
 * Note: In a real implementation, you might use a token blacklist or Redis
 */
export declare const logoutUser: (userId: string) => Promise<boolean>;
export {};
