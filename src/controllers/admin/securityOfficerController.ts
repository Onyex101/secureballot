import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as auditService from '../../services/auditService';
import * as suspiciousActivityService from '../../services/suspiciousActivityService';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';

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

    // Log this security log view
    await auditService.createAuditLog(
      userId,
      AuditActionType.SECURITY_LOG_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { query: req.query, success: true },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Log failure
    await auditService
      .createAuditLog(
        userId || 'unknown',
        AuditActionType.SECURITY_LOG_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { query: req.query, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log security log view error', logErr));
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

    // Log this suspicious activity view
    await auditService.createAdminAuditLog(
      userId,
      AuditActionType.SUSPICIOUS_ACTIVITY_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
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
    // Log failure
    await auditService
      .createAdminAuditLog(
        userId || null,
        AuditActionType.SUSPICIOUS_ACTIVITY_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          query: req.query,
          success: false,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log suspicious activity view error', logErr));
    next(error);
  }
};
