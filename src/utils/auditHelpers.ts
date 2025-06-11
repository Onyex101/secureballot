/**
 * Utility functions for audit logging
 */

import { AuthRequest } from '../middleware/auth';
import { auditService } from '../services';
import * as adminLogService from '../services/adminLogService';

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

/**
 * Create audit log entry for voters only
 * Admin routes should use createAdminLog instead
 * @param req - Express request object with authentication info
 * @param actionType - Type of action being logged
 * @param actionDetails - Additional details about the action
 * @param isSuspicious - Whether this action is suspicious (optional)
 * @returns Promise that resolves when audit log is created
 */
export const createVoterAuditLog = (
  req: AuthRequest,
  actionType: string,
  actionDetails?: any,
  isSuspicious?: boolean,
): Promise<any> => {
  const ipAddress = req.ip || '';
  const userAgent = req.headers['user-agent'] || '';
  const userId = getSafeUserIdForAudit(req.user?.id);

  return auditService.createAuditLog(userId, actionType, ipAddress, userAgent, {
    ...actionDetails,
    userType: req.userType || 'voter',
    ...(isSuspicious !== undefined && { isSuspicious }),
  });
};

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
export const createContextualLog = (
  req: AuthRequest,
  auditActionType: string,
  adminAction: string,
  resourceType: string,
  resourceId?: string | null,
  actionDetails?: any,
  isSuspicious?: boolean,
): Promise<any> => {
  if (req.userType === 'admin') {
    // Admin users use admin logs
    return createAdminLog(req, adminAction, resourceType, resourceId, actionDetails);
  } else {
    // Voters use audit logs
    return createVoterAuditLog(req, auditActionType, actionDetails, isSuspicious);
  }
};

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
export const createAdminLog = (
  req: AuthRequest,
  action: string,
  resourceType: string,
  resourceId?: string | null,
  details?: any,
): Promise<any> => {
  const ipAddress = req.ip || '';
  const userAgent = req.headers['user-agent'] || '';
  const adminId = getSafeUserIdForAudit(req.user?.id);

  return adminLogService.createAdminLog(
    adminId,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
  );
};
