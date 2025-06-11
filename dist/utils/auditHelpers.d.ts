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
 * Create audit log entry for voters only
 * Admin routes should use createAdminLog instead
 * @param req - Express request object with authentication info
 * @param actionType - Type of action being logged
 * @param actionDetails - Additional details about the action
 * @param isSuspicious - Whether this action is suspicious (optional)
 * @returns Promise that resolves when audit log is created
 */
export declare const createVoterAuditLog: (req: AuthRequest, actionType: string, actionDetails?: any, isSuspicious?: boolean) => Promise<any>;
/**
 * Universal audit logging function that checks user type and routes appropriately
 * - Admin users: Use admin logs with appropriate admin action
 * - Voter users: Use audit logs with provided audit action type
 * @param req - Express request object with authentication info
 * @param auditActionType - Audit action type for voters
 * @param adminAction - Admin action for admin users
 * @param resourceType - Resource type for admin logs
 * @param resourceId - Resource ID for admin logs (optional)
 * @param actionDetails - Additional details about the action
 * @param isSuspicious - Whether this action is suspicious (optional, audit logs only)
 * @returns Promise that resolves when log is created
 */
export declare const createContextualLog: (req: AuthRequest, auditActionType: string, adminAction: string, resourceType: string, resourceId?: string | null, actionDetails?: any, isSuspicious?: boolean) => Promise<any>;
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
