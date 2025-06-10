"use strict";
/**
 * Utility functions for audit logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserIdFromRequest = exports.getSafeUserIdForAudit = void 0;
/**
 * Safely get user ID for audit logging
 * Returns null if userId is not a valid UUID to avoid validation errors
 * @param userId - The user ID to validate
 * @returns Valid UUID string or null
 */
const getSafeUserIdForAudit = (userId) => {
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
exports.getSafeUserIdForAudit = getSafeUserIdForAudit;
/**
 * Get user ID from request for audit logging
 * Safely handles both authenticated and unauthenticated requests
 * @param req - Express request object with optional user
 * @returns Valid UUID string or null
 */
const getUserIdFromRequest = (req) => {
    return (0, exports.getSafeUserIdForAudit)(req.user?.id);
};
exports.getUserIdFromRequest = getUserIdFromRequest;
//# sourceMappingURL=auditHelpers.js.map