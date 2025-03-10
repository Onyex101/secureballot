import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { mfaService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';

/**
 * Set up MFA for a user
 * @route POST /api/v1/auth/setup-mfa
 * @access Private
 */
export const setupMfa = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role !== 'voter';

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Generate MFA secret
      const result = await mfaService.generateMfaSecret(userId, isAdmin);
      
      // Log the action
      await auditService.createAuditLog(
        userId,
        'mfa_setup',
        req.ip || '',
        req.headers['user-agent'] || '',
        {}
      );
      
      res.status(200).json({
        success: true,
        message: 'MFA setup information generated',
        data: {
          secret: result.secret,
          otpAuthUrl: result.otpAuthUrl,
          qrCodeUrl: result.qrCodeUrl
        }
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to set up MFA');
      apiError.statusCode = 400;
      apiError.code = 'MFA_SETUP_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Enable MFA after verification
 * @route POST /api/v1/auth/enable-mfa
 * @access Private
 */
export const enableMfa = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;
    const isAdmin = req.user?.role !== 'voter';

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Verify and enable MFA
      const verified = await mfaService.verifyMfaToken(userId, token, isAdmin);
      
      if (!verified) {
        const error: ApiError = new Error('Invalid MFA token');
        error.statusCode = 401;
        error.code = 'INVALID_MFA_TOKEN';
        error.isOperational = true;
        throw error;
      }
      
      // Log the action
      await auditService.createAuditLog(
        userId,
        'mfa_enabled',
        req.ip || '',
        req.headers['user-agent'] || '',
        {}
      );
      
      res.status(200).json({
        success: true,
        message: 'MFA enabled successfully'
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to enable MFA');
      apiError.statusCode = 400;
      apiError.code = 'MFA_ENABLE_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Disable MFA
 * @route POST /api/v1/auth/disable-mfa
 * @access Private
 */
export const disableMfa = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;
    const isAdmin = req.user?.role !== 'voter';

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Disable MFA
      const result = await mfaService.disableMfa(userId, token, isAdmin);
      
      if (!result) {
        const error: ApiError = new Error('Invalid MFA token');
        error.statusCode = 401;
        error.code = 'INVALID_MFA_TOKEN';
        error.isOperational = true;
        throw error;
      }
      
      // Log the action
      await auditService.createAuditLog(
        userId,
        'mfa_disabled',
        req.ip || '',
        req.headers['user-agent'] || '',
        {}
      );
      
      res.status(200).json({
        success: true,
        message: 'MFA disabled successfully'
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to disable MFA');
      apiError.statusCode = 400;
      apiError.code = 'MFA_DISABLE_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Generate backup codes
 * @route POST /api/v1/auth/generate-backup-codes
 * @access Private
 */
export const generateBackupCodes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role !== 'voter';

    if (!userId) {
      const error: ApiError = new Error('User ID not found in request');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      error.isOperational = true;
      throw error;
    }

    try {
      // Generate backup codes
      const backupCodes = await mfaService.generateBackupCodes(userId, isAdmin);
      
      // Log the action
      await auditService.createAuditLog(
        userId,
        'backup_codes_generated',
        req.ip || '',
        req.headers['user-agent'] || '',
        {}
      );
      
      res.status(200).json({
        success: true,
        message: 'Backup codes generated successfully',
        data: {
          backupCodes
        }
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to generate backup codes');
      apiError.statusCode = 400;
      apiError.code = 'BACKUP_CODES_GENERATION_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verify backup code
 * @route POST /api/v1/auth/verify-backup-code
 * @access Public
 */
export const verifyBackupCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, backupCode } = req.body;
    const isAdmin = req.body.isAdmin === true;

    try {
      // Verify backup code
      const verified = await mfaService.verifyBackupCode(userId, backupCode, isAdmin);
      
      if (!verified) {
        const error: ApiError = new Error('Invalid backup code');
        error.statusCode = 401;
        error.code = 'INVALID_BACKUP_CODE';
        error.isOperational = true;
        throw error;
      }
      
      // Log the action
      await auditService.createAuditLog(
        userId,
        'backup_code_used',
        req.ip || '',
        req.headers['user-agent'] || '',
        {}
      );
      
      res.status(200).json({
        success: true,
        message: 'Backup code verified successfully'
      });
    } catch (error) {
      const apiError: ApiError = new Error('Failed to verify backup code');
      apiError.statusCode = 400;
      apiError.code = 'BACKUP_CODE_VERIFICATION_FAILED';
      apiError.isOperational = true;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};
