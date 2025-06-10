"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardData = void 0;
const express_validator_1 = require("express-validator");
const dashboardService_1 = require("../../services/dashboardService");
const logger_1 = __importDefault(require("../../utils/logger"));
class AppError extends Error {
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
/**
 * Get comprehensive dashboard data for a specific election
 * @route GET /api/v1/voter/dashboard/:electionId
 * @description Retrieve all dashboard data for a specific election in a single API call
 * @access Private (Authenticated voters)
 */
const getDashboardData = async (req, res) => {
    try {
        // Validate request
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new AppError('Validation failed', 400, errors.array());
        }
        const { electionId } = req.params;
        const { userId, includeRealTime = 'true', includeRegionalBreakdown = 'true' } = req.query;
        // Parse query parameters
        const includeRealTimeData = includeRealTime === 'true';
        const includeRegionalData = includeRegionalBreakdown === 'true';
        const requestingUserId = userId;
        // Get authenticated user ID from token
        const authUserId = req.user?.id;
        const startTime = Date.now();
        // Fetch comprehensive dashboard data
        const dashboardData = await dashboardService_1.dashboardService.getComprehensiveDashboardData({
            electionId,
            userId: requestingUserId || authUserId,
            includeRealTime: includeRealTimeData,
            includeRegionalBreakdown: includeRegionalData,
        });
        const responseTime = Date.now() - startTime;
        // Log successful request
        logger_1.default.info('Dashboard data retrieved', {
            electionId,
            userId: requestingUserId || authUserId,
            responseTime,
            includeRealTime: includeRealTimeData,
            includeRegionalData: includeRegionalData,
        });
        res.status(200).json({
            ...dashboardData,
            metadata: {
                ...dashboardData.metadata,
                responseTime,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error retrieving dashboard data:', error, {
            electionId: req.params.electionId,
            userId: req.query.userId || req.user?.id,
        });
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                error: error.message,
                message: error.message,
                details: error.details,
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            });
        }
        else {
            res.status(500).json({
                error: 'Internal server error',
                message: 'An unexpected error occurred while retrieving dashboard data',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            });
        }
    }
};
exports.getDashboardData = getDashboardData;
//# sourceMappingURL=dashboardController.js.map