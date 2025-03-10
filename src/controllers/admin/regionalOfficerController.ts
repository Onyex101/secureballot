import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import db from '../../db/models';
import { ApiError } from '../../middleware/errorHandler';
import { pollingUnitService, auditService } from '../../services';

/**
 * Get polling units in a region
 * @route GET /api/v1/admin/regions/:regionId/polling-units
 * @access Private (Regional Officer)
 */
export const getRegionPollingUnits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { regionId } = req.params;
    const { page = 1, limit = 50, search } = req.query;
    
    // Get polling units for the region
    const result = await pollingUnitService.getPollingUnits(
      regionId,
      search as string,
      Number(page),
      Number(limit)
    );
    
    // Log the action
    await auditService.createAuditLog(
      req.user?.id || '',
      'region_polling_units_view',
      req.ip || '',
      req.headers['user-agent'] || '',
      { regionId }
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
          pages: Math.ceil(result.pagination.total / Number(limit))
        }
      }
    });
  } catch (error) {
    const apiError: ApiError = new Error(`Failed to retrieve polling units: ${(error as Error).message}`);
    apiError.statusCode = 400;
    apiError.code = 'POLLING_UNITS_RETRIEVAL_ERROR';
    apiError.isOperational = true;
    throw apiError;
  }
};

/**
 * Create a new polling unit in a region
 * @route POST /api/v1/admin/regions/:regionId/polling-units
 * @access Private (Regional Officer)
 */
export const createPollingUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { regionId } = req.params;
    const { name, code, address, capacity } = req.body;
    
    try {
      // Check if polling unit code already exists
      const existingPollingUnit = await pollingUnitService.getPollingUnitByCode(code);
      
      if (existingPollingUnit) {
        const error: ApiError = new Error('Polling unit code already exists');
        error.statusCode = 400;
        error.code = 'DUPLICATE_POLLING_UNIT_CODE';
        error.isOperational = true;
        throw error;
      }
      
      // Create the polling unit
      const pollingUnit = await pollingUnitService.createPollingUnit(
        name,
        code,
        address,
        regionId,
        undefined,  // latitude
        undefined   // longitude
      );
      
      // Log the action
      await auditService.createAuditLog(
        req.user?.id || '',
        'polling_unit_creation',
        req.ip || '',
        req.headers['user-agent'] || '',
        { 
          pollingUnitId: pollingUnit.id,
          regionId,
          pollingUnitCode: code
        }
      );
      
      res.status(201).json({
        success: true,
        message: 'Polling unit created successfully',
        data: {
          pollingUnit
        }
      });
    } catch (error) {
      const apiError: ApiError = new Error(`Failed to create polling unit: ${(error as Error).message}`);
      apiError.statusCode = 400;
      apiError.code = 'POLLING_UNIT_CREATION_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    if ((error as ApiError).isOperational) {
      throw error;
    }
    
    const apiError: ApiError = new Error(`Failed to create polling unit: ${(error as Error).message}`);
    apiError.statusCode = 400;
    apiError.code = 'POLLING_UNIT_CREATION_ERROR';
    apiError.isOperational = true;
    throw apiError;
  }
};

/**
 * Update a polling unit in a region
 * @route PUT /api/v1/admin/regions/:regionId/polling-units/:pollingUnitId
 * @access Private (Regional Officer)
 */
export const updatePollingUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { regionId, pollingUnitId } = req.params;
    const { name, address } = req.body;
    
    try {
      // Check if polling unit exists
      const existingPollingUnit = await pollingUnitService.getPollingUnitById(pollingUnitId);
      
      if (!existingPollingUnit) {
        const error: ApiError = new Error('Polling unit not found');
        error.statusCode = 404;
        error.code = 'RESOURCE_NOT_FOUND';
        error.isOperational = true;
        throw error;
      }
      
      // Check if polling unit belongs to the region
      // Extract region information from the polling unit
      const puState = existingPollingUnit.state;
      const puLga = existingPollingUnit.lga;
      const puWard = existingPollingUnit.ward;
      
      // Check if polling unit belongs to the region (simplified check)
      if (!puState || !puState.includes(regionId)) {
        const error: ApiError = new Error('Polling unit does not belong to this region');
        error.statusCode = 403;
        error.code = 'FORBIDDEN_RESOURCE';
        error.isOperational = true;
        throw error;
      }
      
      // Update the polling unit
      const pollingUnit = await pollingUnitService.updatePollingUnit(pollingUnitId, {
        name,
        address
      });
      
      // Log the action
      await auditService.createAuditLog(
        req.user?.id || '',
        'polling_unit_update',
        req.ip || '',
        req.headers['user-agent'] || '',
        { 
          pollingUnitId,
          regionId,
          updatedFields: Object.keys(req.body).join(', ')
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Polling unit updated successfully',
        data: {
          pollingUnit
        }
      });
    } catch (error) {
      const apiError: ApiError = new Error(`Failed to update polling unit: ${(error as Error).message}`);
      apiError.statusCode = 400;
      apiError.code = 'POLLING_UNIT_UPDATE_ERROR';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    if ((error as ApiError).isOperational) {
      throw error;
    }
    
    const apiError: ApiError = new Error(`Failed to update polling unit: ${(error as Error).message}`);
    apiError.statusCode = 400;
    apiError.code = 'POLLING_UNIT_UPDATE_ERROR';
    apiError.isOperational = true;
    throw apiError;
  }
};

/**
 * Get statistics for a region
 * @route GET /api/v1/admin/regions/:regionId/statistics
 * @access Private (Regional Officer)
 */
export const getRegionStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { regionId } = req.params;
    
    // Get statistics for the region
    const pollingUnitsCount = await pollingUnitService.countPollingUnitsByRegion(regionId);
    const registeredVotersCount = await pollingUnitService.countRegisteredVotersByRegion(regionId);
    const activeElections = await pollingUnitService.getActiveElectionsByRegion(regionId);
    
    // Log the action
    await auditService.createAuditLog(
      req.user?.id || '',
      'region_statistics_view',
      req.ip || '',
      req.headers['user-agent'] || '',
      { regionId }
    );
    
    res.status(200).json({
      success: true,
      message: 'Region statistics retrieved successfully',
      data: {
        region: {
          id: regionId,
          // In a real implementation, we would fetch the region name
          name: 'Region Name'
        },
        statistics: {
          pollingUnitsCount,
          registeredVotersCount,
          activeElections: activeElections.map((election: any) => ({
            id: election.id,
            name: election.electionName,
            type: election.electionType,
            startDate: election.startDate,
            endDate: election.endDate
          }))
        }
      }
    });
  } catch (error) {
    const apiError: ApiError = new Error(`Failed to retrieve region statistics: ${(error as Error).message}`);
    apiError.statusCode = 400;
    apiError.code = 'REGION_STATISTICS_ERROR';
    apiError.isOperational = true;
    throw apiError;
  }
};
