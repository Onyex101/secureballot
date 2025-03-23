import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { pollingUnitService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Find nearby polling units
 */
export const getNearbyPollingUnits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { latitude, longitude, radius = 5, limit = 10 } = req.query;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    if (!latitude || !longitude) {
      const error: ApiError = new Error('Latitude and longitude are required');
      error.statusCode = 400;
      error.code = 'MISSING_COORDINATES';
      error.isOperational = true;
      throw error;
    }

    try {
      // Get nearby polling units
      const pollingUnits = await pollingUnitService.getNearbyPollingUnits(
        Number(latitude),
        Number(longitude),
        Number(radius),
        Number(limit),
      );

      // Log the action
      await auditService.createAuditLog(
        userId,
        'mobile_nearby_polling_units_search',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          latitude,
          longitude,
          radius,
          limit,
          resultsCount: pollingUnits.length,
        },
      );

      res.status(200).json({
        success: true,
        data: {
          pollingUnits: pollingUnits.map((unit: any) => ({
            id: unit.id,
            name: unit.name,
            code: unit.code,
            address: unit.address,
            latitude: unit.latitude,
            longitude: unit.longitude,
            distance: unit.distance, // This would be calculated in the service
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
      const apiError: ApiError = new Error('Failed to find nearby polling units');
      apiError.statusCode = 400;
      apiError.code = 'NEARBY_POLLING_UNITS_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
