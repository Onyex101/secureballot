import { Response, NextFunction } from 'express';
import * as adminService from '../../services/adminService';
import * as auditService from '../../services/auditService';
import * as statisticsService from '../../services/statisticsService';
import * as pollingUnitService from '../../services/pollingUnitService';
import { UserRole } from '../../types';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { AuthRequest } from '../../middleware/auth';

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

    // Log the action using enum
    await auditService.createAdminAuditLog(
      req.user?.id || null,
      AuditActionType.ADMIN_USER_LIST_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { query: req.query, success: true },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Log failure (optional, as global handler will log too)
    // logger.error('Error fetching admin users:', error);
    await auditService
      .createAdminAuditLog(
        req.user?.id || null,
        AuditActionType.ADMIN_USER_LIST_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { query: req.query, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log user list view error', logErr));
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

    // Log the action using enum
    await auditService.createAdminAuditLog(
      creatorUserId,
      AuditActionType.ADMIN_USER_CREATE,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        createdUserId: newUser.id,
        role: newUser.role,
      },
    );

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
    await auditService
      .createAdminAuditLog(
        req.user?.id || null,
        AuditActionType.ADMIN_USER_CREATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          email: req.body.email,
          role: req.body.role,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log user creation error', logErr));
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

    // Gather data from multiple services in parallel
    const [realTimeStats, adminUsers, pollingUnits, auditLogs, suspiciousActivities] =
      await Promise.all([
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
        completedElections: 0, // Would need separate query
        pendingVerifications: 0, // Would need verification service
        totalPollingUnits,
        systemUptime: 99.9, // Mock value
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
      verificationRequests: [], // Would need verification service implementation
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
    await auditService.createAdminAuditLog(
      req.user?.id || null,
      AuditActionType.ADMIN_USER_LIST_VIEW, // Using existing action type as substitute
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        action: 'dashboard_view',
        success: true,
        includeAuditLogs: shouldIncludeAuditLogs,
        auditLogsLimit: auditLimit,
        suspiciousActivitiesLimit: suspiciousLimit,
      },
    );

    res.status(200).json({
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully',
    });
  } catch (error) {
    // Log failure
    await auditService
      .createAdminAuditLog(
        req.user?.id || null,
        AuditActionType.ADMIN_USER_LIST_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          action: 'dashboard_view',
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log dashboard view error', logErr));
    next(error);
  }
};
