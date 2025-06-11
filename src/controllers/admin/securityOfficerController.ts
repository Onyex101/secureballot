import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as auditService from '../../services/auditService';
import * as suspiciousActivityService from '../../services/suspiciousActivityService';
import { createAdminLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Get security logs with filtering and pagination
 */
export const getSecurityLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;
  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    const { severity, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Get security logs from service
    const result = await auditService.getSecurityLogs(
      severity as string | undefined,
      startDate as string | undefined,
      endDate as string | undefined,
      Number(page),
      Number(limit),
    );

    // Log this security log view using admin logs
    await createAdminLog(req, AdminAction.SECURITY_LOG_VIEW, ResourceType.SECURITY_LOG, null, {
      query: req.query,
      success: true,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Log failure using admin logs
    await createAdminLog(req, AdminAction.SECURITY_LOG_VIEW, ResourceType.SECURITY_LOG, null, {
      query: req.query,
      success: false,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log security log view error', logErr));
    next(error);
  }
};

/**
 * Get suspicious activities with filtering and pagination
 */
export const getSuspiciousActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const {
      severity,
      status,
      type,
      startDate,
      endDate,
      sourceIp,
      page = 1,
      limit = 50,
    } = req.query;

    // Get suspicious activities from service
    const result = await suspiciousActivityService.getSuspiciousActivities(
      {
        severity: severity as string,
        status: status as string,
        type: type as string,
        startDate: startDate as string,
        endDate: endDate as string,
        sourceIp: sourceIp as string,
      },
      Number(page),
      Number(limit),
    );

    // Log this suspicious activity view using admin logs
    await createAdminLog(
      req,
      AdminAction.SUSPICIOUS_ACTIVITY_INVESTIGATE,
      ResourceType.AUDIT_LOG,
      null,
      {
        query: req.query,
        success: true,
        activitiesCount: result.activities.length,
      },
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Suspicious activities retrieved successfully',
    });
  } catch (error) {
    // Log failure using admin logs
    await createAdminLog(
      req,
      AdminAction.SUSPICIOUS_ACTIVITY_INVESTIGATE,
      ResourceType.AUDIT_LOG,
      null,
      {
        query: req.query,
        success: false,
        error: (error as Error).message,
      },
    ).catch(logErr => logger.error('Failed to log suspicious activity view error', logErr));
    next(error);
  }
};
