/**
 * Utility functions for audit logging
 */

/**
 * Safely get user ID for audit logging
 * Returns null if userId is not a valid UUID to avoid validation errors
 * @param userId - The user ID to validate
 * @returns Valid UUID string or null
 */
export const getSafeUserIdForAudit = (userId: string | null | undefined): string | null => {
  if (!userId) {
    return null;
  }

  // Check if it's a valid UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(userId)) {
    return userId;
  }

  // If not a valid UUID, return null to avoid validation errors
  return null;
};

/**
 * Get user ID from request for audit logging
 * Safely handles both authenticated and unauthenticated requests
 * @param req - Express request object with optional user
 * @returns Valid UUID string or null
 */
export const getUserIdFromRequest = (req: any): string | null => {
  return getSafeUserIdForAudit(req.user?.id);
};
