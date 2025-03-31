import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { pollingUnitService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { logger } from '../../config/logger';
import PollingUnit from '../../db/models/PollingUnit';

/**
 * Find nearby polling units
 */
export const getNearbyPollingUnits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id;
  const { latitude, longitude, radius = 5, limit = 10 } = req.query;
  const _searchParams = { latitude, longitude, radius, limit };

  try {
    if (!userId) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (!latitude || !longitude) {
      throw new ApiError(400, 'Latitude and longitude are required', 'MISSING_COORDINATES');
    }

    // Get nearby polling units
    // Assuming service returns PollingUnit[] potentially augmented with distance
    const pollingUnits = await pollingUnitService.getNearbyPollingUnits(
      Number(latitude),
      Number(longitude),
      Number(radius),
      Number(limit),
    );

    // Log the action
    await auditService.createAuditLog(
      userId,
      AuditActionType.MOBILE_NEARBY_PU_SEARCH,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius: Number(radius),
        limit: Number(limit),
        resultsCount: pollingUnits.length,
      },
    );

    res.status(200).json({
      success: true,
      data: {
        pollingUnits: pollingUnits.map((unit: PollingUnit & { distance?: number }) => ({
          id: unit.id,
          name: unit.pollingUnitName,
          code: unit.pollingUnitCode,
          address: unit.address,
          latitude: unit.latitude,
          longitude: unit.longitude,
          distance: unit.distance,
        })),
        searchParams: {
          latitude: Number(latitude),
          longitude: Number(longitude),
          radius: Number(radius),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    // Log failure
    await auditService
      .createAuditLog(
        userId || 'unknown',
        AuditActionType.MOBILE_NEARBY_PU_SEARCH,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          radius: radius ? Number(radius) : undefined,
          limit: limit ? Number(limit) : undefined,
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log nearby PU search error', logErr));
    next(error);
  }
};
