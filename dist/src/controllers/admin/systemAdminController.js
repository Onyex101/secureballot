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
exports.getDashboard = exports.createUser = exports.listUsers = void 0;
const adminService = __importStar(require("../../services/adminService"));
const auditService = __importStar(require("../../services/auditService"));
const statisticsService = __importStar(require("../../services/statisticsService"));
const pollingUnitService = __importStar(require("../../services/pollingUnitService"));
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
/**
 * List all system users with pagination and filtering
 */
const listUsers = async (req, res, next) => {
    try {
        const { role, status, page = 1, limit = 50 } = req.query;
        // Get users from service
        const result = await adminService.getUsers(role, status, Number(page), Number(limit));
        // Log the action using enum
        await auditService.createAdminAuditLog(req.user?.id || null, AuditLog_1.AuditActionType.ADMIN_USER_LIST_VIEW, req.ip || '', req.headers['user-agent'] || '', { query: req.query, success: true });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // Log failure (optional, as global handler will log too)
        // logger.error('Error fetching admin users:', error);
        await auditService
            .createAdminAuditLog(req.user?.id || null, AuditLog_1.AuditActionType.ADMIN_USER_LIST_VIEW, req.ip || '', req.headers['user-agent'] || '', { query: req.query, success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log user list view error', logErr));
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
        // Log the action using enum
        await auditService.createAdminAuditLog(creatorUserId, AuditLog_1.AuditActionType.ADMIN_USER_CREATE, req.ip || '', req.headers['user-agent'] || '', {
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
        await auditService
            .createAdminAuditLog(req.user?.id || null, AuditLog_1.AuditActionType.ADMIN_USER_CREATE, req.ip || '', req.headers['user-agent'] || '', {
            success: false,
            email: req.body.email,
            role: req.body.role,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log user creation error', logErr));
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
        // Gather data from multiple services in parallel
        const [realTimeStats, adminUsers, pollingUnits, auditLogs, suspiciousActivities] = await Promise.all([
            // System statistics - using real-time stats as a substitute
            statisticsService.getRealTimeVotingStats(),
            // Admin users (limited to most recent 20)
            adminService.getUsers(undefined, 'active', 1, 20),
            // Polling units (sample of recent ones)
            pollingUnitService.getPollingUnits({}, undefined, 1, 20),
            // Audit logs (if requested)
            shouldIncludeAuditLogs
                ? auditService.getAuditLogs(undefined, undefined, undefined, undefined, 1, auditLimit)
                : Promise.resolve({
                    auditLogs: [],
                    pagination: { total: 0, page: 1, limit: auditLimit, totalPages: 0 },
                }),
            // Suspicious activities (mock data for now - would need to implement suspicious activity service)
            Promise.resolve([]),
        ]);
        // Calculate system statistics from available data
        const totalVoters = await adminService
            .getUsers(undefined, undefined, 1, 1)
            .then(result => result.pagination.total || 0);
        const totalPollingUnits = pollingUnits.pagination.total || 0;
        // Transform and structure the response data
        const dashboardData = {
            systemStatistics: {
                totalVoters,
                activeElections: realTimeStats?.activeElections?.length || 0,
                totalVotes: realTimeStats?.totalVotesToday || 0,
                completedElections: 0,
                pendingVerifications: 0,
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
            verificationRequests: [],
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
        await auditService.createAdminAuditLog(req.user?.id || null, AuditLog_1.AuditActionType.ADMIN_USER_LIST_VIEW, // Using existing action type as substitute
        req.ip || '', req.headers['user-agent'] || '', {
            action: 'dashboard_view',
            success: true,
            includeAuditLogs: shouldIncludeAuditLogs,
            auditLogsLimit: auditLimit,
            suspiciousActivitiesLimit: suspiciousLimit,
        });
        res.status(200).json({
            success: true,
            data: dashboardData,
            message: 'Dashboard data retrieved successfully',
        });
    }
    catch (error) {
        // Log failure
        await auditService
            .createAdminAuditLog(req.user?.id || null, AuditLog_1.AuditActionType.ADMIN_USER_LIST_VIEW, req.ip || '', req.headers['user-agent'] || '', {
            action: 'dashboard_view',
            success: false,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log dashboard view error', logErr));
        next(error);
    }
};
exports.getDashboard = getDashboard;
//# sourceMappingURL=systemAdminController.js.map