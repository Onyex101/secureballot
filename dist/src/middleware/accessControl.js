"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAccess = exports.requireRegionalAccess = exports.requirePermission = exports.requireRole = exports.rolePermissions = void 0;
const errorHandler_1 = require("./errorHandler");
const logger_1 = require("../config/logger");
const types_1 = require("../types");
// Define role hierarchy
const roleHierarchy = {
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
// Default role permissions mapping
exports.rolePermissions = {
    [types_1.UserRole.SYSTEM_ADMIN]: [
        types_1.Permission.MANAGE_USERS,
        types_1.Permission.MANAGE_ROLES,
        types_1.Permission.MANAGE_SYSTEM_SETTINGS,
        types_1.Permission.VIEW_AUDIT_LOGS,
        types_1.Permission.GENERATE_REPORTS,
        types_1.Permission.MANAGE_SECURITY_SETTINGS,
        types_1.Permission.MANAGE_ENCRYPTION_KEYS,
        types_1.Permission.VIEW_SECURITY_LOGS,
    ],
    [types_1.UserRole.ELECTORAL_COMMISSIONER]: [
        types_1.Permission.CREATE_ELECTION,
        types_1.Permission.EDIT_ELECTION,
        types_1.Permission.DELETE_ELECTION,
        types_1.Permission.MANAGE_CANDIDATES,
        types_1.Permission.PUBLISH_RESULTS,
        types_1.Permission.GENERATE_REPORTS,
        types_1.Permission.VIEW_RESULTS,
        types_1.Permission.EXPORT_RESULTS,
    ],
    [types_1.UserRole.SECURITY_OFFICER]: [
        types_1.Permission.MANAGE_SECURITY_SETTINGS,
        types_1.Permission.MANAGE_ENCRYPTION_KEYS,
        types_1.Permission.VIEW_SECURITY_LOGS,
        types_1.Permission.VIEW_AUDIT_LOGS,
    ],
    [types_1.UserRole.SYSTEM_AUDITOR]: [
        types_1.Permission.VIEW_AUDIT_LOGS,
        types_1.Permission.GENERATE_REPORTS,
        types_1.Permission.VIEW_SECURITY_LOGS,
    ],
    [types_1.UserRole.REGIONAL_OFFICER]: [
        types_1.Permission.MANAGE_POLLING_UNITS,
        types_1.Permission.ASSIGN_OFFICERS,
        types_1.Permission.VIEW_RESULTS,
    ],
    [types_1.UserRole.ELECTION_MANAGER]: [
        types_1.Permission.EDIT_ELECTION,
        types_1.Permission.MANAGE_CANDIDATES,
        types_1.Permission.VIEW_RESULTS,
        types_1.Permission.GENERATE_REPORTS,
    ],
    [types_1.UserRole.RESULT_VERIFICATION_OFFICER]: [
        types_1.Permission.VIEW_RESULTS,
        types_1.Permission.VERIFY_RESULTS,
        types_1.Permission.EXPORT_RESULTS,
    ],
    [types_1.UserRole.POLLING_UNIT_OFFICER]: [types_1.Permission.VERIFY_VOTERS],
    [types_1.UserRole.VOTER_REGISTRATION_OFFICER]: [
        types_1.Permission.REGISTER_VOTERS,
        types_1.Permission.VERIFY_VOTERS,
        types_1.Permission.RESET_VOTER_PASSWORD,
    ],
    [types_1.UserRole.CANDIDATE_REGISTRATION_OFFICER]: [types_1.Permission.MANAGE_CANDIDATES],
    [types_1.UserRole.OBSERVER]: [types_1.Permission.VIEW_ELECTIONS, types_1.Permission.VIEW_RESULTS],
    [types_1.UserRole.VOTER]: [types_1.Permission.VIEW_ELECTIONS, types_1.Permission.CAST_VOTE],
};
/**
 * Check if a role has a higher or equal level than another role
 * @param userRole The user's role
 * @param requiredRole The role to compare against
 */
const hasEqualOrHigherRole = (userRole, requiredRole) => {
    const userRoleValue = roleHierarchy[userRole] || 0;
    const requiredRoleValue = roleHierarchy[requiredRole] || 0;
    return userRoleValue >= requiredRoleValue;
};
/**
 * Check if user role has access to a specific permission
 * @param userRole User's role
 * @param requiredPermission Required permission
 */
const roleHasPermission = (userRole, requiredPermission) => {
    const permissions = exports.rolePermissions[userRole] || [];
    return permissions.includes(requiredPermission);
};
/**
 * Middleware to require a minimum role level or one of the specified roles
 * @param roles The minimum role required or an array of acceptable roles
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError(401, 'User not authenticated', 'AUTHENTICATION_REQUIRED');
            }
            // If roles is an array, check if user has any of the specified roles
            if (Array.isArray(roles)) {
                const userRole = req.user.adminType;
                if (!userRole) {
                    throw new errorHandler_1.ApiError(403, 'User has no assigned role', 'ROLE_REQUIRED');
                }
                const hasRequiredRole = roles.some(role => hasEqualOrHigherRole(userRole, role));
                if (!hasRequiredRole) {
                    throw new errorHandler_1.ApiError(403, 'Insufficient permissions', 'INSUFFICIENT_PERMISSIONS');
                }
            }
            else {
                // Original logic for single role
                const userRole = req.user.adminType;
                if (!userRole) {
                    throw new errorHandler_1.ApiError(403, 'User has no assigned role', 'ROLE_REQUIRED');
                }
                if (!hasEqualOrHigherRole(userRole, roles)) {
                    throw new errorHandler_1.ApiError(403, 'Insufficient permissions', 'INSUFFICIENT_PERMISSIONS');
                }
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireRole = requireRole;
/**
 * Middleware to require specific permissions
 * @param requiredPermissions The permissions required to access the resource
 */
const requirePermission = (requiredPermissions) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError(401, 'User not authenticated', 'AUTHENTICATION_REQUIRED');
            }
            const userRole = req.user.adminType;
            const userPermissions = req.user.permissions?.map((p) => p.permissionName) || [];
            if (!userRole) {
                throw new errorHandler_1.ApiError(403, 'User has no assigned role', 'ROLE_REQUIRED');
            }
            // Convert to array if single permission
            const permissions = Array.isArray(requiredPermissions)
                ? requiredPermissions
                : [requiredPermissions];
            // Check if user has explicit permissions or role-based permissions
            const hasAccess = permissions.every(permission => {
                return userPermissions.includes(permission) || roleHasPermission(userRole, permission);
            });
            if (!hasAccess) {
                throw new errorHandler_1.ApiError(403, 'Insufficient permissions', 'INSUFFICIENT_PERMISSIONS');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requirePermission = requirePermission;
/**
 * Middleware to require regional access
 * @param regionParam The request parameter containing the region ID
 */
const requireRegionalAccess = (regionParam = 'regionId') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError(401, 'User not authenticated', 'AUTHENTICATION_REQUIRED');
            }
            const userRole = req.user.adminType;
            const regionId = req.params[regionParam] || req.query[regionParam];
            // System administrators and electoral commissioners have access to all regions
            if (userRole === types_1.UserRole.SYSTEM_ADMIN || userRole === types_1.UserRole.ELECTORAL_COMMISSIONER) {
                return next();
            }
            // Regional officers need to have access to the specific region
            if (!regionId) {
                throw new errorHandler_1.ApiError(400, 'Region ID is required', 'REGION_REQUIRED');
            }
            // TODO: Implement region access check based on user's assigned regions
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireRegionalAccess = requireRegionalAccess;
/**
 * Middleware to log access attempts
 */
const logAccess = (req, res, next) => {
    const user = req.user;
    if (user) {
        logger_1.logger.info({
            message: 'API access',
            userId: user.id,
            role: user.adminType,
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }
    next();
};
exports.logAccess = logAccess;
//# sourceMappingURL=accessControl.js.map