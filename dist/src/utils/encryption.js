"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecureRandomNumber = exports.hashData = exports.decryptWithAes = exports.encryptWithAes = exports.generateAesKey = exports.decryptWithPrivateKey = exports.encryptWithPublicKey = exports.generateRsaKeyPair = exports.verifyJwtToken = exports.generateJwtToken = exports.verifyPassword = exports.hashPassword = exports.generateRandomToken = void 0;
/**
 * Encryption utility functions
 */
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
/**
 * Generate a random token
 */
const generateRandomToken = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateRandomToken = generateRandomToken;
/**
 * Hash a password using bcrypt
 */
const hashPassword = (password, saltRounds = 12) => {
    return bcrypt_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
/**
 * Verify a password against a hash
 */
const verifyPassword = (password, hash) => {
    return bcrypt_1.default.compare(password, hash);
};
exports.verifyPassword = verifyPassword;
/**
 * Generate a JWT token
 */
const generateJwtToken = (payload, secret = process.env.JWT_SECRET || 'default-secret-key', expiresIn = '1h') => {
    const options = {
        expiresIn: expiresIn,
    };
    return jsonwebtoken_1.default.sign(payload, secret, options);
};
exports.generateJwtToken = generateJwtToken;
/**
 * Verify a JWT token
 */
const verifyJwtToken = (token, secret = process.env.JWT_SECRET || 'default-secret-key') => {
    try {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (error) {
        return null;
    }
};
exports.verifyJwtToken = verifyJwtToken;
/**
 * Generate an RSA key pair
 */
const generateRsaKeyPair = () => {
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
exports.generateRsaKeyPair = generateRsaKeyPair;
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
 * Generate an AES key
 */
const generateAesKey = () => {
    return crypto_1.default.randomBytes(32).toString('hex');
};
exports.generateAesKey = generateAesKey;
/**
 * Encrypt data with AES key
 */
const encryptWithAes = (data, key) => {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
    };
};
exports.encryptWithAes = encryptWithAes;
/**
 * Decrypt data with AES key
 */
const decryptWithAes = (encryptedData, iv, key) => {
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
exports.decryptWithAes = decryptWithAes;
/**
 * Hash data with SHA-256
 */
const hashData = (data) => {
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
};
exports.hashData = hashData;
/**
 * Generate a secure random number
 */
const generateSecureRandomNumber = (min, max) => {
    const range = max - min;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValue = Math.pow(256, bytesNeeded);
    const randomBytes = crypto_1.default.randomBytes(bytesNeeded);
    let randomValue = 0;
    for (let i = 0; i < bytesNeeded; i++) {
        randomValue = randomValue * 256 + randomBytes[i];
    }
    return min + Math.floor((randomValue / maxValue) * range);
};
exports.generateSecureRandomNumber = generateSecureRandomNumber;
//# sourceMappingURL=encryption.js.map