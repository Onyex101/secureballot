import AdminUser from '../db/models/AdminUser';
import { UserRole } from '../types';
/**
 * Get users with filtering and pagination
 */
export declare const getUsers: (role?: string, status?: string, page?: number, limit?: number) => Promise<{
    users: AdminUser[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
/**
 * Check if a user with the given email exists
 */
export declare const checkUserExists: (email: string) => Promise<boolean>;
/**
 * Create a new admin user
 */
export declare const createAdminUser: (email: string, fullName: string, phoneNumber: string, password: string, role: UserRole, createdById: string) => Promise<{
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
}>;
/**
 * Get admin user profile by ID
 */
export declare const getAdminProfile: (userId: string) => Promise<{
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    adminType: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin: Date | null;
    mfaEnabled: boolean;
    creator: {
        id: string;
        fullName: string;
        email: string;
    } | null;
}>;
