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
exports.verifyVote = exports.castVote = void 0;
const ussdService = __importStar(require("../../services/ussdService"));
const AuditLog_1 = require("../../db/models/AuditLog");
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
/**
 * Cast a vote via USSD
 * @route POST /api/v1/ussd/vote (Example route)
 * @access Public (requires valid sessionCode)
 */
const castVote = async (req, res, next) => {
    const { sessionCode, electionId, candidateId } = req.body;
    const context = { sessionCode, electionId };
    try {
        if (!sessionCode || !electionId || !candidateId) {
            throw new errorHandler_1.ApiError(400, 'sessionCode, electionId, and candidateId are required', 'MISSING_VOTE_PARAMS');
        }
        // Cast the vote
        const result = await ussdService.castVote(sessionCode, electionId, candidateId);
        // Log the action using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.VOTE_CAST, adminLogService_1.AdminAction.RESULTS_VIEW, // Closest available for vote-related admin action
        adminLogService_1.ResourceType.VOTE, result.confirmationCode, {
            success: true,
            channel: 'ussd',
            sessionCode,
            electionId,
            confirmationCode: result.confirmationCode,
        });
        res.status(200).json({
            success: true,
            message: 'Vote cast successfully via USSD',
            data: {
                confirmationCode: result.confirmationCode,
            },
        });
    }
    catch (error) {
        // Log error using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.VOTE_CAST, adminLogService_1.AdminAction.RESULTS_VIEW, adminLogService_1.ResourceType.VOTE, null, {
            success: false,
            channel: 'ussd',
            ...context,
            candidateId,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log USSD vote cast error', logErr));
        next(error);
    }
};
exports.castVote = castVote;
/**
 * Verify a vote using receipt code (originating from USSD)
 * @route POST /api/v1/ussd/verify-vote (Example route)
 * @access Public
 */
const verifyVote = async (req, res, next) => {
    const { receiptCode, phoneNumber } = req.body;
    const context = { receiptCode, phoneNumber };
    try {
        if (!receiptCode || !phoneNumber) {
            throw new errorHandler_1.ApiError(400, 'receiptCode and phoneNumber are required', 'MISSING_VERIFY_PARAMS');
        }
        // Verify the vote using the specific USSD service verification
        const result = await ussdService.verifyVote(receiptCode, phoneNumber);
        // Log the action using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.VOTE_VERIFY, adminLogService_1.AdminAction.RESULTS_VIEW, adminLogService_1.ResourceType.VOTE, receiptCode, {
            success: result.isProcessed,
            channel: 'ussd',
            ...context,
            verifiedData: result,
        });
        if (!result.isProcessed) {
            res.status(200).json({
                success: false,
                message: 'Vote found but not yet processed or verification failed.',
                data: { isVerified: false },
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'USSD Vote verified successfully',
            data: {
                isVerified: result.isProcessed,
                electionName: result.electionName,
                candidateName: result.candidateName,
                voteTimestamp: result.voteTimestamp,
                processedAt: result.processedAt,
            },
        });
    }
    catch (error) {
        // Log error using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.VOTE_VERIFY, adminLogService_1.AdminAction.RESULTS_VIEW, adminLogService_1.ResourceType.VOTE, receiptCode, {
            success: false,
            channel: 'ussd',
            ...context,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log USSD vote verification error', logErr));
        next(error);
    }
};
exports.verifyVote = verifyVote;
//# sourceMappingURL=ussdVoteController.js.map