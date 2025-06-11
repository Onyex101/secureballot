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
exports.countVotes = exports.getVoteHistory = exports.verifyVote = exports.castVote = void 0;
const sequelize_1 = require("sequelize");
const Vote_1 = __importStar(require("../db/models/Vote"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
const Election_1 = __importStar(require("../db/models/Election"));
const Candidate_1 = __importDefault(require("../db/models/Candidate"));
const PollingUnit_1 = __importDefault(require("../db/models/PollingUnit"));
const voteEncryptionService_1 = require("./voteEncryptionService");
const electionKeyService_1 = require("./electionKeyService");
const errorHandler_1 = require("../middleware/errorHandler");
// import { logger } from '../config/logger';
/**
 * Cast a vote in an election
 */
const castVote = async (voterId, electionId, candidateId, pollingUnitId, voteSource = Vote_1.VoteSource.WEB) => {
    // Validate voter exists
    const voter = await Voter_1.default.findByPk(voterId);
    if (!voter) {
        throw new errorHandler_1.ApiError(404, 'Voter not found');
    }
    // Validate election exists and is active
    const election = await Election_1.default.findOne({
        where: {
            id: electionId,
            isActive: true,
            status: Election_1.ElectionStatus.ACTIVE,
            startDate: { [sequelize_1.Op.lte]: new Date() },
            endDate: { [sequelize_1.Op.gte]: new Date() },
        },
    });
    if (!election) {
        throw new errorHandler_1.ApiError(404, 'Election not found or not active');
    }
    // Validate candidate exists and belongs to the election
    const candidate = await Candidate_1.default.findOne({
        where: {
            id: candidateId,
            electionId,
            isActive: true,
        },
    });
    if (!candidate) {
        throw new errorHandler_1.ApiError(400, 'Candidate not found or not active for this election');
    }
    // Validate polling unit exists
    const pollingUnit = await PollingUnit_1.default.findByPk(pollingUnitId);
    if (!pollingUnit) {
        throw new errorHandler_1.ApiError(404, 'Polling unit not found');
    }
    // Check if voter has already voted in this election
    const existingVote = await Vote_1.default.findOne({
        where: {
            userId: voterId,
            electionId,
        },
    });
    if (existingVote) {
        throw new errorHandler_1.ApiError(409, 'Voter has already cast a vote in this election');
    }
    // Get the election's public key for encryption
    const electionPublicKey = await (0, electionKeyService_1.getElectionPublicKey)(electionId);
    // Prepare vote data for encryption
    const voteData = {
        voterId,
        electionId,
        candidateId,
        pollingUnitId,
        timestamp: new Date(),
        voteSource,
    };
    // Encrypt the vote using hybrid encryption
    const encryptedVote = (0, voteEncryptionService_1.encryptVote)(voteData, electionPublicKey);
    // Generate a receipt code from the vote proof
    const receiptCode = (0, voteEncryptionService_1.createVoteProof)(voteData, encryptedVote);
    // Create the vote record
    const vote = await Vote_1.default.create({
        userId: voterId,
        electionId,
        candidateId,
        pollingUnitId,
        encryptedVoteData: encryptedVote.encryptedVoteData,
        encryptedAesKey: encryptedVote.encryptedAesKey,
        iv: encryptedVote.iv,
        voteHash: encryptedVote.voteHash,
        publicKeyFingerprint: encryptedVote.publicKeyFingerprint,
        receiptCode,
        voteSource,
    });
    return {
        id: vote.id,
        voteHash: encryptedVote.voteHash,
        receiptCode,
        timestamp: vote.voteTimestamp,
    };
};
exports.castVote = castVote;
/**
 * Verify a vote using receipt code
 */
const verifyVote = async (receiptCode) => {
    // Find vote with a hash that starts with the receipt code
    const vote = await Vote_1.default.findOne({
        where: {
            receiptCode: receiptCode.toUpperCase(),
        },
        include: [
            {
                model: Election_1.default,
                as: 'election',
                attributes: ['id', 'electionName', 'electionType'],
            },
            {
                model: Candidate_1.default,
                as: 'candidate',
                attributes: ['id', 'fullName', 'partyName', 'partyCode'],
            },
            {
                model: PollingUnit_1.default,
                as: 'pollingUnit',
                attributes: ['id', 'pollingUnitName', 'pollingUnitCode'],
            },
        ],
    });
    const voteWithAssoc = vote;
    if (!voteWithAssoc) {
        return {
            isValid: false,
            message: 'Vote not found with the provided receipt code',
        };
    }
    return {
        isValid: true,
        timestamp: voteWithAssoc.voteTimestamp,
        electionName: voteWithAssoc.election?.electionName,
        candidateName: voteWithAssoc.candidate?.fullName,
        candidateParty: voteWithAssoc.candidate?.partyName,
        pollingUnit: voteWithAssoc.pollingUnit?.pollingUnitName,
        voteSource: voteWithAssoc.voteSource,
    };
};
exports.verifyVote = verifyVote;
/**
 * Get vote history for a voter
 */
const getVoteHistory = async (voterId) => {
    const votes = await Vote_1.default.findAll({
        where: {
            userId: voterId,
        },
        include: [
            {
                model: Election_1.default,
                as: 'election',
                attributes: ['id', 'electionName', 'electionType', 'startDate', 'endDate'],
            },
            {
                model: Candidate_1.default,
                as: 'candidate',
                attributes: ['id', 'fullName', 'partyName', 'partyCode'],
            },
            {
                model: PollingUnit_1.default,
                as: 'pollingUnit',
                attributes: ['id', 'pollingUnitName', 'pollingUnitCode'],
            },
        ],
        order: [['voteTimestamp', 'DESC']],
    });
    return votes.map(vote => {
        const voteWithAssoc = vote;
        return {
            id: voteWithAssoc.id,
            electionId: voteWithAssoc.electionId,
            electionName: voteWithAssoc.election?.electionName,
            electionType: voteWithAssoc.election?.electionType,
            candidateName: voteWithAssoc.candidate?.fullName,
            candidateParty: voteWithAssoc.candidate?.partyName,
            pollingUnit: voteWithAssoc.pollingUnit?.pollingUnitName,
            timestamp: voteWithAssoc.voteTimestamp,
            receiptCode: voteWithAssoc.receiptCode,
            voteSource: voteWithAssoc.voteSource,
        };
    });
};
exports.getVoteHistory = getVoteHistory;
/**
 * Count votes for an election
 */
const countVotes = async (electionId) => {
    // Mark votes as counted
    await Vote_1.default.update({ isCounted: true }, {
        where: {
            electionId,
            isCounted: false,
        },
    });
    // Get total votes by candidate
    const voteCounts = await Vote_1.default.findAll({
        where: { electionId },
        attributes: [
            'candidateId',
            [
                Vote_1.default.sequelize.fn('COUNT', Vote_1.default.sequelize.col('id')),
                'voteCount',
            ],
        ],
        include: [
            {
                model: Candidate_1.default,
                as: 'candidate',
                attributes: ['id', 'fullName', 'partyName', 'partyCode'],
                required: true,
            },
        ],
        group: ['candidateId', 'candidate.id'],
        raw: true,
    });
    return voteCounts.map((result) => ({
        candidateId: result.candidateId,
        candidateName: result['candidate.fullName'],
        partyName: result['candidate.partyName'],
        partyCode: result['candidate.partyCode'],
        voteCount: parseInt(result.voteCount, 10),
    }));
};
exports.countVotes = countVotes;
//# sourceMappingURL=voteService.js.map