import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { ApiError } from "./errorHandler";
import { logger } from "../config/logger";

// Define role hierarchy
const roleHierarchy: Record<string, number> = {
  SystemAdministrator: 100,
  ElectoralCommissioner: 90,
  SecurityOfficer: 85,
  SystemAuditor: 80,
  RegionalElectoralOfficer: 70,
  ElectionManager: 65,
  ResultVerificationOfficer: 60,
  PollingUnitOfficer: 50,
  VoterRegistrationOfficer: 45,
  CandidateRegistrationOfficer: 40,
  Observer: 20,
  Voter: 10,
};

// User roles
export enum UserRole {
  SYSTEM_ADMIN = "SystemAdministrator",
  ELECTORAL_COMMISSIONER = "ElectoralCommissioner",
  SECURITY_OFFICER = "SecurityOfficer",
  SYSTEM_AUDITOR = "SystemAuditor",
  REGIONAL_OFFICER = "RegionalElectoralOfficer",
  ELECTION_MANAGER = "ElectionManager",
  RESULT_VERIFICATION_OFFICER = "ResultVerificationOfficer",
  POLLING_UNIT_OFFICER = "PollingUnitOfficer",
  VOTER_REGISTRATION_OFFICER = "VoterRegistrationOfficer",
  CANDIDATE_REGISTRATION_OFFICER = "CandidateRegistrationOfficer",
  OBSERVER = "Observer",
  VOTER = "Voter",
}

// Permission constants
export enum Permission {
  // System permissions
  MANAGE_USERS = "manage_users",
  MANAGE_ROLES = "manage_roles",
  MANAGE_SYSTEM_SETTINGS = "manage_system_settings",
  VIEW_AUDIT_LOGS = "view_audit_logs",
  GENERATE_REPORTS = "generate_reports",

  // Election permissions
  CREATE_ELECTION = "create_election",
  EDIT_ELECTION = "edit_election",
  DELETE_ELECTION = "delete_election",
  MANAGE_CANDIDATES = "manage_candidates",
  PUBLISH_RESULTS = "publish_results",

  // Voter permissions
  REGISTER_VOTERS = "register_voters",
  VERIFY_VOTERS = "verify_voters",
  RESET_VOTER_PASSWORD = "reset_voter_password",

  // Polling unit permissions
  MANAGE_POLLING_UNITS = "manage_polling_units",
  ASSIGN_OFFICERS = "assign_officers",

  // Security permissions
  MANAGE_SECURITY_SETTINGS = "manage_security_settings",
  MANAGE_ENCRYPTION_KEYS = "manage_encryption_keys",
  VIEW_SECURITY_LOGS = "view_security_logs",

  // Result permissions
  VIEW_RESULTS = "view_results",
  VERIFY_RESULTS = "verify_results",
  EXPORT_RESULTS = "export_results",

  // Voting permissions
  CAST_VOTE = "cast_vote",
  VIEW_ELECTIONS = "view_elections",
}

// Default role permissions mapping
export const rolePermissions: Record<string, string[]> = {
  [UserRole.SYSTEM_ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.GENERATE_REPORTS,
    Permission.MANAGE_SECURITY_SETTINGS,
    Permission.MANAGE_ENCRYPTION_KEYS,
    Permission.VIEW_SECURITY_LOGS,
  ],
  [UserRole.ELECTORAL_COMMISSIONER]: [
    Permission.CREATE_ELECTION,
    Permission.EDIT_ELECTION,
    Permission.DELETE_ELECTION,
    Permission.MANAGE_CANDIDATES,
    Permission.PUBLISH_RESULTS,
    Permission.GENERATE_REPORTS,
    Permission.VIEW_RESULTS,
    Permission.EXPORT_RESULTS,
  ],
  [UserRole.SECURITY_OFFICER]: [
    Permission.MANAGE_SECURITY_SETTINGS,
    Permission.MANAGE_ENCRYPTION_KEYS,
    Permission.VIEW_SECURITY_LOGS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [UserRole.SYSTEM_AUDITOR]: [
    Permission.VIEW_AUDIT_LOGS,
    Permission.GENERATE_REPORTS,
    Permission.VIEW_SECURITY_LOGS,
  ],
  [UserRole.REGIONAL_OFFICER]: [
    Permission.MANAGE_POLLING_UNITS,
    Permission.ASSIGN_OFFICERS,
    Permission.VIEW_RESULTS,
  ],
  [UserRole.ELECTION_MANAGER]: [
    Permission.EDIT_ELECTION,
    Permission.MANAGE_CANDIDATES,
    Permission.VIEW_RESULTS,
    Permission.GENERATE_REPORTS,
  ],
  [UserRole.RESULT_VERIFICATION_OFFICER]: [
    Permission.VIEW_RESULTS,
    Permission.VERIFY_RESULTS,
    Permission.EXPORT_RESULTS,
  ],
  [UserRole.POLLING_UNIT_OFFICER]: [Permission.VERIFY_VOTERS],
  [UserRole.VOTER_REGISTRATION_OFFICER]: [
    Permission.REGISTER_VOTERS,
    Permission.VERIFY_VOTERS,
    Permission.RESET_VOTER_PASSWORD,
  ],
  [UserRole.CANDIDATE_REGISTRATION_OFFICER]: [Permission.MANAGE_CANDIDATES],
  [UserRole.OBSERVER]: [Permission.VIEW_ELECTIONS, Permission.VIEW_RESULTS],
  [UserRole.VOTER]: [Permission.VIEW_ELECTIONS, Permission.CAST_VOTE],
};

/**
 * Check if a role has a higher or equal level than another role
 * @param userRole The user's role
 * @param requiredRole The role to compare against
 */
const hasEqualOrHigherRole = (
  userRole: string,
  requiredRole: string,
): boolean => {
  const userRoleLevel = roleHierarchy[userRole] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  return userRoleLevel >= requiredRoleLevel;
};

/**
 * Check if user role has access to a specific permission
 * @param userRole User's role
 * @param requiredPermission Required permission
 */
const roleHasPermission = (
  userRole: string,
  requiredPermission: string,
): boolean => {
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes(requiredPermission);
};

/**
 * Middleware to require a minimum role level or one of the specified roles
 * @param roles The minimum role required or an array of acceptable roles
 */
export const requireRole = (roles: UserRole | UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        const error: ApiError = new Error("User not authenticated");
        error.statusCode = 401;
        error.code = "AUTHENTICATION_REQUIRED";
        error.isOperational = true;
        throw error;
      }

      // If roles is an array, check if user has any of the specified roles
      if (Array.isArray(roles)) {
        const userRole = req.user.role as string;

        if (!userRole) {
          const error: ApiError = new Error("User has no assigned role");
          error.statusCode = 403;
          error.code = "ROLE_REQUIRED";
          error.isOperational = true;
          throw error;
        }

        const hasRequiredRole = roles.some((role) =>
          hasEqualOrHigherRole(userRole, role),
        );

        if (!hasRequiredRole) {
          const error: ApiError = new Error("Insufficient permissions");
          error.statusCode = 403;
          error.code = "INSUFFICIENT_PERMISSIONS";
          error.isOperational = true;
          throw error;
        }
      } else {
        // Original logic for single role
        const userRole = req.user.role as string;

        if (!userRole) {
          const error: ApiError = new Error("User has no assigned role");
          error.statusCode = 403;
          error.code = "ROLE_REQUIRED";
          error.isOperational = true;
          throw error;
        }

        if (!hasEqualOrHigherRole(userRole, roles)) {
          const error: ApiError = new Error("Insufficient permissions");
          error.statusCode = 403;
          error.code = "INSUFFICIENT_PERMISSIONS";
          error.isOperational = true;
          throw error;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to require specific permissions
 * @param requiredPermissions The permissions required to access the resource
 */
export const requirePermission = (
  requiredPermissions: Permission | Permission[],
) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        const error: ApiError = new Error("User not authenticated");
        error.statusCode = 401;
        error.code = "AUTHENTICATION_REQUIRED";
        error.isOperational = true;
        throw error;
      }

      const userRole = req.user.role as string;
      const userPermissions = (req.user.permissions as string[]) || [];

      if (!userRole) {
        const error: ApiError = new Error("User has no assigned role");
        error.statusCode = 403;
        error.code = "ROLE_REQUIRED";
        error.isOperational = true;
        throw error;
      }

      // Convert to array if single permission
      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Check if user has explicit permissions or role-based permissions
      const hasAccess = permissions.every((permission) => {
        return (
          userPermissions.includes(permission) ||
          roleHasPermission(userRole, permission)
        );
      });

      if (!hasAccess) {
        const error: ApiError = new Error("Insufficient permissions");
        error.statusCode = 403;
        error.code = "INSUFFICIENT_PERMISSIONS";
        error.isOperational = true;
        throw error;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to require regional access
 * @param regionParam The request parameter containing the region ID
 */
export const requireRegionalAccess = (regionParam: string = "regionId") => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        const error: ApiError = new Error("User not authenticated");
        error.statusCode = 401;
        error.code = "AUTHENTICATION_REQUIRED";
        error.isOperational = true;
        throw error;
      }

      const userRole = req.user.role as string;
      const userRegions = (req.user.regions as string[]) || [];
      const regionId = req.params[regionParam] || req.query[regionParam];

      // System administrators and electoral commissioners have access to all regions
      if (
        userRole === UserRole.SYSTEM_ADMIN ||
        userRole === UserRole.ELECTORAL_COMMISSIONER
      ) {
        return next();
      }

      // Regional officers need to have access to the specific region
      if (!regionId) {
        const error: ApiError = new Error("Region ID is required");
        error.statusCode = 400;
        error.code = "REGION_REQUIRED";
        error.isOperational = true;
        throw error;
      }

      const regionIdStr = String(regionId);
      if (!userRegions.includes(regionIdStr)) {
        const error: ApiError = new Error("Access denied for this region");
        error.statusCode = 403;
        error.code = "REGION_ACCESS_DENIED";
        error.isOperational = true;
        throw error;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to log access attempts
 */
export const logAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;

  if (user) {
    logger.info({
      message: "API access",
      userId: user.id,
      role: user.role,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  next();
};
