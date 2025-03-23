import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { pollingUnitService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Get all polling units with pagination and filtering
 * @route GET /api/v1/voter/polling-units
 * @access Private
 */
export const getPollingUnits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { regionId, search, page = 1, limit = 50 } = req.query;

    // Get polling units
    const result = await pollingUnitService.getPollingUnits(
      regionId as string,
      search as string,
      Number(page),
      Number(limit),
    );

    // Log the action
    await auditService.createAuditLog(
      (req.user?.id as string) || 'anonymous',
      'polling_unit_list_view',
      req.ip || '',
      req.headers['user-agent'] || '',
      { query: req.query },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get polling unit by ID
 * @route GET /api/v1/voter/polling-units/:id
 * @access Private
 */
export const getPollingUnitById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    try {
      // Get polling unit
      const pollingUnit = await pollingUnitService.getPollingUnitById(id);

      // Log the action
      await auditService.createAuditLog(
        (req.user?.id as string) || 'anonymous',
        'polling_unit_view',
        req.ip || '',
        req.headers['user-agent'] || '',
        { pollingUnitId: id },
      );

      res.status(200).json({
        success: true,
        data: pollingUnit,
      });
    } catch (error) {
      const apiError: ApiError = new Error('Polling unit not found');
      apiError.statusCode = 404;
      apiError.code = 'POLLING_UNIT_NOT_FOUND';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get nearby polling units
 * @route GET /api/v1/voter/polling-units/nearby
 * @access Private
 */
export const getNearbyPollingUnits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { latitude, longitude, radius = 5, limit = 10 } = req.query;

    if (!latitude || !longitude) {
      const error: ApiError = new Error('Latitude and longitude are required');
      error.statusCode = 400;
      error.code = 'MISSING_COORDINATES';
      error.isOperational = true;
      throw error;
    }

    // Get nearby polling units
    const pollingUnits = await pollingUnitService.getNearbyPollingUnits(
      Number(latitude),
      Number(longitude),
      Number(radius),
      Number(limit),
    );

    // Log the action
    await auditService.createAuditLog(
      (req.user?.id as string) || 'anonymous',
      'nearby_polling_units_view',
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        latitude,
        longitude,
        radius,
        limit,
      },
    );

    res.status(200).json({
      success: true,
      data: pollingUnits,
    });
  } catch (error) {
    next(error);
  }
};
