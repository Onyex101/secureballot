import { Request, Response } from 'express';
import { ussdService } from '../../services';
import { auditService } from '../../services';

/**
 * Start a new USSD session
 */
export const startSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nin, vin, phoneNumber } = req.body;
    
    // Start a new session
    const result = await ussdService.startSession(nin, vin, phoneNumber);
    
    // Log the action
    await auditService.createAuditLog(
      'ussd_system', // No user ID yet
      'ussd_session_start',
      req.ip || '',
      req.headers['user-agent'] || '',
      { 
        phoneNumber,
        sessionCode: result.sessionCode
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'USSD session started successfully',
      data: {
        sessionCode: result.sessionCode,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error starting USSD session:', error);
    
    res.status(400).json({
      success: false,
      message: (error as Error).message || 'Failed to start USSD session',
      code: 'USSD_SESSION_ERROR'
    });
  }
};

/**
 * Get session status
 */
export const getSessionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionCode } = req.body;
    
    // Get session status
    const result = await ussdService.getSessionStatus(sessionCode);
    
    // Log the action
    await auditService.createAuditLog(
      result.userId || 'ussd_system',
      'ussd_session_status_check',
      req.ip || '',
      req.headers['user-agent'] || '',
      { 
        sessionCode,
        status: result.status
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        status: result.status,
        expiresAt: result.expiresAt,
        lastActivity: result.lastActivity
      }
    });
  } catch (error) {
    console.error('Error checking USSD session status:', error);
    
    res.status(404).json({
      success: false,
      message: (error as Error).message || 'Failed to get session status',
      code: 'SESSION_NOT_FOUND'
    });
  }
};
