import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { auditService, voterService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { logger } from '../../config/logger';
import PollingUnit from '../../db/models/PollingUnit';

/**
 * Get user's assigned polling unit
 * @route GET /api/v1/mobile/my-polling-unit (Example route)
 * @access Private
 */
export const getUserPollingUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Get user's polling unit using voterService
    const pollingUnit: PollingUnit | null = await voterService.getVoterPollingUnit(userId);

    if (!pollingUnit) {
      // Service should ideally throw, but handle case where it might return null
      throw new ApiError(
        404,
        'Polling unit not assigned or found for voter',
        'POLLING_UNIT_NOT_FOUND',
      );
    }

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.USER_ASSIGNED_PU_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { success: true, pollingUnitId: pollingUnit.id },
    );

    res.status(200).json({
      success: true,
      data: {
        // Return the polling unit details directly
        pollingUnit: {
          id: pollingUnit.id,
          name: pollingUnit.pollingUnitName,
          code: pollingUnit.pollingUnitCode,
          address: pollingUnit.address,
          state: pollingUnit.state,
          lga: pollingUnit.lga,
          ward: pollingUnit.ward,
          latitude: pollingUnit.latitude,
          longitude: pollingUnit.longitude,
          // Remove hardcoded times
        },
      },
    });
  } catch (error) {
    // Log failure
    await auditService
      .createAuditLog(
        userId || 'unknown',
        AuditActionType.USER_ASSIGNED_PU_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log user polling unit view error', logErr));
    next(error);
  }
};
