import { Request, Response } from 'express';
import { auditService } from '../../services';

/**
 * Get audit logs with filtering and pagination
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      actionType, 
      startDate, 
      endDate, 
      userId, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Get audit logs from service
    const result = await auditService.getAuditLogs(
      actionType as string,
      startDate as string,
      endDate as string,
      userId as string,
      Number(page),
      Number(limit)
    );
    
    // Log this audit log view
    await auditService.createAuditLog(
      (req as any).user.id,
      'audit_log_view',
      req.ip || '',
      req.headers['user-agent'] || '',
      { query: req.query }
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: (error as Error).message
    });
  }
};
