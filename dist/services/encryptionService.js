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
exports.generateIdentityFingerprint = exports.verifyIdentity = exports.hashIdentity = exports.decryptIdentity = exports.encryptIdentity = exports.hashData = exports.decryptWithAES = exports.encryptWithAES = exports.generateAESKey = exports.decryptWithPrivateKey = exports.encryptWithPublicKey = exports.generateKeyPair = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate RSA key pair
 */
const generateKeyPair = () => {
    // Generate RSA key pair
    const { publicKey, privateKey } = crypto_1.default.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });
    return { publicKey, privateKey };
};
exports.generateKeyPair = generateKeyPair;
/**
 * Encrypt data with RSA public key
 */
const encryptWithPublicKey = (data, publicKey) => {
    const encryptedData = crypto_1.default.publicEncrypt({
        key: publicKey,
        padding: crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING,
    }, Buffer.from(data));
    return encryptedData.toString('base64');
};
exports.encryptWithPublicKey = encryptWithPublicKey;
/**
 * Decrypt data with RSA private key
 */
const decryptWithPrivateKey = (encryptedData, privateKey) => {
    const decryptedData = crypto_1.default.privateDecrypt({
        key: privateKey,
        padding: crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING,
    }, Buffer.from(encryptedData, 'base64'));
    return decryptedData.toString();
};
exports.decryptWithPrivateKey = decryptWithPrivateKey;
/**
 * Generate AES key
 */
const generateAESKey = () => {
    return crypto_1.default.randomBytes(32).toString('hex');
};
exports.generateAESKey = generateAESKey;
/**
 * Encrypt data with AES key
 */
const encryptWithAES = (data, key) => {
    // Use a constant IV for deterministic encryption (same input = same output)
    // This allows for database searches but reduces security slightly
    const constantIV = Buffer.from('1234567890123456'); // 16 bytes constant IV
    let keyBuffer;
    try {
        keyBuffer = Buffer.from(key, 'hex');
    }
    catch (error) {
        throw error;
    }
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', keyBuffer, constantIV);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return {
        iv: constantIV.toString('hex'),
        encryptedData: encrypted,
    };
};
exports.encryptWithAES = encryptWithAES;
/**
 * Decrypt data with AES key
 */
const decryptWithAES = (encryptedData, iv, key) => {
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
exports.decryptWithAES = decryptWithAES;
/**
 * Hash data with SHA-256
 */
const hashData = (data) => {
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
};
exports.hashData = hashData;
/**
 * Get encryption key from environment or generate default
 */
const getEncryptionKey = () => {
    // In production, this should come from environment variables or a secure key management system
    const envKey = process.env.IDENTITY_ENCRYPTION_KEY;
    if (envKey) {
        // Convert the environment key to a proper 32-byte hex key
        // Hash the environment key to get exactly 32 bytes (64 hex chars)
        const hashedKey = crypto_1.default.createHash('sha256').update(envKey).digest('hex');
        return hashedKey;
    }
    // Fallback key (should be replaced in production)
    return 'a'.repeat(64);
};
/**
 * Encrypt NIN or VIN for secure storage
 */
const encryptIdentity = (identity) => {
    try {
        const key = getEncryptionKey();
        const result = (0, exports.encryptWithAES)(identity, key);
        // Combine IV and encrypted data for storage
        return `${result.iv}:${result.encryptedData}`;
    }
    catch (error) {
        throw new Error(`Failed to encrypt identity: ${error.message}`);
    }
};
exports.encryptIdentity = encryptIdentity;
/**
 * Decrypt NIN or VIN for verification
 */
const decryptIdentity = (encryptedIdentity) => {
    try {
        const [iv, encryptedData] = encryptedIdentity.split(':');
        if (!iv || !encryptedData) {
            throw new Error('Invalid encrypted identity format');
        }
        const key = getEncryptionKey();
        return (0, exports.decryptWithAES)(encryptedData, iv, key);
    }
    catch (error) {
        throw new Error(`Failed to decrypt identity: ${error.message}`);
    }
};
exports.decryptIdentity = decryptIdentity;
/**
 * Hash NIN or VIN for fast lookup (using bcrypt for security)
 */
const hashIdentity = async (identity) => {
    const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
    const saltRounds = 12; // Higher rounds for sensitive identity data
    return bcrypt.hash(identity, saltRounds);
};
exports.hashIdentity = hashIdentity;
/**
 * Verify NIN or VIN against its hash
 */
const verifyIdentity = async (identity, hash) => {
    try {
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
        return bcrypt.compare(identity, hash);
    }
    catch (error) {
        return false;
    }
};
exports.verifyIdentity = verifyIdentity;
/**
 * Generate a secure fingerprint for identity verification
 */
const generateIdentityFingerprint = (nin, vin) => {
    // Create a unique fingerprint that doesn't reveal the actual values
    const combined = `${nin}:${vin}`;
    return crypto_1.default.createHash('sha256').update(combined).digest('hex').substring(0, 16);
};
exports.generateIdentityFingerprint = generateIdentityFingerprint;
//# sourceMappingURL=encryptionService.js.map