/**
 * Utility functions for audit logging
 */
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
