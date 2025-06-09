/// <reference types="node" />
/// <reference types="node" />
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
    privateKey?: string;
    publicKeyFingerprint: string;
}
/**
 * Generate election-specific RSA key pair
 */
export declare const generateElectionKeys: () => ElectionKeys;
/**
 * Encrypt vote data using hybrid encryption
 */
export declare const encryptVote: (voteData: VoteData, electionPublicKey: string) => EncryptedVote;
/**
 * Decrypt vote data using hybrid decryption
 */
export declare const decryptVote: (encryptedVote: EncryptedVote, electionPrivateKey: string) => VoteData;
/**
 * Verify vote integrity without decrypting
 */
export declare const verifyVoteIntegrity: (encryptedVote: EncryptedVote, electionPublicKey: string) => boolean;
/**
 * Create a zero-knowledge proof of vote (simplified implementation)
 * This allows voters to verify their vote was counted without revealing the vote
 */
export declare const createVoteProof: (voteData: VoteData, encryptedVote: EncryptedVote) => string;
/**
 * Batch decrypt votes for counting (used during result tallying)
 */
export declare const batchDecryptVotes: (encryptedVotes: EncryptedVote[], electionPrivateKey: string) => VoteData[];
