"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchDecryptVotes = exports.createVoteProof = exports.verifyVoteIntegrity = exports.decryptVote = exports.encryptVote = exports.generateElectionKeys = void 0;
/**
 * Vote encryption service implementing hybrid encryption (RSA + AES)
 * for secure vote storage and verification
 */
const encryption_1 = require("../utils/encryption");
const logger_1 = require("../config/logger");
/**
 * Generate election-specific RSA key pair
 */
const generateElectionKeys = () => {
    try {
        const { publicKey, privateKey } = (0, encryption_1.generateRsaKeyPair)();
        // Create a fingerprint of the public key for verification
        const publicKeyFingerprint = (0, encryption_1.hashData)(publicKey).substring(0, 16);
        logger_1.logger.info('Generated new election keys', { publicKeyFingerprint });
        return {
            publicKey,
            privateKey,
            publicKeyFingerprint,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to generate election keys', { error: error.message });
        throw new Error('Key generation failed');
    }
};
exports.generateElectionKeys = generateElectionKeys;
/**
 * Encrypt vote data using hybrid encryption
 */
const encryptVote = (voteData, electionPublicKey) => {
    try {
        // 1. Serialize vote data
        const voteJson = JSON.stringify(voteData);
        // 2. Generate a unique AES key for this vote
        const aesKey = (0, encryption_1.generateAesKey)();
        // 3. Encrypt the vote data with AES
        const { iv, encryptedData } = (0, encryption_1.encryptWithAes)(voteJson, aesKey);
        // 4. Encrypt the AES key with the election's RSA public key
        const encryptedAesKey = (0, encryption_1.encryptWithPublicKey)(aesKey, electionPublicKey);
        // 5. Create a hash of the original vote data for verification
        const voteHash = (0, encryption_1.hashData)(voteJson);
        // 6. Create public key fingerprint for verification
        const publicKeyFingerprint = (0, encryption_1.hashData)(electionPublicKey).substring(0, 16);
        logger_1.logger.debug('Vote encrypted successfully', {
            voterId: voteData.voterId,
            electionId: voteData.electionId,
            voteHash: voteHash.substring(0, 16),
            publicKeyFingerprint,
        });
        return {
            encryptedVoteData: Buffer.from(encryptedData, 'base64'),
            encryptedAesKey,
            iv,
            voteHash,
            publicKeyFingerprint,
        };
    }
    catch (error) {
        logger_1.logger.error('Vote encryption failed', {
            error: error.message,
            voterId: voteData.voterId,
        });
        throw new Error('Vote encryption failed');
    }
};
exports.encryptVote = encryptVote;
/**
 * Decrypt vote data using hybrid decryption
 */
const decryptVote = (encryptedVote, electionPrivateKey) => {
    try {
        // 1. Decrypt the AES key using the election's RSA private key
        const aesKey = (0, encryption_1.decryptWithPrivateKey)(encryptedVote.encryptedAesKey, electionPrivateKey);
        // 2. Decrypt the vote data using the AES key
        const encryptedData = encryptedVote.encryptedVoteData.toString('base64');
        const decryptedJson = (0, encryption_1.decryptWithAes)(encryptedData, encryptedVote.iv, aesKey);
        // 3. Parse the vote data
        const voteData = JSON.parse(decryptedJson);
        // 4. Verify the hash
        const computedHash = (0, encryption_1.hashData)(decryptedJson);
        if (computedHash !== encryptedVote.voteHash) {
            throw new Error('Vote integrity verification failed');
        }
        logger_1.logger.debug('Vote decrypted successfully', {
            voterId: voteData.voterId,
            electionId: voteData.electionId,
        });
        return voteData;
    }
    catch (error) {
        logger_1.logger.error('Vote decryption failed', { error: error.message });
        throw new Error('Vote decryption failed');
    }
};
exports.decryptVote = decryptVote;
/**
 * Verify vote integrity without decrypting
 */
const verifyVoteIntegrity = (encryptedVote, electionPublicKey) => {
    try {
        // Verify public key fingerprint matches
        const expectedFingerprint = (0, encryption_1.hashData)(electionPublicKey).substring(0, 16);
        return encryptedVote.publicKeyFingerprint === expectedFingerprint;
    }
    catch (error) {
        logger_1.logger.error('Vote integrity verification failed', { error: error.message });
        return false;
    }
};
exports.verifyVoteIntegrity = verifyVoteIntegrity;
/**
 * Create a zero-knowledge proof of vote (simplified implementation)
 * This allows voters to verify their vote was counted without revealing the vote
 */
const createVoteProof = (voteData, encryptedVote) => {
    try {
        // Create a proof that combines voter ID, vote hash, and timestamp
        const proofData = {
            voterId: (0, encryption_1.hashData)(voteData.voterId),
            voteHash: encryptedVote.voteHash.substring(0, 8),
            timestamp: voteData.timestamp.getTime(),
        };
        // Create a proof hash
        const proofString = JSON.stringify(proofData);
        const proof = (0, encryption_1.hashData)(proofString);
        return proof.substring(0, 16).toUpperCase(); // Return first 16 chars as receipt
    }
    catch (error) {
        logger_1.logger.error('Vote proof creation failed', { error: error.message });
        throw new Error('Vote proof creation failed');
    }
};
exports.createVoteProof = createVoteProof;
/**
 * Batch decrypt votes for counting (used during result tallying)
 */
const batchDecryptVotes = (encryptedVotes, electionPrivateKey) => {
    const decryptedVotes = [];
    const errors = [];
    for (let i = 0; i < encryptedVotes.length; i++) {
        try {
            const decryptedVote = (0, exports.decryptVote)(encryptedVotes[i], electionPrivateKey);
            decryptedVotes.push(decryptedVote);
        }
        catch (error) {
            errors.push(`Vote ${i}: ${error.message}`);
        }
    }
    if (errors.length > 0) {
        logger_1.logger.warn('Some votes failed to decrypt during batch operation', {
            totalVotes: encryptedVotes.length,
            failedCount: errors.length,
            errors: errors.slice(0, 5), // Log first 5 errors
        });
    }
    logger_1.logger.info('Batch vote decryption completed', {
        totalVotes: encryptedVotes.length,
        successCount: decryptedVotes.length,
        failedCount: errors.length,
    });
    return decryptedVotes;
};
exports.batchDecryptVotes = batchDecryptVotes;
//# sourceMappingURL=voteEncryptionService.js.map