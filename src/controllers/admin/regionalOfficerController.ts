import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';
import { pollingUnitService, auditService } from '../../services';
import { AuditActionType } from '../../db/models/AuditLog';
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
  const userId = req.user?.id || 'unknown';

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

    await auditService.createAuditLog(
      userId,
      AuditActionType.REGION_POLLING_UNITS_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { state, query: req.query, success: true },
    );

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
    await auditService
      .createAuditLog(
        userId,
        AuditActionType.REGION_POLLING_UNITS_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { state, query: req.query, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log region polling units view error', logErr));
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
  const userId = req.user?.id || 'unknown';

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

    await auditService.createAuditLog(
      userId,
      AuditActionType.POLLING_UNIT_CREATE,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        pollingUnitId: pollingUnit.id,
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
    await auditService
      .createAuditLog(
        userId,
        AuditActionType.POLLING_UNIT_CREATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: false, pollingUnitCode, state, lga, ward, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log polling unit creation error', logErr));
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
  const userId = req.user?.id || 'unknown';

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

    await auditService.createAuditLog(
      userId,
      AuditActionType.POLLING_UNIT_UPDATE,
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        success: true,
        pollingUnitId,
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
    await auditService
      .createAuditLog(
        userId,
        AuditActionType.POLLING_UNIT_UPDATE,
        req.ip || '',
        req.headers['user-agent'] || '',
        {
          success: false,
          pollingUnitId,
          updatedFields: Object.keys(req.body).join(', '),
          error: (error as Error).message,
        },
      )
      .catch(logErr => logger.error('Failed to log polling unit update error', logErr));
    next(error);
  }
};

/**
 * Get statistics for a region (state)
 * @route GET /api/v1/admin/regions/:state/statistics
 * @access Private (Regional Officer)
 */
export const getRegionStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { state } = req.params;
  const userId = req.user?.id || 'unknown';

  try {
    const regionFilters = { state };

    const pollingUnitsCount = await pollingUnitService.countPollingUnitsByRegion(regionFilters);
    const registeredVotersCount =
      await pollingUnitService.countRegisteredVotersByRegion(regionFilters);
    const activeElections = await pollingUnitService.getActiveElectionsByRegion(regionFilters);

    await auditService.createAuditLog(
      userId,
      AuditActionType.REGION_STATS_VIEW,
      req.ip || '',
      req.headers['user-agent'] || '',
      { state, success: true },
    );

    res.status(200).json({
      success: true,
      message: 'Region statistics retrieved successfully',
      data: {
        region: {
          id: state,
          name: `State of ${state}`,
        },
        pollingUnitsCount,
        registeredVotersCount,
        activeElectionsCount: activeElections.length,
      },
    });
  } catch (error) {
    await auditService
      .createAuditLog(
        userId,
        AuditActionType.REGION_STATS_VIEW,
        req.ip || '',
        req.headers['user-agent'] || '',
        { state, success: false, error: (error as Error).message },
      )
      .catch(logErr => logger.error('Failed to log region stats view error', logErr));
    next(error);
  }
};
