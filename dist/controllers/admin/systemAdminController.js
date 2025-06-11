"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = exports.createUser = exports.listUsers = exports.getProfile = void 0;
const adminService = __importStar(require("../../services/adminService"));
const auditService = __importStar(require("../../services/auditService"));
const statisticsService = __importStar(require("../../services/statisticsService"));
const pollingUnitService = __importStar(require("../../services/pollingUnitService"));
const voterService = __importStar(require("../../services/voterService"));
const verificationService = __importStar(require("../../services/verificationService"));
const suspiciousActivityService = __importStar(require("../../services/suspiciousActivityService"));
const cacheService_1 = require("../../services/cacheService");
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
/**
 * Get admin user profile
 */
const getProfile = async (req, res, next) => {
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Get admin profile
        const adminProfile = await adminService.getAdminProfile(userId);
        // Log the profile view using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.ADMIN_USER_DETAIL_VIEW, adminLogService_1.ResourceType.ADMIN_USER, userId, {
            success: true,
            action: 'view_profile',
        });
        res.status(200).json({
            success: true,
            data: adminProfile,
        });
    }
    catch (error) {
        // Log failure
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.ADMIN_USER_DETAIL_VIEW, adminLogService_1.ResourceType.ADMIN_USER, userId, {
            success: false,
            action: 'view_profile',
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log admin profile view error', logErr));
        next(error);
    }
};
exports.getProfile = getProfile;
/**
 * List all system users with pagination and filtering
 */
const listUsers = async (req, res, next) => {
    try {
        const { role, status, page = 1, limit = 50 } = req.query;
        // Get users from service
        const result = await adminService.getUsers(role, status, Number(page), Number(limit));
        // Log the action using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.ADMIN_USER_LIST_VIEW, adminLogService_1.ResourceType.ADMIN_USER, null, {
            query: req.query,
            success: true,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // Log failure (optional, as global handler will log too)
        // logger.error('Error fetching admin users:', error);
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.ADMIN_USER_LIST_VIEW, adminLogService_1.ResourceType.ADMIN_USER, null, {
            query: req.query,
            success: false,
            error: error.message,
        }).catch((logErr) => logger_1.logger.error('Failed to log user list view error', logErr));
        next(error);
    }
};
exports.listUsers = listUsers;
/**
 * Create a new admin user
 */
const createUser = async (req, res, next) => {
    try {
        const { email, fullName, phoneNumber, password, role } = req.body;
        const creatorUserId = req.user?.id;
        if (!creatorUserId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required to create user', 'AUTH_REQUIRED');
        }
        // Check if user with email already exists
        const userExists = await adminService.checkUserExists(email);
        if (userExists) {
            // Throw ApiError instead of returning directly
            throw new errorHandler_1.ApiError(409, 'User with this email already exists', 'USER_EXISTS', undefined, true);
        }
        // Create new admin user
        const newUser = await adminService.createAdminUser(email, fullName, phoneNumber, password, role, creatorUserId);
        // Log the action using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.ADMIN_USER_CREATE, adminLogService_1.ResourceType.ADMIN_USER, newUser.id, {
            success: true,
            createdUserId: newUser.id,
            role: newUser.role,
        });
        // Return success
        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            data: {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role,
            },
        });
    }
    catch (error) {
        // Log failure (optional, as global handler will log too)
        // logger.error('Error creating admin user:', error);
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.ADMIN_USER_CREATE, adminLogService_1.ResourceType.ADMIN_USER, null, {
            success: false,
            email: req.body.email,
            role: req.body.role,
            error: error.message,
        }).catch((logErr) => logger_1.logger.error('Failed to log user creation error', logErr));
        next(error);
    }
};
exports.createUser = createUser;
/**
 * Get comprehensive admin dashboard data
 */
const getDashboard = async (req, res, next) => {
    try {
        const { includeAuditLogs = 'true', auditLogsLimit = '50', suspiciousActivitiesLimit = '50', } = req.query;
        const shouldIncludeAuditLogs = includeAuditLogs === 'true';
        const auditLimit = Math.min(Math.max(parseInt(auditLogsLimit) || 50, 1), 100);
        const suspiciousLimit = Math.min(Math.max(parseInt(suspiciousActivitiesLimit) || 50, 1), 100);
        // Gather data from multiple services in parallel with caching
        const [realTimeStats, adminUsers, pollingUnits, auditLogs, suspiciousActivitiesResult, totalVotersCount, verificationRequestsResult,] = await Promise.all([
            // System statistics - cached for 2 minutes
            (0, cacheService_1.getOrSetCached)(cacheService_1.CACHE_KEYS.REAL_TIME_VOTING_STATS, () => Promise.resolve(statisticsService.getRealTimeVotingStats()), 2),
            // Admin users - cached for 5 minutes
            (0, cacheService_1.getOrSetCached)(cacheService_1.CACHE_KEYS.ADMIN_USERS(1, 20), () => adminService.getUsers(undefined, 'active', 1, 20), 5),
            // Polling units - cached for 10 minutes
            (0, cacheService_1.getOrSetCached)(cacheService_1.CACHE_KEYS.POLLING_UNITS(1, 20), () => pollingUnitService.getPollingUnits({}, undefined, 1, 20), 10),
            // Audit logs (if requested) - cached for 1 minute
            shouldIncludeAuditLogs
                ? (0, cacheService_1.getOrSetCached)(cacheService_1.CACHE_KEYS.AUDIT_LOGS(1, auditLimit), () => auditService.getAuditLogs(undefined, undefined, undefined, undefined, 1, auditLimit), 1)
                : Promise.resolve({
                    auditLogs: [],
                    pagination: { total: 0, page: 1, limit: auditLimit, totalPages: 0 },
                }),
            // Suspicious activities - cached for 3 minutes
            (0, cacheService_1.getOrSetCached)(cacheService_1.CACHE_KEYS.SUSPICIOUS_ACTIVITIES(1, suspiciousLimit), () => suspiciousActivityService.getSuspiciousActivities({}, 1, suspiciousLimit), 3),
            // Voter count - cached for 15 minutes
            (0, cacheService_1.getOrSetCached)(cacheService_1.CACHE_KEYS.VOTER_COUNT, () => voterService.getVoterCount(), 15),
            // Pending verification requests - cached for 5 minutes
            (0, cacheService_1.getOrSetCached)(cacheService_1.CACHE_KEYS.PENDING_VERIFICATIONS(1, 20), () => verificationService.getPendingVerificationRequests(1, 20), 5),
        ]);
        // Calculate system statistics from available data
        const totalPollingUnits = pollingUnits.pagination.total || 0;
        const suspiciousActivities = suspiciousActivitiesResult.activities || [];
        const verificationRequests = verificationRequestsResult.verifications || [];
        // Transform and structure the response data
        const dashboardData = {
            systemStatistics: {
                totalVoters: totalVotersCount,
                activeElections: realTimeStats?.activeElections?.length || 0,
                totalVotes: realTimeStats?.totalVotesToday || 0,
                completedElections: 0,
                pendingVerifications: verificationRequestsResult.pagination.total || 0,
                totalPollingUnits,
                systemUptime: 99.9,
                averageTurnout: 0,
                lastUpdated: new Date().toISOString(),
            },
            adminUsers: (adminUsers.users || []).map((user) => ({
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                status: user.status,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
            })),
            pollingUnits: (pollingUnits.pollingUnits || []).map((unit) => ({
                id: unit.id,
                name: unit.name,
                code: unit.code,
                state: unit.state,
                lga: unit.lga,
                ward: unit.ward,
                registeredVoters: unit.registeredVoters || 0,
                status: unit.status,
                coordinates: {
                    latitude: unit.latitude,
                    longitude: unit.longitude,
                },
            })),
            verificationRequests: verificationRequests.map((request) => ({
                id: request.id,
                voterId: request.userId,
                state: request.state,
                isVerified: request.isVerified,
                submissionDate: request.createdAt,
                verificationData: request.verificationData,
                voter: request.voter
                    ? {
                        id: request.voter.id,
                        phoneNumber: request.voter.phoneNumber,
                    }
                    : null,
            })),
            auditLogs: shouldIncludeAuditLogs
                ? (auditLogs.auditLogs || []).map((log) => ({
                    id: log.id,
                    userId: log.userId,
                    userEmail: log.userEmail || '',
                    action: log.actionType,
                    resourceType: 'Unknown',
                    resourceId: log.id,
                    details: log.actionDetails,
                    ipAddress: log.ipAddress,
                    userAgent: log.userAgent,
                    severity: 'medium',
                    timestamp: log.actionTimestamp,
                }))
                : [],
            suspiciousActivities: suspiciousActivities.map((activity) => ({
                id: activity.id,
                type: activity.type,
                severity: activity.severity,
                description: activity.description,
                sourceIp: activity.sourceIp,
                targetUserId: activity.targetUserId,
                targetResource: activity.targetResource,
                detectedAt: activity.detectedAt,
                status: activity.status,
                riskScore: activity.riskScore,
            })),
        };
        // Log the dashboard access
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.DASHBOARD_VIEW, adminLogService_1.ResourceType.DASHBOARD, null, {
            success: true,
        });
        res.status(200).json({
            success: true,
            data: dashboardData,
            message: 'Dashboard data retrieved successfully',
        });
    }
    catch (error) {
        // Log failure
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.DASHBOARD_VIEW, adminLogService_1.ResourceType.DASHBOARD, null, {
            success: false,
            error: error.message,
        }).catch((logErr) => logger_1.logger.error('Failed to log dashboard view error', logErr));
        next(error);
    }
};
exports.getDashboard = getDashboard;
//# sourceMappingURL=systemAdminController.js.map