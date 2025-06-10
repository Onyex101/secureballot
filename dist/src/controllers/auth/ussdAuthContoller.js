"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUssdSession = exports.authenticateViaUssd = void 0;
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
/**
 * Authenticate a voter via USSD
 * @route POST /api/v1/auth/ussd/authenticate
 * @access Public
 */
const authenticateViaUssd = async (req, res, next) => {
    try {
        const { nin, vin, phoneNumber } = req.body;
        try {
            // Start a USSD session (which authenticates the voter)
            const result = await services_1.ussdService.startSession(nin, vin, phoneNumber);
            // Log the action
            await services_1.auditService.createAuditLog('ussd_system', AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
                success: true,
                context: 'authentication',
                phoneNumber,
                sessionCode: result.sessionCode,
            });
            res.status(200).json({
                success: true,
                message: 'USSD authentication successful',
                data: {
                    sessionCode: result.sessionCode,
                    expiresAt: result.expiresAt,
                },
            });
        }
        catch (error) {
            // Log failed authentication attempt
            await services_1.auditService.createAuditLog('unknown', AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
                success: false,
                context: 'authentication',
                phoneNumber,
                error: error.message,
            });
            const apiError = new errorHandler_1.ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS', undefined, true);
            throw apiError;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.authenticateViaUssd = authenticateViaUssd;
/**
 * Verify USSD session
 * @route POST /api/v1/auth/ussd/verify-session
 * @access Public
 */
const verifyUssdSession = async (req, res, next) => {
    try {
        const { sessionCode } = req.body;
        try {
            // Get session status
            const result = await services_1.ussdService.getSessionStatus(sessionCode);
            // Check if session is valid
            const isValid = result.status !== 'expired' &&
                result.status !== 'cancelled' &&
                new Date(result.expiresAt) > new Date();
            // Log the action
            await services_1.auditService.createAuditLog(result.userId || 'ussd_system', AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
                success: isValid,
                context: 'verification',
                sessionCode,
                isValid,
                ...(isValid ? { userId: result.userId } : { error: 'Invalid or expired session' }),
            });
            if (!isValid) {
                const error = new errorHandler_1.ApiError(401, 'Invalid or expired session', 'INVALID_SESSION', undefined, true);
                throw error;
            }
            // Generate a token if the session is valid
            const token = services_1.authService.generateToken(result.userId || '', 'voter', '1h');
            res.status(200).json({
                success: true,
                message: 'USSD session verified',
                data: {
                    token,
                    userId: result.userId,
                    status: result.status,
                },
            });
        }
        catch (error) {
            if (!(error instanceof errorHandler_1.ApiError && error.code === 'INVALID_SESSION')) {
                await services_1.auditService.createAuditLog(req.body.sessionCode
                    ? (await services_1.ussdService.getSessionStatus(req.body.sessionCode).catch(() => null))
                        ?.userId || 'ussd_system'
                    : 'ussd_system', AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
                    success: false,
                    context: 'verification',
                    sessionCode: req.body.sessionCode,
                    error: error.message,
                });
            }
            if (error instanceof errorHandler_1.ApiError) {
                throw error;
            }
            else {
                const apiError = new errorHandler_1.ApiError(400, 'Failed to verify USSD session', 'SESSION_VERIFICATION_FAILED', undefined, true);
                throw apiError;
            }
        }
    }
    catch (error) {
        next(error);
    }
};
exports.verifyUssdSession = verifyUssdSession;
//# sourceMappingURL=ussdAuthContoller.js.map