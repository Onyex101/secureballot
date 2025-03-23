import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { pollingUnitService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Get polling units by coordinates
 */
export const getPollingUnitsByCoordinates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { latitude, longitude, radius = 5 } = req.query;

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
      );

      // Log the action
      await auditService.createAuditLog(
        userId,
        'location_polling_units_search',
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          latitude,
          longitude,
          radius,
          resultsCount: pollingUnits.length,
        },
      );

      res.status(200).json({
        success: true,
        data: {
          pollingUnits: pollingUnits.map((unit: any) => ({
            id: unit.id,
            name: unit.pollingUnitName,
            code: unit.pollingUnitCode,
            address: unit.address,
            state: unit.state,
            lga: unit.lga,
            ward: unit.ward,
            latitude: unit.latitude,
            longitude: unit.longitude,
            distance: unit.distance,
          })),
          searchParams: {
            latitude: Number(latitude),
            longitude: Number(longitude),
            radius: Number(radius),
          },
        },
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to find polling units by coordinates');
      apiError.statusCode = 400;
      apiError.code = 'POLLING_UNITS_SEARCH_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's assigned polling unit
 */
export const getUserPollingUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Get user's polling unit
      const voterDetails = await pollingUnitService.getVoterPollingUnit(userId);

      // Log the action
      await auditService.createAuditLog(
        userId,
        'user_polling_unit_view',
        req.ip || '',
        req.headers['user-agent'] || '',
        {},
      );

      res.status(200).json({
        success: true,
        data: {
          pollingUnit: {
            id: voterDetails.pollingUnit.id,
            name: voterDetails.pollingUnit.pollingUnitName,
            code: voterDetails.pollingUnit.pollingUnitCode,
            address: voterDetails.pollingUnit.address,
            state: voterDetails.pollingUnit.state,
            lga: voterDetails.pollingUnit.lga,
            ward: voterDetails.pollingUnit.ward,
            latitude: voterDetails.pollingUnit.latitude,
            longitude: voterDetails.pollingUnit.longitude,
            openingTime: '08:00',
            closingTime: '18:00',
          },
        },
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to get user polling unit');
      apiError.statusCode = 400;
      apiError.code = 'USER_POLLING_UNIT_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
