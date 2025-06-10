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
exports.publishResults = exports.generateElectionKeys = exports.createElection = void 0;
const electionService = __importStar(require("../../services/electionService"));
const auditService = __importStar(require("../../services/auditService"));
const electionKeyService_1 = require("../../services/electionKeyService");
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
/**
 * Create a new election
 */
const createElection = async (req, res, next) => {
    const { electionName, electionType, startDate, endDate, description, eligibilityRules } = req.body;
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Validate that end date is after start date
        if (new Date(endDate) <= new Date(startDate)) {
            throw new errorHandler_1.ApiError(400, 'End date must be after start date', 'INVALID_DATE_RANGE');
        }
        // Check for overlapping elections of the same type - pass date strings
        const hasOverlap = await electionService.checkOverlappingElections(electionType, startDate, // Pass string directly
        endDate);
        if (hasOverlap) {
            throw new errorHandler_1.ApiError(409, 'An election of this type already exists within the specified date range', 'ELECTION_OVERLAP');
        }
        // Create new election - Pass individual arguments with date strings
        const newElection = await electionService.createElection(electionName, electionType, startDate, // Pass string directly
        endDate, // Pass string directly
        userId, description, eligibilityRules);
        // Generate encryption keys for the election
        let keyRecord = null;
        try {
            keyRecord = await (0, electionKeyService_1.generateElectionKeyPair)(newElection.id, userId);
            logger_1.logger.info('Election keys generated successfully', {
                electionId: newElection.id,
                publicKeyFingerprint: keyRecord.publicKeyFingerprint,
            });
        }
        catch (keyError) {
            logger_1.logger.error('Failed to generate election keys, but election was created', {
                electionId: newElection.id,
                error: keyError.message,
            });
            // Continue - election was created successfully, keys can be generated later
        }
        // Log the action
        await auditService.createAdminAuditLog(userId, AuditLog_1.AuditActionType.ELECTION_CREATE, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            electionId: newElection.id,
            electionName: newElection.electionName,
            electionType: newElection.electionType,
            keysGenerated: keyRecord !== null,
            publicKeyFingerprint: keyRecord?.publicKeyFingerprint,
        });
        res.status(201).json({
            success: true,
            message: 'Election created successfully',
            data: {
                ...newElection.toJSON(),
                keysGenerated: keyRecord !== null,
                publicKeyFingerprint: keyRecord?.publicKeyFingerprint,
            },
        });
    }
    catch (error) {
        // Log failure
        await auditService
            .createAdminAuditLog(userId || null, AuditLog_1.AuditActionType.ELECTION_CREATE, req.ip || '', req.headers['user-agent'] || '', { success: false, electionType, startDate, endDate, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log election creation error', logErr));
        next(error);
    }
};
exports.createElection = createElection;
/**
 * Generate encryption keys for an election
 */
const generateElectionKeys = async (req, res, next) => {
    const { electionId } = req.params;
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Check if election exists
        const election = await electionService.getElectionById(electionId);
        if (!election) {
            throw new errorHandler_1.ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
        }
        // Generate encryption keys for the election
        const keyRecord = await (0, electionKeyService_1.generateElectionKeyPair)(electionId, userId);
        // Log the action
        await auditService.createAdminAuditLog(userId, AuditLog_1.AuditActionType.ELECTION_KEY_GENERATE, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            electionId: election.id,
            electionName: election.electionName,
            publicKeyFingerprint: keyRecord.publicKeyFingerprint,
        });
        res.status(201).json({
            success: true,
            message: 'Election keys generated successfully',
            data: {
                electionId: keyRecord.electionId,
                publicKeyFingerprint: keyRecord.publicKeyFingerprint,
                keyGeneratedAt: keyRecord.keyGeneratedAt,
                isActive: keyRecord.isActive,
            },
        });
    }
    catch (error) {
        // Log failure
        await auditService
            .createAdminAuditLog(userId || null, AuditLog_1.AuditActionType.ELECTION_KEY_GENERATE, req.ip || '', req.headers['user-agent'] || '', {
            success: false,
            electionId,
            error: error.message,
        })
            .catch(logErr => logger_1.logger.error('Failed to log key generation error', logErr));
        next(error);
    }
};
exports.generateElectionKeys = generateElectionKeys;
/**
 * Publish election results
 */
const publishResults = async (req, res, next) => {
    const { electionId, publishLevel = 'preliminary' } = req.body;
    const userId = req.user?.id;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        // Check if election exists
        const election = await electionService.getElectionById(electionId);
        if (!election) {
            throw new errorHandler_1.ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
        }
        // Check if election is completed
        if (election.status !== 'completed') {
            throw new errorHandler_1.ApiError(400, 'Cannot publish results for an election that is not completed', 'ELECTION_NOT_COMPLETED');
        }
        // Publish results
        const result = await electionService.publishElectionResults(electionId, publishLevel);
        // Log the action
        await auditService.createAdminAuditLog(userId, AuditLog_1.AuditActionType.RESULT_PUBLISH, req.ip || '', req.headers['user-agent'] || '', {
            success: true,
            electionId: election.id,
            electionName: election.electionName,
            publishLevel,
        });
        res.status(200).json({
            success: true,
            message: `Election results published as ${publishLevel}`,
            data: result,
        });
    }
    catch (error) {
        // Log failure
        await auditService
            .createAuditLog(userId || 'unknown', AuditLog_1.AuditActionType.RESULT_PUBLISH, req.ip || '', req.headers['user-agent'] || '', { success: false, electionId, publishLevel, error: error.message })
            .catch(logErr => logger_1.logger.error('Failed to log result publication error', logErr));
        next(error);
    }
};
exports.publishResults = publishResults;
//# sourceMappingURL=electoralCommissionerController.js.map