"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVotingStatus = exports.reportVoteIssue = exports.getVoteHistory = exports.verifyVote = exports.castVote = void 0;
const crypto_1 = __importDefault(require("crypto"));
const models_1 = __importDefault(require("../../db/models"));
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const Vote_1 = require("../../db/models/Vote");
const server_1 = require("../../server");
const services_1 = require("../../services");
const auditHelpers_1 = require("../../utils/auditHelpers");
const logger_1 = require("../../config/logger");
/**
 * Cast a vote in an election
 * @route POST /api/v1/elections/:electionId/vote
 * @access Private
 */
const castVote = async (req, res, next) => {
    const { id: electionId } = req.params;
    const { candidateId } = req.body;
    const userId = req.user?.id;
    let voteResult = null;
    let electionName;
    const transaction = await server_1.sequelize.transaction();
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!candidateId) {
            throw new errorHandler_1.ApiError(400, 'Candidate ID is required', 'MISSING_CANDIDATE_ID');
        }
        const pollingUnit = await services_1.voterService.getVoterPollingUnit(userId);
        if (!pollingUnit || !pollingUnit.id) {
            throw new errorHandler_1.ApiError(404, 'Polling unit not assigned or found for voter', 'POLLING_UNIT_NOT_FOUND');
        }
        const election = await services_1.electionService.getElectionById(electionId);
        electionName = election?.electionName;
        voteResult = await services_1.voteService.castVote(userId, electionId, candidateId, pollingUnit.id, Vote_1.VoteSource.WEB);
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.VOTE_CAST, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            electionId,
            electionName: electionName || 'Unknown',
            candidateId,
            pollingUnitId: pollingUnit.id,
            voteSource: Vote_1.VoteSource.WEB,
            voteHash: voteResult.voteHash?.substring(0, 10) + '...',
            receiptCode: voteResult.receiptCode,
        });
        await transaction.commit();
        res.status(201).json({
            success: true,
            code: 'VOTE_CAST_SUCCESS',
            message: 'Vote cast successfully',
            data: {
                voteId: voteResult.id,
                timestamp: voteResult.timestamp,
                electionName: electionName || 'Unknown',
                receiptCode: voteResult.receiptCode,
                verificationUrl: `/api/v1/votes/verify/${voteResult.receiptCode}`,
            },
        });
    }
    catch (error) {
        await transaction.rollback();
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), AuditLog_1.AuditActionType.VOTE_CAST, req.ip || '', req.headers['user-agent'] || '', {
            success: false,
            electionId,
            electionName: electionName || 'Unknown',
            candidateId,
            voteSource: Vote_1.VoteSource.WEB,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log vote cast error', logErr));
        next(error);
    }
};
exports.castVote = castVote;
/**
 * Verify a vote using receipt code
 * @route GET /api/v1/votes/verify/:receiptCode
 * @access Public (or Private? Depends on requirements)
 */
const verifyVote = async (req, res, next) => {
    const { receiptCode } = req.params;
    const userId = req.user?.id;
    try {
        const result = await services_1.voteService.verifyVote(receiptCode);
        await services_1.auditService.createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), // Use null for anonymous verifiers
        AuditLog_1.AuditActionType.VOTE_VERIFY, req.ip || '', req.headers['user-agent'] || '', {
            receiptCode,
            success: result.isValid,
            ...(result.isValid ? { voteTimestamp: result.timestamp } : { error: result.message }),
        });
        if (!result.isValid) {
            throw new errorHandler_1.ApiError(404, result.message || 'Vote verification failed', 'VOTE_VERIFICATION_FAILED');
        }
        res.status(200).json({
            success: true,
            code: 'VOTE_VERIFIED',
            message: 'Vote verified successfully',
            data: result,
        });
    }
    catch (error) {
        if (!(error instanceof errorHandler_1.ApiError && error.code === 'VOTE_VERIFICATION_FAILED')) {
            await services_1.auditService
                .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), // Use null for anonymous verifiers
            AuditLog_1.AuditActionType.VOTE_VERIFY, req.ip || '', req.headers['user-agent'] || '', { receiptCode, success: false, error: error.message })
                .catch(logErr => logger_1.logger.error('Failed to log vote verification error', logErr));
        }
        next(error);
    }
};
exports.verifyVote = verifyVote;
/**
 * Get vote history for the authenticated voter
 * @route GET /api/v1/voter/vote-history
 * @access Private
 */
const getVoteHistory = async (req, res, next) => {
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        const history = await services_1.voteService.getVoteHistory(userId);
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.VOTE_HISTORY_VIEW, req.ip || '', req.headers['user-agent'] || '', { success: true, recordCount: history.length });
        res.status(200).json({
            success: true,
            code: 'VOTE_HISTORY_RETRIEVED',
            message: 'Vote history retrieved successfully',
            data: history,
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), AuditLog_1.AuditActionType.VOTE_HISTORY_VIEW, req.ip || '', req.headers['user-agent'] || '', { success: false, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log vote history view error', logErr));
        next(error);
    }
};
exports.getVoteHistory = getVoteHistory;
/**
 * Report an issue with a vote
 * @route POST /api/v1/votes/report-issue
 * @access Private
 */
const reportVoteIssue = async (req, res, next) => {
    const { voteId, electionId, issueDescription, contactInfo } = req.body;
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!voteId && !electionId) {
            throw new errorHandler_1.ApiError(400, 'Either voteId or electionId must be provided', 'MISSING_ISSUE_CONTEXT');
        }
        if (!issueDescription) {
            throw new errorHandler_1.ApiError(400, 'Issue description is required', 'MISSING_ISSUE_DESCRIPTION');
        }
        logger_1.logger.info('Received vote issue report:', {
            userId,
            voteId,
            electionId,
            issueDescription,
            contactInfo,
        });
        const reportId = crypto_1.default.randomUUID();
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.VOTE_ISSUE_REPORT, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            voteId: voteId || null,
            electionId: electionId || null,
            reportId,
            issueLength: issueDescription.length,
        });
        res.status(200).json({
            success: true,
            code: 'VOTE_ISSUE_REPORTED',
            message: 'Issue reported successfully. Thank you for your feedback.',
            data: { reportId },
        });
    }
    catch (error) {
        await services_1.auditService
            .createAuditLog((0, auditHelpers_1.getSafeUserIdForAudit)(userId), AuditLog_1.AuditActionType.VOTE_ISSUE_REPORT, req.ip || '', req.headers['user-agent'] || '', {
            success: false,
            voteId: voteId || null,
            electionId: electionId || null,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log vote issue report error', logErr));
        next(error);
    }
};
exports.reportVoteIssue = reportVoteIssue;
/**
 * Check voting status for a specific election
 * @route GET /api/v1/elections/:electionId/voting-status
 * @access Private
 */
const checkVotingStatus = async (req, res, next) => {
    const { id: electionId } = req.params;
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        const eligibility = await services_1.voterService.checkVoterEligibility(userId, electionId);
        const existingVote = await models_1.default.Vote.findOne({ where: { userId, electionId } });
        const hasVoted = !!existingVote;
        await (0, auditHelpers_1.createContextualAuditLog)(req, AuditLog_1.AuditActionType.VOTE_STATUS_CHECK, {
            electionId,
            success: true,
            isEligible: eligibility.isEligible,
            hasVoted,
        });
        res.status(200).json({
            success: true,
            code: 'VOTING_STATUS_CHECKED',
            message: 'Voting status retrieved successfully',
            data: {
                electionId,
                userId,
                isEligible: eligibility.isEligible,
                eligibilityReason: eligibility.reason,
                hasVoted,
            },
        });
    }
    catch (error) {
        await (0, auditHelpers_1.createContextualAuditLog)(req, AuditLog_1.AuditActionType.VOTE_STATUS_CHECK, {
            electionId,
            success: false,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log voting status check error', logErr));
        next(error);
    }
};
exports.checkVotingStatus = checkVotingStatus;
//# sourceMappingURL=voteController.js.map