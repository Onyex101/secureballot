import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';
import { pollingUnitService } from '../../services';
import { createAdminLog } from '../../utils/auditHelpers';
import { AdminAction, ResourceType } from '../../services/adminLogService';
import { logger } from '../../config/logger';

/**
 * Get polling units in a region (assumed to be state)
 * @route GET /api/v1/admin/regions/:state/polling-units
 * @access Private (Regional Officer)
 */
export const getRegionPollingUnits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { state } = req.params;
  const { page = 1, limit = 50, search, lga, ward } = req.query;

  try {
    const filters = {
      state,
      lga: lga as string | undefined,
      ward: ward as string | undefined,
    };

    const result = await pollingUnitService.getPollingUnits(
      filters,
      search as string | undefined,
      Number(page),
      Number(limit),
    );

    await createAdminLog(req, AdminAction.POLLING_UNIT_LIST_VIEW, ResourceType.POLLING_UNIT, null, {
      state,
      query: req.query,
      success: true,
    });

    res.status(200).json({
      success: true,
      message: 'Polling units retrieved successfully',
      data: {
        pollingUnits: result.pollingUnits,
        pagination: {
          total: result.pagination.total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(result.pagination.total / Number(limit)),
        },
      },
    });
  } catch (error) {
    await createAdminLog(req, AdminAction.POLLING_UNIT_LIST_VIEW, ResourceType.POLLING_UNIT, null, {
      state,
      query: req.query,
      success: false,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log region polling units view error', logErr));
    next(error);
  }
};

/**
 * Create a new polling unit
 * @route POST /api/v1/admin/polling-units
 * @access Private (Regional Officer)
 */
export const createPollingUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { pollingUnitName, pollingUnitCode, address, state, lga, ward, latitude, longitude } =
    req.body;

  try {
    if (!state || !lga || !ward) {
      throw new ApiError(
        400,
        'State, LGA, and Ward are required to create a polling unit',
        'MISSING_LOCATION_DATA',
      );
    }

    const pollingUnit = await pollingUnitService.createPollingUnit(
      pollingUnitName,
      pollingUnitCode,
      address,
      state,
      lga,
      ward,
      latitude ? Number(latitude) : undefined,
      longitude ? Number(longitude) : undefined,
      undefined, // registeredVoters defaults in service
    );

    await createAdminLog(
      req,
      AdminAction.POLLING_UNIT_CREATE,
      ResourceType.POLLING_UNIT,
      pollingUnit.id,
      {
        success: true,
        pollingUnitCode: pollingUnit.pollingUnitCode,
        state,
        lga,
        ward,
      },
    );

    res.status(201).json({
      success: true,
      message: 'Polling unit created successfully',
      data: { pollingUnit },
    });
  } catch (error) {
    await createAdminLog(req, AdminAction.POLLING_UNIT_CREATE, ResourceType.POLLING_UNIT, null, {
      success: false,
      pollingUnitCode,
      state,
      lga,
      ward,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log polling unit creation error', logErr));
    next(error);
  }
};

/**
 * Update a polling unit
 * @route PUT /api/v1/admin/polling-units/:pollingUnitId
 * @access Private (Regional Officer)
 */
export const updatePollingUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { pollingUnitId } = req.params;
  const { pollingUnitName, address, latitude, longitude } = req.body;

  try {
    const existingPollingUnit = await pollingUnitService.getPollingUnitById(pollingUnitId);
    if (!existingPollingUnit) {
      throw new ApiError(404, 'Polling unit not found', 'RESOURCE_NOT_FOUND');
    }

    const updatedPollingUnit = await pollingUnitService.updatePollingUnit(pollingUnitId, {
      pollingUnitName,
      address,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
    });

    await createAdminLog(
      req,
      AdminAction.POLLING_UNIT_UPDATE,
      ResourceType.POLLING_UNIT,
      pollingUnitId,
      {
        success: true,
        updatedFields: Object.keys(req.body)
          .filter(k => ['pollingUnitName', 'address', 'latitude', 'longitude'].includes(k))
          .join(', '),
      },
    );

    res.status(200).json({
      success: true,
      message: 'Polling unit updated successfully',
      data: { pollingUnit: updatedPollingUnit },
    });
  } catch (error) {
    await createAdminLog(
      req,
      AdminAction.POLLING_UNIT_UPDATE,
      ResourceType.POLLING_UNIT,
      pollingUnitId,
      {
        success: false,
        updatedFields: Object.keys(req.body).join(', '),
        error: (error as Error).message,
      },
    ).catch(logErr => logger.error('Failed to log polling unit update error', logErr));
    next(error);
  }
};

/**
 * Get regional statistics (state-based)
 * @route GET /api/v1/admin/regions/:state/statistics
 * @access Private (Regional Officer)
 */
export const getRegionStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { state } = req.params;

  try {
    // TODO: Implement regional statistics retrieval
    // This would involve aggregating data for:
    // - Total polling units in the state
    // - Total registered voters
    // - Voting statistics by LGA and Ward
    // - Election participation rates

    const statistics = {
      state,
      totalPollingUnits: 0,
      totalRegisteredVoters: 0,
      activeElections: 0,
      // TODO: Add more statistical data
    };

    await createAdminLog(req, AdminAction.SYSTEM_STATS_VIEW, ResourceType.POLLING_UNIT, null, {
      state,
      success: true,
    });

    res.status(200).json({
      success: true,
      message: 'Regional statistics retrieved successfully',
      data: statistics,
    });
  } catch (error) {
    await createAdminLog(req, AdminAction.SYSTEM_STATS_VIEW, ResourceType.POLLING_UNIT, null, {
      state,
      success: false,
      error: (error as Error).message,
    }).catch(logErr => logger.error('Failed to log region statistics view error', logErr));
    next(error);
  }
};
