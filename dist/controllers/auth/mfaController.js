"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBackupCode = exports.generateBackupCodes = exports.disableMfa = exports.enableMfa = exports.setupMfa = void 0;
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const types_1 = require("../../types");
/**
 * Set up MFA for a user
 * @route POST /api/v1/auth/setup-mfa
 * @access Private
 */
const setupMfa = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const isAdmin = req.user?.adminType !== types_1.UserRole.VOTER;
        if (!userId) {
            const error = new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED', undefined, true);
            throw error;
        }
        try {
            // Generate MFA secret
            const result = await services_1.mfaService.generateMfaSecret(userId, isAdmin);
            // Log the action using enum
            await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MFA_SETUP, req.ip || '', req.headers['user-agent'] || '', { success: true });
            res.status(200).json({
                success: true,
                message: 'MFA setup information generated',
                data: {
                    secret: result.secret,
                    otpAuthUrl: result.otpAuthUrl,
                    qrCodeUrl: result.qrCodeUrl,
                },
            });
        }
        catch (error) {
            const apiError = new errorHandler_1.ApiError(400, 'Failed to set up MFA', 'MFA_SETUP_FAILED', undefined, true);
            throw apiError;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.setupMfa = setupMfa;
/**
 * Enable MFA after verification
 * @route POST /api/v1/auth/enable-mfa
 * @access Private
 */
const enableMfa = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { token } = req.body;
        const isAdmin = req.user?.adminType !== types_1.UserRole.VOTER;
        if (!userId) {
            const error = new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED', undefined, true);
            throw error;
        }
        try {
            // Verify and enable MFA
            const verified = await services_1.mfaService.verifyMfaToken(userId, token, isAdmin);
            if (!verified) {
                await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MFA_VERIFY, req.ip || '', req.headers['user-agent'] || '', { success: false, error: 'Invalid MFA token during enable' });
                const error = new errorHandler_1.ApiError(401, 'Invalid MFA token', 'INVALID_MFA_TOKEN', undefined, true);
                throw error;
            }
            await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MFA_ENABLED, req.ip || '', req.headers['user-agent'] || '', { success: true });
            res.status(200).json({
                success: true,
                message: 'MFA enabled successfully',
            });
        }
        catch (error) {
            if (!(error instanceof errorHandler_1.ApiError && error.code === 'INVALID_MFA_TOKEN')) {
                await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MFA_ENABLED, req.ip || '', req.headers['user-agent'] || '', { success: false, error: error.message });
            }
            if (error instanceof errorHandler_1.ApiError) {
                throw error;
            }
            else {
                const apiError = new errorHandler_1.ApiError(400, 'Failed to enable MFA', 'MFA_ENABLE_FAILED', undefined, true);
                throw apiError;
            }
        }
    }
    catch (error) {
        next(error);
    }
};
exports.enableMfa = enableMfa;
/**
 * Disable MFA
 * @route POST /api/v1/auth/disable-mfa
 * @access Private
 */
const disableMfa = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { token } = req.body;
        const isAdmin = req.user?.adminType !== types_1.UserRole.VOTER;
        if (!userId) {
            const error = new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED', undefined, true);
            throw error;
        }
        try {
            // Disable MFA - requires token verification implicitly
            const result = await services_1.mfaService.disableMfa(userId, token, isAdmin);
            if (!result) {
                await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MFA_DISABLED, req.ip || '', req.headers['user-agent'] || '', { success: false, error: 'Invalid MFA token during disable' });
                const error = new errorHandler_1.ApiError(401, 'Invalid MFA token', 'INVALID_MFA_TOKEN', undefined, true);
                throw error;
            }
            await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MFA_DISABLED, req.ip || '', req.headers['user-agent'] || '', { success: true });
            res.status(200).json({
                success: true,
                message: 'MFA disabled successfully',
            });
        }
        catch (error) {
            if (!(error instanceof errorHandler_1.ApiError && error.code === 'INVALID_MFA_TOKEN')) {
                await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MFA_DISABLED, req.ip || '', req.headers['user-agent'] || '', { success: false, error: error.message });
            }
            if (error instanceof errorHandler_1.ApiError) {
                throw error;
            }
            else {
                const apiError = new errorHandler_1.ApiError(400, 'Failed to disable MFA', 'MFA_DISABLE_FAILED', undefined, true);
                throw apiError;
            }
        }
    }
    catch (error) {
        next(error);
    }
};
exports.disableMfa = disableMfa;
/**
 * Generate backup codes
 * @route POST /api/v1/auth/generate-backup-codes
 * @access Private
 */
const generateBackupCodes = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const isAdmin = req.user?.adminType !== types_1.UserRole.VOTER;
        if (!userId) {
            const error = new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED', undefined, true);
            throw error;
        }
        try {
            // Generate backup codes
            const backupCodes = await services_1.mfaService.generateBackupCodes(userId, isAdmin);
            // Log the action using enum
            await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.BACKUP_CODES_GENERATED, req.ip || '', req.headers['user-agent'] || '', { success: true });
            res.status(200).json({
                success: true,
                message: 'Backup codes generated successfully',
                data: {
                    backupCodes,
                },
            });
        }
        catch (error) {
            await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.BACKUP_CODES_GENERATED, req.ip || '', req.headers['user-agent'] || '', { success: false, error: error.message });
            const apiError = new errorHandler_1.ApiError(400, 'Failed to generate backup codes', 'BACKUP_CODES_GENERATION_FAILED', undefined, true);
            throw apiError;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.generateBackupCodes = generateBackupCodes;
/**
 * Verify backup code
 * @route POST /api/v1/auth/verify-backup-code
 * @access Public
 */
const verifyBackupCode = async (req, res, next) => {
    try {
        const { userId, backupCode } = req.body;
        const isAdmin = req.body.isAdmin === true;
        try {
            // Verify backup code
            const isValid = await services_1.mfaService.verifyBackupCode(userId, backupCode, isAdmin);
            if (!isValid) {
                await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.BACKUP_CODE_VERIFY, req.ip || '', req.headers['user-agent'] || '', { success: false, error: 'Invalid backup code' });
                const error = new errorHandler_1.ApiError(401, 'Invalid backup code', 'INVALID_BACKUP_CODE', undefined, true);
                throw error;
            }
            await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.BACKUP_CODE_VERIFY, req.ip || '', req.headers['user-agent'] || '', { success: true });
            res.status(200).json({
                success: true,
                message: 'Backup code verified successfully',
            });
        }
        catch (error) {
            if (!(error instanceof errorHandler_1.ApiError && error.code === 'INVALID_BACKUP_CODE')) {
                await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.BACKUP_CODE_VERIFY, req.ip || '', req.headers['user-agent'] || '', { success: false, error: error.message });
            }
            if (error instanceof errorHandler_1.ApiError) {
                throw error;
            }
            else {
                const apiError = new errorHandler_1.ApiError(400, 'Failed to verify backup code', 'BACKUP_CODE_VERIFICATION_FAILED', undefined, true);
                throw apiError;
            }
        }
    }
    catch (error) {
        next(error);
    }
};
exports.verifyBackupCode = verifyBackupCode;
//# sourceMappingURL=mfaController.js.map