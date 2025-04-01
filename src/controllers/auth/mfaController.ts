import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { mfaService, auditService } from '../../services';
import { ApiError } from '../../middleware/errorHandler';
import { AuditActionType } from '../../db/models/AuditLog';
import { UserRole } from '../../types';

/**
 * Set up MFA for a user
 * @route POST /api/v1/auth/setup-mfa
 * @access Private
 */
export const setupMfa = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.adminType !== UserRole.VOTER;

    if (!userId) {
      const error = new ApiError(
        401,
        'User ID not found in request',
        'AUTHENTICATION_REQUIRED',
        undefined,
        true,
      );
      throw error;
    }

    try {
      // Generate MFA secret
      const result = await mfaService.generateMfaSecret(userId, isAdmin);

      // Log the action using enum
      await auditService.createAuditLog(
        userId,
        AuditActionType.MFA_SETUP,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: true },
      );

      res.status(200).json({
        success: true,
        message: 'MFA setup information generated',
        data: {
          secret: result.secret,
          otpAuthUrl: result.otpAuthUrl,
          qrCodeUrl: result.qrCodeUrl,
        },
      });
    } catch (error: any) {
      const apiError = new ApiError(
        400,
        'Failed to set up MFA',
        'MFA_SETUP_FAILED',
        undefined,
        true,
      );
      throw apiError;
    }
  } catch (error: any) {
    next(error);
  }
};

/**
 * Enable MFA after verification
 * @route POST /api/v1/auth/enable-mfa
 * @access Private
 */
export const enableMfa = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;
    const isAdmin = req.user?.adminType !== UserRole.VOTER;

    if (!userId) {
      const error = new ApiError(
        401,
        'User ID not found in request',
        'AUTHENTICATION_REQUIRED',
        undefined,
        true,
      );
      throw error;
    }

    try {
      // Verify and enable MFA
      const verified = await mfaService.verifyMfaToken(userId, token, isAdmin);

      if (!verified) {
        await auditService.createAuditLog(
          userId,
          AuditActionType.MFA_VERIFY,
          req.ip || '',
          req.headers['user-agent'] || '',
          { success: false, error: 'Invalid MFA token during enable' },
        );
        const error = new ApiError(401, 'Invalid MFA token', 'INVALID_MFA_TOKEN', undefined, true);
        throw error;
      }

      await auditService.createAuditLog(
        userId,
        AuditActionType.MFA_ENABLED,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: true },
      );

      res.status(200).json({
        success: true,
        message: 'MFA enabled successfully',
      });
    } catch (error: any) {
      if (!(error instanceof ApiError && error.code === 'INVALID_MFA_TOKEN')) {
        await auditService.createAuditLog(
          userId,
          AuditActionType.MFA_ENABLED,
          req.ip || '',
          req.headers['user-agent'] || '',
          { success: false, error: (error as Error).message },
        );
      }
      if (error instanceof ApiError) {
        throw error;
      } else {
        const apiError = new ApiError(
          400,
          'Failed to enable MFA',
          'MFA_ENABLE_FAILED',
          undefined,
          true,
        );
        throw apiError;
      }
    }
  } catch (error: any) {
    next(error);
  }
};

/**
 * Disable MFA
 * @route POST /api/v1/auth/disable-mfa
 * @access Private
 */
export const disableMfa = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;
    const isAdmin = req.user?.adminType !== UserRole.VOTER;

    if (!userId) {
      const error = new ApiError(
        401,
        'User ID not found in request',
        'AUTHENTICATION_REQUIRED',
        undefined,
        true,
      );
      throw error;
    }

    try {
      // Disable MFA - requires token verification implicitly
      const result = await mfaService.disableMfa(userId, token, isAdmin);

      if (!result) {
        await auditService.createAuditLog(
          userId,
          AuditActionType.MFA_DISABLED,
          req.ip || '',
          req.headers['user-agent'] || '',
          { success: false, error: 'Invalid MFA token during disable' },
        );
        const error = new ApiError(401, 'Invalid MFA token', 'INVALID_MFA_TOKEN', undefined, true);
        throw error;
      }

      await auditService.createAuditLog(
        userId,
        AuditActionType.MFA_DISABLED,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: true },
      );

      res.status(200).json({
        success: true,
        message: 'MFA disabled successfully',
      });
    } catch (error: any) {
      if (!(error instanceof ApiError && error.code === 'INVALID_MFA_TOKEN')) {
        await auditService.createAuditLog(
          userId,
          AuditActionType.MFA_DISABLED,
          req.ip || '',
          req.headers['user-agent'] || '',
          { success: false, error: (error as Error).message },
        );
      }
      if (error instanceof ApiError) {
        throw error;
      } else {
        const apiError = new ApiError(
          400,
          'Failed to disable MFA',
          'MFA_DISABLE_FAILED',
          undefined,
          true,
        );
        throw apiError;
      }
    }
  } catch (error: any) {
    next(error);
  }
};

/**
 * Generate backup codes
 * @route POST /api/v1/auth/generate-backup-codes
 * @access Private
 */
export const generateBackupCodes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.adminType !== UserRole.VOTER;

    if (!userId) {
      const error = new ApiError(
        401,
        'User ID not found in request',
        'AUTHENTICATION_REQUIRED',
        undefined,
        true,
      );
      throw error;
    }

    try {
      // Generate backup codes
      const backupCodes = await mfaService.generateBackupCodes(userId, isAdmin);

      // Log the action using enum
      await auditService.createAuditLog(
        userId,
        AuditActionType.BACKUP_CODES_GENERATED,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: true },
      );

      res.status(200).json({
        success: true,
        message: 'Backup codes generated successfully',
        data: {
          backupCodes,
        },
      });
    } catch (error: any) {
      await auditService.createAuditLog(
        userId,
        AuditActionType.BACKUP_CODES_GENERATED,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: false, error: (error as Error).message },
      );
      const apiError = new ApiError(
        400,
        'Failed to generate backup codes',
        'BACKUP_CODES_GENERATION_FAILED',
        undefined,
        true,
      );
      throw apiError;
    }
  } catch (error: any) {
    next(error);
  }
};

/**
 * Verify backup code
 * @route POST /api/v1/auth/verify-backup-code
 * @access Public
 */
export const verifyBackupCode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, backupCode } = req.body;
    const isAdmin = req.body.isAdmin === true;

    try {
      // Verify backup code
      const isValid = await mfaService.verifyBackupCode(userId, backupCode, isAdmin);

      if (!isValid) {
        await auditService.createAuditLog(
          userId,
          AuditActionType.BACKUP_CODE_VERIFY,
          req.ip || '',
          req.headers['user-agent'] || '',
          { success: false, error: 'Invalid backup code' },
        );
        const error = new ApiError(
          401,
          'Invalid backup code',
          'INVALID_BACKUP_CODE',
          undefined,
          true,
        );
        throw error;
      }

      await auditService.createAuditLog(
        userId,
        AuditActionType.BACKUP_CODE_VERIFY,
        req.ip || '',
        req.headers['user-agent'] || '',
        { success: true },
      );

      res.status(200).json({
        success: true,
        message: 'Backup code verified successfully',
      });
    } catch (error: any) {
      if (!(error instanceof ApiError && error.code === 'INVALID_BACKUP_CODE')) {
        await auditService.createAuditLog(
          userId,
          AuditActionType.BACKUP_CODE_VERIFY,
          req.ip || '',
          req.headers['user-agent'] || '',
          { success: false, error: (error as Error).message },
        );
      }
      if (error instanceof ApiError) {
        throw error;
      } else {
        const apiError = new ApiError(
          400,
          'Failed to verify backup code',
          'BACKUP_CODE_VERIFICATION_FAILED',
          undefined,
          true,
        );
        throw apiError;
      }
    }
  } catch (error: any) {
    next(error);
  }
};
