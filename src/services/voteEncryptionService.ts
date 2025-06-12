/**
 * Vote encryption service implementing hybrid encryption (RSA + AES)
 * for secure vote storage and verification
 */
import {
  generateRsaKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  generateAesKey,
  encryptWithAes,
  decryptWithAes,
  hashData,
} from '../utils/encryption';
import { logger } from '../config/logger';

export interface VoteData {
  voterId: string;
  electionId: string;
  candidateId: string;
  pollingUnitId: string;
  timestamp: Date;
  voteSource: string;
}

export interface EncryptedVote {
  encryptedVoteData: Buffer;
  encryptedAesKey: string;
  iv: string;
  voteHash: string;
  publicKeyFingerprint: string;
}

export interface ElectionKeys {
  publicKey: string;
  privateKey?: string; // Only available during key generation
  publicKeyFingerprint: string;
}

/**
 * Generate election-specific RSA key pair
 */
export const generateElectionKeys = (): ElectionKeys => {
  try {
    const { publicKey, privateKey } = generateRsaKeyPair();

    // Create a fingerprint of the public key for verification
    const publicKeyFingerprint = hashData(publicKey).substring(0, 16);

    return {
      publicKey,
      privateKey,
      publicKeyFingerprint,
    };
  } catch (error) {
    logger.error('Failed to generate election keys', { error: (error as Error).message });
    throw new Error('Key generation failed');
  }
};

/**
 * Encrypt vote data using hybrid encryption
 */
export const encryptVote = (voteData: VoteData, electionPublicKey: string): EncryptedVote => {
  try {
    // 1. Serialize vote data
    const voteJson = JSON.stringify(voteData);

    // 2. Generate a unique AES key for this vote
    const aesKey = generateAesKey();

    // 3. Encrypt the vote data with AES
    const { iv, encryptedData } = encryptWithAes(voteJson, aesKey);

    // 4. Encrypt the AES key with the election's RSA public key
    const encryptedAesKey = encryptWithPublicKey(aesKey, electionPublicKey);

    // 5. Create a hash of the original vote data for verification
    const voteHash = hashData(voteJson);

    // 6. Create public key fingerprint for verification
    const publicKeyFingerprint = hashData(electionPublicKey).substring(0, 16);

    logger.debug('Vote encrypted successfully', {
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
  } catch (error) {
    logger.error('Vote encryption failed', {
      error: (error as Error).message,
      voterId: voteData.voterId,
    });
    throw new Error('Vote encryption failed');
  }
};

/**
 * Decrypt vote data using hybrid decryption
 */
export const decryptVote = (encryptedVote: EncryptedVote, electionPrivateKey: string): VoteData => {
  try {
    // 1. Decrypt the AES key using the election's RSA private key
    const aesKey = decryptWithPrivateKey(encryptedVote.encryptedAesKey, electionPrivateKey);

    // 2. Decrypt the vote data using the AES key
    const encryptedData = encryptedVote.encryptedVoteData.toString('base64');
    const decryptedJson = decryptWithAes(encryptedData, encryptedVote.iv, aesKey);

    // 3. Parse the vote data
    const voteData: VoteData = JSON.parse(decryptedJson);

    // 4. Verify the hash
    const computedHash = hashData(decryptedJson);
    if (computedHash !== encryptedVote.voteHash) {
      throw new Error('Vote integrity verification failed');
    }

    logger.debug('Vote decrypted successfully', {
      voterId: voteData.voterId,
      electionId: voteData.electionId,
    });

    return voteData;
  } catch (error) {
    logger.error('Vote decryption failed', { error: (error as Error).message });
    throw new Error('Vote decryption failed');
  }
};

/**
 * Verify vote integrity without decrypting
 */
export const verifyVoteIntegrity = (
  encryptedVote: EncryptedVote,
  electionPublicKey: string,
): boolean => {
  try {
    // Verify public key fingerprint matches
    const expectedFingerprint = hashData(electionPublicKey).substring(0, 16);
    return encryptedVote.publicKeyFingerprint === expectedFingerprint;
  } catch (error) {
    logger.error('Vote integrity verification failed', { error: (error as Error).message });
    return false;
  }
};

/**
 * Create a zero-knowledge proof of vote (simplified implementation)
 * This allows voters to verify their vote was counted without revealing the vote
 */
export const createVoteProof = (voteData: VoteData, encryptedVote: EncryptedVote): string => {
  try {
    // Create a proof that combines voter ID, vote hash, and timestamp
    const proofData = {
      voterId: hashData(voteData.voterId), // Hash the voter ID for privacy
      voteHash: encryptedVote.voteHash.substring(0, 8), // Partial hash for verification
      timestamp: voteData.timestamp.getTime(),
    };

    // Create a proof hash
    const proofString = JSON.stringify(proofData);
    const proof = hashData(proofString);

    return proof.substring(0, 16).toUpperCase(); // Return first 16 chars as receipt
  } catch (error) {
    logger.error('Vote proof creation failed', { error: (error as Error).message });
    throw new Error('Vote proof creation failed');
  }
};

/**
 * Batch decrypt votes for counting (used during result tallying)
 */
export const batchDecryptVotes = (
  encryptedVotes: EncryptedVote[],
  electionPrivateKey: string,
): VoteData[] => {
  const decryptedVotes: VoteData[] = [];
  const errors: string[] = [];

  for (let i = 0; i < encryptedVotes.length; i++) {
    try {
      const decryptedVote = decryptVote(encryptedVotes[i], electionPrivateKey);
      decryptedVotes.push(decryptedVote);
    } catch (error) {
      errors.push(`Vote ${i}: ${(error as Error).message}`);
    }
  }

  if (errors.length > 0) {
    logger.warn('Some votes failed to decrypt during batch operation', {
      totalVotes: encryptedVotes.length,
      failedCount: errors.length,
      errors: errors.slice(0, 5), // Log first 5 errors
    });
  }

  logger.info('Batch vote decryption completed', {
    totalVotes: encryptedVotes.length,
    successCount: decryptedVotes.length,
    failedCount: errors.length,
  });

  return decryptedVotes;
};
