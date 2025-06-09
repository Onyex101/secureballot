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
export declare const generateElectionKeyPair: (electionId: string, generatedBy: string) => Promise<ElectionKeyRecord>;
/**
 * Get public key for an election
 */
export declare const getElectionPublicKey: (electionId: string) => Promise<string>;
/**
 * Get election key information (without private key)
 */
export declare const getElectionKeyInfo: (electionId: string) => Promise<ElectionKeyRecord>;
/**
 * Deactivate election keys (for security)
 */
export declare const deactivateElectionKeys: (electionId: string, deactivatedBy: string) => Promise<void>;
/**
 * Reconstruct private key from shares (simplified implementation)
 * In a real system, this would use proper Shamir's Secret Sharing
 */
export declare const reconstructPrivateKey: (electionId: string, keyShares: string[], requesterInfo: {
    adminId: string;
    reason: string;
}) => Promise<string>;
/**
 * List all election keys (admin function)
 */
export declare const listElectionKeys: () => Promise<ElectionKeyRecord[]>;
/**
 * Verify election key integrity
 */
export declare const verifyElectionKeyIntegrity: (electionId: string) => Promise<boolean>;
