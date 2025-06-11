"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuspiciousActivities = exports.getSecurityLogs = void 0;
const auditService = __importStar(require("../../services/auditService"));
const suspiciousActivityService = __importStar(require("../../services/suspiciousActivityService"));
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
/**
 * Get security logs with filtering and pagination
 */
const getSecurityLogs = async (req, res, next) => {
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        const { severity, startDate, endDate, page = 1, limit = 50 } = req.query;
        // Get security logs from service
        const result = await auditService.getSecurityLogs(severity, startDate, endDate, Number(page), Number(limit));
        // Log this security log view using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.SECURITY_LOG_VIEW, adminLogService_1.ResourceType.SECURITY_LOG, null, {
            query: req.query,
            success: true,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // Log failure using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.SECURITY_LOG_VIEW, adminLogService_1.ResourceType.SECURITY_LOG, null, {
            query: req.query,
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log security log view error', logErr));
        next(error);
    }
};
exports.getSecurityLogs = getSecurityLogs;
/**
 * Get suspicious activities with filtering and pagination
 */
const getSuspiciousActivities = async (req, res, next) => {
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        const { severity, status, type, startDate, endDate, sourceIp, page = 1, limit = 50, } = req.query;
        // Get suspicious activities from service
        const result = await suspiciousActivityService.getSuspiciousActivities({
            severity: severity,
            status: status,
            type: type,
            startDate: startDate,
            endDate: endDate,
            sourceIp: sourceIp,
        }, Number(page), Number(limit));
        // Log this suspicious activity view using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.SUSPICIOUS_ACTIVITY_INVESTIGATE, adminLogService_1.ResourceType.AUDIT_LOG, null, {
            query: req.query,
            success: true,
            activitiesCount: result.activities.length,
        });
        res.status(200).json({
            success: true,
            data: result,
            message: 'Suspicious activities retrieved successfully',
        });
    }
    catch (error) {
        // Log failure using admin logs
        await (0, auditHelpers_1.createAdminLog)(req, adminLogService_1.AdminAction.SUSPICIOUS_ACTIVITY_INVESTIGATE, adminLogService_1.ResourceType.AUDIT_LOG, null, {
            query: req.query,
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log suspicious activity view error', logErr));
        next(error);
    }
};
exports.getSuspiciousActivities = getSuspiciousActivities;
//# sourceMappingURL=securityOfficerController.js.map