"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyElectionKeyIntegrity = exports.listElectionKeys = exports.reconstructPrivateKey = exports.deactivateElectionKeys = exports.getElectionKeyInfo = exports.getElectionPublicKey = exports.generateElectionKeyPair = void 0;
/**
 * Election Key Management Service
 * Handles generation, storage, and management of election encryption keys
 * Now using persistent database storage instead of in-memory storage
 */
const voteEncryptionService_1 = require("./voteEncryptionService");
const encryption_1 = require("../utils/encryption");
const Election_1 = __importDefault(require("../db/models/Election"));
const ElectionKey_1 = __importDefault(require("../db/models/ElectionKey"));
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Generate keys for a new election
 */
const generateElectionKeyPair = async (electionId, generatedBy) => {
    try {
        // Verify election exists
        const election = await Election_1.default.findByPk(electionId);
        if (!election) {
            throw new errorHandler_1.ApiError(404, 'Election not found');
        }
        // Check if keys already exist for this election
        const existingKey = await ElectionKey_1.default.findOne({ where: { electionId } });
        if (existingKey) {
            throw new errorHandler_1.ApiError(409, 'Keys already exist for this election');
        }
        // Generate the key pair
        const keys = (0, voteEncryptionService_1.generateElectionKeys)();
        // Split private key into shares
        const privateKeyShares = splitPrivateKey(keys.privateKey);
        // Store keys in database
        const electionKey = await ElectionKey_1.default.create({
            electionId,
            publicKey: keys.publicKey,
            publicKeyFingerprint: keys.publicKeyFingerprint,
            privateKeyShares,
            keyGeneratedBy: generatedBy,
            isActive: true,
        });
        // Update election record with public key fingerprint
        await election.update({
            publicKeyFingerprint: keys.publicKeyFingerprint,
        });
        logger_1.logger.info('Election keys generated successfully', {
            electionId,
            publicKeyFingerprint: keys.publicKeyFingerprint,
            generatedBy,
        });
        // Return record without private key shares
        return {
            electionId: electionKey.electionId,
            publicKey: electionKey.publicKey,
            publicKeyFingerprint: electionKey.publicKeyFingerprint,
            keyGeneratedAt: electionKey.keyGeneratedAt,
            keyGeneratedBy: electionKey.keyGeneratedBy,
            isActive: electionKey.isActive,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to generate election keys', {
            electionId,
            error: error.message,
        });
        throw error;
    }
};
exports.generateElectionKeyPair = generateElectionKeyPair;
/**
 * Get public key for an election
 */
const getElectionPublicKey = async (electionId) => {
    const keyRecord = await ElectionKey_1.default.findOne({
        where: { electionId, isActive: true },
    });
    if (!keyRecord) {
        throw new errorHandler_1.ApiError(404, 'Election keys not found or inactive');
    }
    return keyRecord.publicKey;
};
exports.getElectionPublicKey = getElectionPublicKey;
/**
 * Get election key information (without private key)
 */
const getElectionKeyInfo = async (electionId) => {
    const keyRecord = await ElectionKey_1.default.findOne({ where: { electionId } });
    if (!keyRecord) {
        throw new errorHandler_1.ApiError(404, 'Election keys not found');
    }
    return {
        electionId: keyRecord.electionId,
        publicKey: keyRecord.publicKey,
        publicKeyFingerprint: keyRecord.publicKeyFingerprint,
        keyGeneratedAt: keyRecord.keyGeneratedAt,
        keyGeneratedBy: keyRecord.keyGeneratedBy,
        isActive: keyRecord.isActive,
    };
};
exports.getElectionKeyInfo = getElectionKeyInfo;
/**
 * Deactivate election keys (for security)
 */
const deactivateElectionKeys = async (electionId, deactivatedBy) => {
    const keyRecord = await ElectionKey_1.default.findOne({ where: { electionId } });
    if (!keyRecord) {
        throw new errorHandler_1.ApiError(404, 'Election keys not found');
    }
    await keyRecord.update({ isActive: false });
    logger_1.logger.warn('Election keys deactivated', {
        electionId,
        deactivatedBy,
        publicKeyFingerprint: keyRecord.publicKeyFingerprint,
    });
};
exports.deactivateElectionKeys = deactivateElectionKeys;
/**
 * Reconstruct private key from shares (simplified implementation)
 * In a real system, this would use proper Shamir's Secret Sharing
 */
const reconstructPrivateKey = async (electionId, keyShares, requesterInfo) => {
    try {
        const keyRecord = await ElectionKey_1.default.findOne({ where: { electionId } });
        if (!keyRecord) {
            throw new errorHandler_1.ApiError(404, 'Private key shares not found for election');
        }
        const storedShares = keyRecord.privateKeyShares;
        // Verify we have enough shares (simplified - in real implementation would use threshold)
        if (keyShares.length < Math.ceil(storedShares.length / 2)) {
            throw new errorHandler_1.ApiError(400, 'Insufficient key shares provided');
        }
        // Verify the shares match (simplified verification)
        for (const share of keyShares) {
            if (!storedShares.includes(share)) {
                throw new errorHandler_1.ApiError(400, 'Invalid key share provided');
            }
        }
        // In a real implementation, this would reconstruct the key using Shamir's algorithm
        // For demo purposes, we'll return the reconstructed key
        const reconstructedKey = reconstructFromShares(keyShares);
        logger_1.logger.warn('Private key reconstructed', {
            electionId,
            requestedBy: requesterInfo.adminId,
            reason: requesterInfo.reason,
            sharesUsed: keyShares.length,
        });
        return reconstructedKey;
    }
    catch (error) {
        logger_1.logger.error('Failed to reconstruct private key', {
            electionId,
            error: error.message,
            requestedBy: requesterInfo.adminId,
        });
        throw error;
    }
};
exports.reconstructPrivateKey = reconstructPrivateKey;
/**
 * Simplified private key splitting (placeholder for Shamir's Secret Sharing)
 * In production, use a proper cryptographic library like `shamirs-secret-sharing`
 */
function splitPrivateKey(privateKey) {
    // This is a simplified implementation for demonstration
    // In production, use proper Shamir's Secret Sharing
    const shares = [];
    const keyHash = (0, encryption_1.hashData)(privateKey);
    // Create 5 shares with threshold of 3
    for (let i = 0; i < 5; i++) {
        const shareData = {
            index: i,
            keyHash: keyHash.substring(0, 16),
            share: (0, encryption_1.hashData)(`${privateKey}-${i}`),
            originalKey: privateKey, // In real implementation, this would be the actual share
        };
        shares.push(JSON.stringify(shareData));
    }
    return shares;
}
/**
 * Simplified key reconstruction (placeholder for Shamir's Secret Sharing)
 */
function reconstructFromShares(shares) {
    try {
        // This is a simplified implementation for demonstration
        // In production, use proper Shamir's Secret Sharing reconstruction
        const firstShare = JSON.parse(shares[0]);
        return firstShare.originalKey; // In real implementation, this would reconstruct from shares
    }
    catch (error) {
        throw new Error('Failed to reconstruct key from shares');
    }
}
/**
 * List all election keys (admin function)
 */
const listElectionKeys = async () => {
    const keys = await ElectionKey_1.default.findAll({
        attributes: [
            'electionId',
            'publicKey',
            'publicKeyFingerprint',
            'keyGeneratedAt',
            'keyGeneratedBy',
            'isActive',
        ],
    });
    return keys.map(key => ({
        electionId: key.electionId,
        publicKey: key.publicKey,
        publicKeyFingerprint: key.publicKeyFingerprint,
        keyGeneratedAt: key.keyGeneratedAt,
        keyGeneratedBy: key.keyGeneratedBy,
        isActive: key.isActive,
    }));
};
exports.listElectionKeys = listElectionKeys;
/**
 * Verify election key integrity
 */
const verifyElectionKeyIntegrity = async (electionId) => {
    try {
        const keyRecord = await ElectionKey_1.default.findOne({ where: { electionId } });
        if (!keyRecord) {
            return false;
        }
        // Basic integrity check - verify fingerprint matches public key
        const keys = {
            publicKey: keyRecord.publicKey,
            publicKeyFingerprint: keyRecord.publicKeyFingerprint,
        };
        const expectedFingerprint = (0, encryption_1.hashData)(keys.publicKey).substring(0, 16);
        return keys.publicKeyFingerprint === expectedFingerprint;
    }
    catch (error) {
        logger_1.logger.error('Failed to verify key integrity', { electionId, error });
        return false;
    }
};
exports.verifyElectionKeyIntegrity = verifyElectionKeyIntegrity;
//# sourceMappingURL=electionKeyService.js.map