/**
 * Utility functions for audit logging
 */
import { AuthRequest } from '../middleware/auth';
/**
 * Safely get user ID for audit logging
 * Returns null if userId is not a valid UUID to avoid validation errors
 * @param userId - The user ID to validate
 * @returns Valid UUID string or null
 */
export declare const getSafeUserIdForAudit: (userId: string | null | undefined) => string | null;
/**
 * Get user ID from request for audit logging
 * Safely handles both authenticated and unauthenticated requests
 * @param req - Express request object with optional user
 * @returns Valid UUID string or null
 */
export declare const getUserIdFromRequest: (req: any) => string | null;
/**
 * Create audit log entry that automatically detects admin vs voter user
 * Uses the appropriate audit service function based on user type
 * @param req - Express request object with authentication info
 * @param actionType - Type of action being logged
 * @param actionDetails - Additional details about the action
 * @param isSuspicious - Whether this action is suspicious (optional)
 * @returns Promise that resolves when audit log is created
 */
export declare const createContextualAuditLog: (req: AuthRequest, actionType: string, actionDetails?: any, isSuspicious?: boolean) => Promise<any>;
/**
 * Create admin log entry for admin-specific actions
 * This should be used for all admin routes instead of audit logs
 * @param req - Express request object with authentication info
 * @param action - Admin action being performed
 * @param resourceType - Type of resource being acted upon
 * @param resourceId - ID of the specific resource (optional)
 * @param details - Additional details about the action
 * @returns Promise that resolves when admin log is created
 */
export declare const createAdminLog: (req: AuthRequest, action: string, resourceType: string, resourceId?: string | null, details?: any) => Promise<any>;
