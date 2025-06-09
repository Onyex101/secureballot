/**
 * Election Key Management Service
 * Handles generation, storage, and management of election encryption keys
 * Now using persistent database storage instead of in-memory storage
 */
import { generateElectionKeys } from './voteEncryptionService';
import { hashData } from '../utils/encryption';
import Election from '../db/models/Election';
import ElectionKey from '../db/models/ElectionKey';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/errorHandler';

export interface ElectionKeyRecord {
  electionId: string;
  publicKey: string;
  publicKeyFingerprint: string;
  keyGeneratedAt: Date;
  keyGeneratedBy: string;
  isActive: boolean;
}

/**
 * Generate keys for a new election
 */
export const generateElectionKeyPair = async (
  electionId: string,
  generatedBy: string,
): Promise<ElectionKeyRecord> => {
  try {
    // Verify election exists
    const election = await Election.findByPk(electionId);
    if (!election) {
      throw new ApiError(404, 'Election not found');
    }

    // Check if keys already exist for this election
    const existingKey = await ElectionKey.findOne({ where: { electionId } });
    if (existingKey) {
      throw new ApiError(409, 'Keys already exist for this election');
    }

    // Generate the key pair
    const keys = generateElectionKeys();

    // Split private key into shares
    const privateKeyShares = splitPrivateKey(keys.privateKey!);

    // Store keys in database
    const electionKey = await ElectionKey.create({
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

    logger.info('Election keys generated successfully', {
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
  } catch (error) {
    logger.error('Failed to generate election keys', {
      electionId,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Get public key for an election
 */
export const getElectionPublicKey = async (electionId: string): Promise<string> => {
  const keyRecord = await ElectionKey.findOne({
    where: { electionId, isActive: true },
  });
  if (!keyRecord) {
    throw new ApiError(404, 'Election keys not found or inactive');
  }
  return keyRecord.publicKey;
};

/**
 * Get election key information (without private key)
 */
export const getElectionKeyInfo = async (electionId: string): Promise<ElectionKeyRecord> => {
  const keyRecord = await ElectionKey.findOne({ where: { electionId } });
  if (!keyRecord) {
    throw new ApiError(404, 'Election keys not found');
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

/**
 * Deactivate election keys (for security)
 */
export const deactivateElectionKeys = async (
  electionId: string,
  deactivatedBy: string,
): Promise<void> => {
  const keyRecord = await ElectionKey.findOne({ where: { electionId } });
  if (!keyRecord) {
    throw new ApiError(404, 'Election keys not found');
  }

  await keyRecord.update({ isActive: false });

  logger.warn('Election keys deactivated', {
    electionId,
    deactivatedBy,
    publicKeyFingerprint: keyRecord.publicKeyFingerprint,
  });
};

/**
 * Reconstruct private key from shares (simplified implementation)
 * In a real system, this would use proper Shamir's Secret Sharing
 */
export const reconstructPrivateKey = async (
  electionId: string,
  keyShares: string[],
  requesterInfo: { adminId: string; reason: string },
): Promise<string> => {
  try {
    const keyRecord = await ElectionKey.findOne({ where: { electionId } });
    if (!keyRecord) {
      throw new ApiError(404, 'Private key shares not found for election');
    }

    const storedShares = keyRecord.privateKeyShares;

    // Verify we have enough shares (simplified - in real implementation would use threshold)
    if (keyShares.length < Math.ceil(storedShares.length / 2)) {
      throw new ApiError(400, 'Insufficient key shares provided');
    }

    // Verify the shares match (simplified verification)
    for (const share of keyShares) {
      if (!storedShares.includes(share)) {
        throw new ApiError(400, 'Invalid key share provided');
      }
    }

    // In a real implementation, this would reconstruct the key using Shamir's algorithm
    // For demo purposes, we'll return the reconstructed key
    const reconstructedKey = reconstructFromShares(keyShares);

    logger.warn('Private key reconstructed', {
      electionId,
      requestedBy: requesterInfo.adminId,
      reason: requesterInfo.reason,
      sharesUsed: keyShares.length,
    });

    return reconstructedKey;
  } catch (error) {
    logger.error('Failed to reconstruct private key', {
      electionId,
      error: (error as Error).message,
      requestedBy: requesterInfo.adminId,
    });
    throw error;
  }
};

/**
 * Simplified private key splitting (placeholder for Shamir's Secret Sharing)
 * In production, use a proper cryptographic library like `shamirs-secret-sharing`
 */
function splitPrivateKey(privateKey: string): string[] {
  // This is a simplified implementation for demonstration
  // In production, use proper Shamir's Secret Sharing
  const shares: string[] = [];
  const keyHash = hashData(privateKey);

  // Create 5 shares with threshold of 3
  for (let i = 0; i < 5; i++) {
    const shareData = {
      index: i,
      keyHash: keyHash.substring(0, 16),
      share: hashData(`${privateKey}-${i}`),
      originalKey: privateKey, // In real implementation, this would be the actual share
    };
    shares.push(JSON.stringify(shareData));
  }

  return shares;
}

/**
 * Simplified key reconstruction (placeholder for Shamir's Secret Sharing)
 */
function reconstructFromShares(shares: string[]): string {
  try {
    // This is a simplified implementation for demonstration
    // In production, use proper Shamir's Secret Sharing reconstruction
    const firstShare = JSON.parse(shares[0]);
    return firstShare.originalKey; // In real implementation, this would reconstruct from shares
  } catch (error) {
    throw new Error('Failed to reconstruct key from shares');
  }
}

/**
 * List all election keys (admin function)
 */
export const listElectionKeys = async (): Promise<ElectionKeyRecord[]> => {
  const keys = await ElectionKey.findAll({
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

/**
 * Verify election key integrity
 */
export const verifyElectionKeyIntegrity = async (electionId: string): Promise<boolean> => {
  try {
    const keyRecord = await ElectionKey.findOne({ where: { electionId } });
    if (!keyRecord) {
      return false;
    }

    // Basic integrity check - verify fingerprint matches public key
    const keys = {
      publicKey: keyRecord.publicKey,
      publicKeyFingerprint: keyRecord.publicKeyFingerprint,
    };
    const expectedFingerprint = hashData(keys.publicKey).substring(0, 16);
    return keys.publicKeyFingerprint === expectedFingerprint;
  } catch (error) {
    logger.error('Failed to verify key integrity', { electionId, error });
    return false;
  }
};
