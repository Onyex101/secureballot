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
exports.getSecurityLogs = void 0;
const auditService = __importStar(require("../../services/auditService"));
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
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
        // Log this security log view
        await auditService.createAuditLog(userId, AuditLog_1.AuditActionType.SECURITY_LOG_VIEW, req.ip || '', req.headers['user-agent'] || '', { query: req.query, success: true });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // Log failure
        await auditService
            .createAuditLog(userId || 'unknown', AuditLog_1.AuditActionType.SECURITY_LOG_VIEW, req.ip || '', req.headers['user-agent'] || '', { query: req.query, success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log security log view error', logErr));
        next(error);
    }
};
exports.getSecurityLogs = getSecurityLogs;
//# sourceMappingURL=securityOfficerController.js.map