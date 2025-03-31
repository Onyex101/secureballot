import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as auditService from '../../services/auditService';
import { logger } from '../../config/logger';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';

/**
 * Get audit logs with filtering and pagination
 */
export const getAuditLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const requesterUserId = req.user?.id;
  try {
    if (!requesterUserId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    const { actionType, startDate, endDate, userId, page = 1, limit = 50 } = req.query;

    // Get audit logs from service
    const result = await auditService.getAuditLogs(
      actionType as string | undefined,
      startDate as string | undefined,
      endDate as string | undefined,
      userId as string | undefined,
      Number(page),
      Number(limit),
    );

    // Log this audit log view
    await auditService.createAuditLog(
      requesterUserId,
      AuditActionType.AUDIT_LOG_VIEW,
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
        requesterUserId || 'unknown',
        AuditActionType.AUDIT_LOG_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { query: req.query, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log audit log view error', logErr));
    next(error);
  }
};
