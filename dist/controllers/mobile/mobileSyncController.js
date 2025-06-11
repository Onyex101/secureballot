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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.castVote = exports.syncOfflineVotes = exports.getElectionDetails = exports.syncData = void 0;
const services_1 = require("../../services");
const errorHandler_1 = require("../../middleware/errorHandler");
const AuditLog_1 = require("../../db/models/AuditLog");
const logger_1 = require("../../config/logger");
const Election_1 = require("../../db/models/Election");
const Vote_1 = __importStar(require("../../db/models/Vote"));
const crypto_1 = __importDefault(require("crypto"));
const auditHelpers_1 = require("../../utils/auditHelpers");
const adminLogService_1 = require("../../services/adminLogService");
/**
 * Synchronize data between mobile app and server
 */
const syncData = async (req, res, next) => {
    const userId = req.user?.id;
    const { type, data = {} } = req.body;
    try {
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
        }
        if (!type) {
            throw new errorHandler_1.ApiError(400, 'Sync type is required', 'MISSING_SYNC_TYPE');
        }
        let responseData;
        const { electionId, state, lga, ward } = data;
        switch (type) {
            case 'elections':
                const activeElections = await services_1.electionService.getElections(Election_1.ElectionStatus.ACTIVE);
                const upcomingElections = await services_1.electionService.getElections(Election_1.ElectionStatus.SCHEDULED);
                const elections = [...activeElections, ...upcomingElections];
                responseData = {
                    elections: elections.map((election) => ({
                        id: election.id,
                        name: election.electionName,
                        type: election.electionType,
                        startDate: election.startDate,
                        endDate: election.endDate,
                        status: election.status,
                    })),
                    lastSyncTimestamp: new Date(),
                };
                break;
            case 'candidates':
                if (!electionId) {
                    throw new errorHandler_1.ApiError(400, 'Election ID is required for candidate sync', 'MISSING_ELECTION_ID');
                }
                const candidatesResult = await services_1.electionService.getElectionCandidates(electionId, 1, 1000);
                responseData = {
                    candidates: candidatesResult.candidates.map((candidate) => ({
                        id: candidate.id,
                        name: candidate.fullName,
                        party: candidate.partyName,
                        position: candidate.position,
                        electionId: electionId,
                    })),
                    lastSyncTimestamp: new Date(),
                };
                break;
            case 'pollingUnits':
                const filters = { state, lga, ward };
                if (!filters.state && !filters.lga && !filters.ward) {
                    // Decide policy: throw error or fetch all (potentially very large)?
                    // Let's throw for now to avoid unintentional large fetches.
                    throw new errorHandler_1.ApiError(400, 'At least one filter (state, lga, ward) is required for polling unit sync', 'MISSING_PU_FILTER');
                }
                // Increase limit significantly for sync, maybe make configurable?
                const pollingUnitsResult = await services_1.pollingUnitService.getPollingUnits(filters, undefined, 1, 10000);
                responseData = {
                    pollingUnits: pollingUnitsResult.pollingUnits.map((unit) => ({
                        id: unit.id,
                        name: unit.pollingUnitName,
                        code: unit.pollingUnitCode,
                        address: unit.address,
                        state: unit.state,
                        lga: unit.lga,
                        ward: unit.ward,
                        latitude: unit.latitude,
                        longitude: unit.longitude,
                    })),
                    pagination: pollingUnitsResult.pagination,
                    lastSyncTimestamp: new Date(),
                };
                break;
            case 'profile':
                const voterProfile = await services_1.voterService.getVoterProfile(userId);
                responseData = {
                    profile: {
                        id: voterProfile.id,
                        nin: voterProfile.nin,
                        vin: voterProfile.vin,
                        phoneNumber: voterProfile.phoneNumber,
                        pollingUnit: voterProfile.pollingUnit,
                        verification: voterProfile.verification,
                        mfaEnabled: voterProfile.mfaEnabled,
                    },
                    lastSyncTimestamp: new Date(),
                };
                break;
            default:
                throw new errorHandler_1.ApiError(400, `Unsupported sync type: ${type}`, 'UNSUPPORTED_SYNC_TYPE');
        }
        // Log the sync action using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.MOBILE_DATA_SYNC, adminLogService_1.AdminAction.SYSTEM_STATS_VIEW, adminLogService_1.ResourceType.SYSTEM, userId, {
            success: true,
            syncType: type,
            context: data,
        });
        res.status(200).json({
            success: true,
            message: `Data synchronized successfully for type: ${type}`,
            data: responseData,
        });
    }
    catch (error) {
        // Log failure using contextual logging
        await (0, auditHelpers_1.createContextualLog)(req, AuditLog_1.AuditActionType.MOBILE_DATA_SYNC, adminLogService_1.AdminAction.SYSTEM_STATS_VIEW, adminLogService_1.ResourceType.SYSTEM, userId, {
            success: false,
            syncType: type,
            context: data,
            error: error.message,
        }).catch(logErr => logger_1.logger.error('Failed to log mobile data sync error', logErr));
        next(error);
    }
};
exports.syncData = syncData;
/**
 * Get election details for mobile sync
 * @route GET /api/v1/mobile/sync/election/:electionId
 * @access Private
 */
const getElectionDetails = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { electionId } = req.params;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        if (!electionId) {
            throw new errorHandler_1.ApiError(400, 'Election ID is required', 'MISSING_ELECTION_ID');
        }
        // TODO: Implement election details retrieval logic
        // This would involve:
        // 1. Fetching election information
        // 2. Including candidate list
        // 3. Including polling unit details
        // 4. Including voter eligibility status
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MOBILE_SYNC_ELECTION_DETAILS, req.ip || '', req.headers['user-agent'] || '', { electionId });
        res.status(200).json({
            success: true,
            data: {
                electionId,
                electionName: 'Election Name',
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
                status: 'ACTIVE',
                candidates: [],
                pollingUnit: {},
                voterEligibility: true,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getElectionDetails = getElectionDetails;
/**
 * Sync offline votes
 * @route POST /api/v1/mobile/sync/offline-votes
 * @access Private
 */
const syncOfflineVotes = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { offlineVotes } = req.body;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'User ID not found in request', 'AUTHENTICATION_REQUIRED');
        }
        if (!offlineVotes || !Array.isArray(offlineVotes)) {
            throw new errorHandler_1.ApiError(400, 'Invalid offline votes data', 'INVALID_OFFLINE_VOTES');
        }
        // TODO: Implement offline votes sync logic
        // This would involve:
        // 1. Validating each vote
        // 2. Processing votes in batches
        // 3. Handling conflicts
        // 4. Updating sync status
        // Log the action
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.MOBILE_SYNC_OFFLINE_VOTES, req.ip || '', req.headers['user-agent'] || '', { voteCount: offlineVotes.length });
        res.status(200).json({
            success: true,
            message: 'Offline votes synced successfully',
            data: {
                processedCount: offlineVotes.length,
                failedCount: 0,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.syncOfflineVotes = syncOfflineVotes;
const castVote = async (req, res, next) => {
    try {
        const { userId, electionId, candidateId, pollingUnitId } = req.body;
        // Validate required fields
        if (!userId || !electionId || !candidateId || !pollingUnitId) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields');
        }
        // Create vote record
        const vote = await Vote_1.default.create({
            userId,
            electionId,
            candidateId,
            pollingUnitId,
            voteSource: Vote_1.VoteSource.OFFLINE,
            isCounted: true,
            voteTimestamp: new Date(),
            encryptedVoteData: Buffer.from(JSON.stringify({
                userId,
                candidateId,
                timestamp: new Date().toISOString(),
            })),
            voteHash: crypto_1.default.randomBytes(32).toString('hex'),
            encryptedAesKey: 'placeholder-encrypted-key',
            iv: crypto_1.default.randomBytes(16).toString('hex'),
            publicKeyFingerprint: 'placeholder-fingerprint',
            receiptCode: crypto_1.default.randomBytes(16).toString('hex'),
        });
        // Create audit log
        await services_1.auditService.createAuditLog(userId, AuditLog_1.AuditActionType.VOTE_CAST, JSON.stringify({
            electionId,
            candidateId,
            pollingUnitId,
        }), req.ip || 'unknown');
        res.status(201).json({
            success: true,
            message: 'Vote cast successfully',
            data: { voteId: vote.id },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.castVote = castVote;
// Removed castVote - Should use voteController or offlineVoteController
//# sourceMappingURL=mobileSyncController.js.map