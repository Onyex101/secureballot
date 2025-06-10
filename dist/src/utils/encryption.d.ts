/**
 * Generate a random token
 */
export declare const generateRandomToken: (length?: number) => string;
/**
 * Hash a password using bcrypt
 */
export declare const hashPassword: (password: string, saltRounds?: number) => Promise<string>;
/**
 * Verify a password against a hash
 */
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
/**
 * Generate a JWT token
 */
export declare const generateJwtToken: (payload: Record<string, any>, secret?: string, expiresIn?: string) => string;
/**
 * Verify a JWT token
 */
export declare const verifyJwtToken: (token: string, secret?: string) => any;
/**
 * Generate an RSA key pair
 */
export declare const generateRsaKeyPair: () => {
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
 * Generate an AES key
 */
export declare const generateAesKey: () => string;
/**
 * Encrypt data with AES key
 */
export declare const encryptWithAes: (data: string, key: string) => {
    iv: string;
    encryptedData: string;
};
/**
 * Decrypt data with AES key
 */
export declare const decryptWithAes: (encryptedData: string, iv: string, key: string) => string;
/**
 * Hash data with SHA-256
 */
export declare const hashData: (data: string) => string;
/**
 * Generate a secure random number
 */
export declare const generateSecureRandomNumber: (min: number, max: number) => number;
