import { Response, NextFunction } from 'express';
import * as adminService from '../../services/adminService';
import * as auditService from '../../services/auditService';
import * as statisticsService from '../../services/statisticsService';
import * as pollingUnitService from '../../services/pollingUnitService';
import * as voterService from '../../services/voterService';
import * as verificationService from '../../services/verificationService';
import * as suspiciousActivityService from '../../services/suspiciousActivityService';
import { getOrSetCached, CACHE_KEYS } from '../../services/cacheService';
import { UserRole } from '../../types';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';
import { createAdminLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';

/**
 * Get admin user profile
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Get admin profile
    const adminProfile = await adminService.getAdminProfile(userId);

    // Log the profile view using admin logs
    await createAdminLog(req, AdminAction.ADMIN_USER_DETAIL_VIEW, ResourceType.ADMIN_USER, userId, {
      success: true,
      action: 'view_profile',
    });

    res.status(200).json({
      success: true,
      data: adminProfile,
    });
  } catch (error) {
    // Log failure
    await createAdminLog(req, AdminAction.ADMIN_USER_DETAIL_VIEW, ResourceType.ADMIN_USER, userId, {
      success: false,
      action: 'view_profile',
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log admin profile view error', logErr));
    next(error);
  }
};

/**
 * List all system users with pagination and filtering
 */
export const listUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, status, page = 1, limit = 50 } = req.query;

    // Get users from service
    const result = await adminService.getUsers(
      role as string,
      status as string,
      Number(page),
      Number(limit),
    );

    // Log the action using admin logs
    await createAdminLog(req, AdminAction.ADMIN_USER_LIST_VIEW, ResourceType.ADMIN_USER, null, {
      query: req.query,
      success: true,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Log failure (optional, as global handler will log too)
    // logger.error('Error fetching admin users:', error);
    await createAdminLog(req, AdminAction.ADMIN_USER_LIST_VIEW, ResourceType.ADMIN_USER, null, {
      query: req.query,
      success: false,
      error: (error as Error).message,
    }).catch((logErr: any) => logger.error('Failed to log user list view error', logErr));
    next(error);
  }
};

/**
 * Create a new admin user
 */
export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, fullName, phoneNumber, password, role } = req.body;
    const creatorUserId = req.user?.id;

    if (!creatorUserId) {
      throw new ApiError(401, 'Authentication required to create user', 'AUTH_REQUIRED');
    }

    // Check if user with email already exists
    const userExists = await adminService.checkUserExists(email);
    if (userExists) {
      // Throw ApiError instead of returning directly
      throw new ApiError(
        409,
        'User with this email already exists',
        'USER_EXISTS',
        undefined,
        true,
      );
    }

    // Create new admin user
    const newUser = await adminService.createAdminUser(
      email,
      fullName,
      phoneNumber,
      password,
      role as UserRole,
      creatorUserId,
    );

    // Log the action using admin logs
    await createAdminLog(req, AdminAction.ADMIN_USER_CREATE, ResourceType.ADMIN_USER, newUser.id, {
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
  } catch (error) {
    // Log failure (optional, as global handler will log too)
    // logger.error('Error creating admin user:', error);
    await createAdminLog(req, AdminAction.ADMIN_USER_CREATE, ResourceType.ADMIN_USER, null, {
      success: false,
      email: req.body.email,
      role: req.body.role,
      error: (error as Error).message,
    }).catch((logErr: any) => logger.error('Failed to log user creation error', logErr));
    next(error);
  }
};

/**
 * Get comprehensive admin dashboard data
 */
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      includeAuditLogs = 'true',
      auditLogsLimit = '50',
      suspiciousActivitiesLimit = '50',
    } = req.query;

    const shouldIncludeAuditLogs = includeAuditLogs === 'true';
    const auditLimit = Math.min(Math.max(parseInt(auditLogsLimit as string) || 50, 1), 100);
    const suspiciousLimit = Math.min(
      Math.max(parseInt(suspiciousActivitiesLimit as string) || 50, 1),
      100,
    );

    // Gather data from multiple services in parallel with caching
    const [
      realTimeStats,
      adminUsers,
      pollingUnits,
      auditLogs,
      suspiciousActivitiesResult,
      totalVotersCount,
      verificationRequestsResult,
    ] = await Promise.all([
      // System statistics - cached for 2 minutes
      getOrSetCached(
        CACHE_KEYS.REAL_TIME_VOTING_STATS,
        () => Promise.resolve(statisticsService.getRealTimeVotingStats()),
        2,
      ),

      // Admin users - cached for 5 minutes
      getOrSetCached(
        CACHE_KEYS.ADMIN_USERS(1, 20),
        () => adminService.getUsers(undefined, 'active', 1, 20),
        5,
      ),

      // Polling units - cached for 10 minutes
      getOrSetCached(
        CACHE_KEYS.POLLING_UNITS(1, 20),
        () => pollingUnitService.getPollingUnits({}, undefined, 1, 20),
        10,
      ),

      // Audit logs (if requested) - cached for 1 minute
      shouldIncludeAuditLogs
        ? getOrSetCached(
            CACHE_KEYS.AUDIT_LOGS(1, auditLimit),
            () =>
              auditService.getAuditLogs(undefined, undefined, undefined, undefined, 1, auditLimit),
            1,
          )
        : Promise.resolve({
            auditLogs: [],
            pagination: { total: 0, page: 1, limit: auditLimit, totalPages: 0 },
          }),

      // Suspicious activities - cached for 3 minutes
      getOrSetCached(
        CACHE_KEYS.SUSPICIOUS_ACTIVITIES(1, suspiciousLimit),
        () => suspiciousActivityService.getSuspiciousActivities({}, 1, suspiciousLimit),
        3,
      ),

      // Voter count - cached for 15 minutes
      getOrSetCached(CACHE_KEYS.VOTER_COUNT, () => voterService.getVoterCount(), 15),

      // Pending verification requests - cached for 5 minutes
      getOrSetCached(
        CACHE_KEYS.PENDING_VERIFICATIONS(1, 20),
        () => verificationService.getPendingVerificationRequests(1, 20),
        5,
      ),
    ]);

    // Calculate system statistics from available data
    const totalPollingUnits = pollingUnits.pagination.total || 0;
    const suspiciousActivities = suspiciousActivitiesResult.activities || [];
    const verificationRequests = verificationRequestsResult.verifications || [];

    // Transform and structure the response data
    const dashboardData = {
      systemStatistics: {
        totalVoters: totalVotersCount,
        activeElections: (realTimeStats as any)?.activeElections?.length || 0,
        totalVotes: (realTimeStats as any)?.totalVotesToday || 0,
        completedElections: 0, // Would need separate query
        pendingVerifications: verificationRequestsResult.pagination.total || 0,
        totalPollingUnits,
        systemUptime: 99.9, // Mock value - could be implemented with system monitoring
        averageTurnout: 0, // Would calculate from election data
        lastUpdated: new Date().toISOString(),
      },
      adminUsers: (adminUsers.users || []).map((user: any) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      })),
      pollingUnits: (pollingUnits.pollingUnits || []).map((unit: any) => ({
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
      verificationRequests: verificationRequests.map((request: any) => ({
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
        ? (auditLogs.auditLogs || []).map((log: any) => ({
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
      suspiciousActivities: suspiciousActivities.map((activity: any) => ({
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
    await createAdminLog(req, AdminAction.DASHBOARD_VIEW, ResourceType.DASHBOARD, null, {
      success: true,
    });

    res.status(200).json({
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully',
    });
  } catch (error) {
    // Log failure
    await createAdminLog(req, AdminAction.DASHBOARD_VIEW, ResourceType.DASHBOARD, null, {
      success: false,
      error: (error as Error).message,
    }).catch((logErr: any) => logger.error('Failed to log dashboard view error', logErr));
    next(error);
  }
};
