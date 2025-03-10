import { Request, Response, NextFunction } from 'express';
import { ussdService, authService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Authenticate a voter via USSD
 * @route POST /api/v1/auth/ussd/authenticate
 * @access Public
 */
export const authenticateViaUssd = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nin, vin, phoneNumber } = req.body;
    
    try {
      // Start a USSD session (which authenticates the voter)
      const result = await ussdService.startSession(nin, vin, phoneNumber);
      
      // Log the action
      await auditService.createAuditLog(
        'ussd_system', // No user ID yet
        'ussd_authentication',
        req.ip || '',
        req.headers['user-agent'] || '',
        { 
          phoneNumber,
          sessionCode: result.sessionCode
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'USSD authentication successful',
        data: {
          sessionCode: result.sessionCode,
          expiresAt: result.expiresAt
        }
      });
    } catch (error) {
      // Log failed authentication attempt
      await auditService.createAuditLog(
        'unknown',
        'ussd_authentication_failed',
        req.ip || '',
        req.headers['user-agent'] || '',
        { 
          phoneNumber,
          error: (error as Error).message
        }
      );
      
      const apiError: ApiError = new Error('Invalid credentials');
      apiError.statusCode = 401;
      apiError.code = 'INVALID_CREDENTIALS';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verify USSD session
 * @route POST /api/v1/auth/ussd/verify-session
 * @access Public
 */
export const verifyUssdSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionCode } = req.body;
    
    try {
      // Get session status
      const result = await ussdService.getSessionStatus(sessionCode);
      
      // Check if session is valid
      const isValid = result.status !== 'expired' && result.status !== 'cancelled' && 
                     new Date(result.expiresAt) > new Date();
      
      // Log the action
      await auditService.createAuditLog(
        result.userId || 'ussd_system',
        'ussd_session_verification',
        req.ip || '',
        req.headers['user-agent'] || '',
        { 
          sessionCode,
          isValid
        }
      );
      
      if (!isValid) {
        const error: ApiError = new Error('Invalid or expired session');
        error.statusCode = 401;
        error.code = 'INVALID_SESSION';
        error.isOperational = true;
        throw error;
      }
      
      // Generate a token if the session is valid
      const token = authService.generateToken(result.userId || '', 'voter', '1h');
      
      res.status(200).json({
        success: true,
        message: 'USSD session verified',
        data: {
          token,
          userId: result.userId,
          status: result.status
        }
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to verify USSD session');
      apiError.statusCode = 400;
      apiError.code = 'SESSION_VERIFICATION_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
