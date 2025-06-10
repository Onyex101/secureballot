/**
 * Generate RSA key pair
 */
export declare const generateKeyPair: () => {
    publicKey: string;
    privateKey: string;
};
/**
 * Encrypt data with RSA public key
 */
export declare const encryptWithPublicKey: (data: string, publicKey: string) => string;
/**
 * Decrypt data with RSA private key
 */
export declare const decryptWithPrivateKey: (encryptedData: string, privateKey: string) => string;
/**
 * Generate AES key
 */
export declare const generateAESKey: () => string;
/**
 * Encrypt data with AES key
 */
export declare const encryptWithAES: (data: string, key: string) => {
    iv: string;
    encryptedData: string;
};
/**
 * Decrypt data with AES key
 */
export declare const decryptWithAES: (encryptedData: string, iv: string, key: string) => string;
/**
 * Hash data with SHA-256
 */
export declare const hashData: (data: string) => string;
/**
 * Encrypt NIN or VIN for secure storage
 */
export declare const encryptIdentity: (identity: string) => string;
/**
 * Decrypt NIN or VIN for verification
 */
export declare const decryptIdentity: (encryptedIdentity: string) => string;
/**
 * Hash NIN or VIN for fast lookup (using bcrypt for security)
 */
export declare const hashIdentity: (identity: string) => Promise<string>;
/**
 * Verify NIN or VIN against its hash
 */
export declare const verifyIdentity: (identity: string, hash: string) => Promise<boolean>;
/**
 * Generate a secure fingerprint for identity verification
 */
export declare const generateIdentityFingerprint: (nin: string, vin: string) => string;
