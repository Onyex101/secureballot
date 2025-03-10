import { Request, Response } from 'express';
import { auditService } from '../../services';

/**
 * Get security logs with filtering and pagination
 */
export const getSecurityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      severity, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Get security logs from service
    const result = await auditService.getSecurityLogs(
      severity as string,
      startDate as string,
      endDate as string,
      Number(page),
      Number(limit)
    );
    
    // Log this security log view
    await auditService.createAuditLog(
      (req as any).user.id,
      'security_log_view',
      req.ip || '',
      req.headers['user-agent'] || '',
      { query: req.query }
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security logs',
      error: (error as Error).message
    });
  }
};
