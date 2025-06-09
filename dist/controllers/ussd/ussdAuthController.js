"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUssdSession = exports.authenticateViaUssd = void 0;
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../../config/logger");
const AuditLog_1 = require("../../db/models/AuditLog");
/**
 * Authenticate a voter via USSD
 * @route POST /api/v1/ussd/auth
 * @access Public
 */
const authenticateViaUssd = async (req, res, next) => {
    const { nin, vin, phoneNumber } = req.body;
    let voterId;
    let sessionCode;
    try {
        // Authenticate voter
        const voter = await services_1.authService.authenticateVoterForUssd(nin, vin, phoneNumber);
        voterId = voter.id;
        // Generate a session code
        sessionCode = await services_1.ussdService.createUssdSession(voter.id, phoneNumber);
        // Log the authentication success
        await services_1.auditService.createAuditLog(voter.id, AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            context: 'authentication',
            phoneNumber,
            sessionCode,
        });
        // Send session code via SMS (placeholder log)
        logger_1.logger.debug(`[SMS] To: ${phoneNumber}, Message: Your USSD voting session code is: ${sessionCode}`);
        res.status(200).json({
            success: true,
            message: 'USSD authentication successful. Check SMS for session code.',
            data: {
                // Avoid sending session code in response if sent via SMS
                expiresIn: 600, // 10 minutes in seconds
            },
        });
    }
    catch (error) {
        // Log failure
        await services_1.auditService
            .createAuditLog(voterId || 'unknown', AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
            success: false,
            context: 'authentication',
            phoneNumber,
            nin,
            vin,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log USSD auth error', logErr));
        // Pass error to global handler
        next(error instanceof errorHandler_1.ApiError
            ? error
            : new errorHandler_1.ApiError(401, 'Authentication failed', 'AUTHENTICATION_FAILED'));
    }
};
exports.authenticateViaUssd = authenticateViaUssd;
/**
 * Verify a USSD session
 * @route POST /api/v1/ussd/verify-session
 * @access Public
 */
const verifyUssdSession = async (req, res, next) => {
    const { sessionCode, phoneNumber } = req.body;
    let userIdFromSession;
    try {
        if (!sessionCode || !phoneNumber) {
            throw new errorHandler_1.ApiError(400, 'sessionCode and phoneNumber are required', 'MISSING_SESSION_INFO');
        }
        // Verify the session
        const session = await services_1.ussdService.verifyUssdSession(sessionCode, phoneNumber);
        userIdFromSession = session?.userId; // Capture for potential failure log
        if (!session) {
            // Log failure before throwing
            await services_1.auditService
                .createAuditLog(userIdFromSession || 'unknown', AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
                success: false,
                context: 'verification',
                phoneNumber,
                sessionCode,
                error: 'Invalid or expired session',
            })
                .catch(logErr => logger_1.logger.error('Failed to log USSD session verification error', logErr));
            throw new errorHandler_1.ApiError(401, 'Invalid or expired session', 'INVALID_SESSION');
        }
        // Log the verification success
        await services_1.auditService.createAuditLog(session.userId, AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            context: 'verification',
            phoneNumber,
            sessionCode,
        });
        res.status(200).json({
            success: true,
            message: 'USSD session verified',
            data: {
                userId: session.userId,
                isValid: true,
            },
        });
    }
    catch (error) {
        // Log failure if not already logged
        if (!(error instanceof errorHandler_1.ApiError && error.code === 'INVALID_SESSION')) {
            await services_1.auditService
                .createAuditLog(userIdFromSession || 'unknown', AuditLog_1.AuditActionType.USSD_SESSION, req.ip || '', req.headers['user-agent'] || '', {
                success: false,
                context: 'verification',
                phoneNumber,
                sessionCode,
                error: error.message,
            })
                .catch(logErr => logger_1.logger.error('Failed to log USSD session verification error', logErr));
        }
        // Pass error to global handler
        next(error instanceof errorHandler_1.ApiError
            ? error
            : new errorHandler_1.ApiError(401, 'Session verification failed', 'SESSION_VERIFICATION_FAILED'));
    }
};
exports.verifyUssdSession = verifyUssdSession;
//# sourceMappingURL=ussdAuthController.js.map