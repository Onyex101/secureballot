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
