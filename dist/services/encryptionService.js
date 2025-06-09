"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashData = exports.decryptWithAES = exports.encryptWithAES = exports.generateAESKey = exports.decryptWithPrivateKey = exports.encryptWithPublicKey = exports.generateKeyPair = void 0;
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
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return {
        iv: iv.toString('hex'),
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
//# sourceMappingURL=encryptionService.js.map