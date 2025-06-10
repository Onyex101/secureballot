"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBackupCode = exports.generateBackupCodes = exports.disableMfa = exports.verifyMfaToken = exports.generateMfaSecret = void 0;
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const crypto_1 = __importDefault(require("crypto"));
const Voter_1 = __importDefault(require("../db/models/Voter"));
const AdminUser_1 = __importDefault(require("../db/models/AdminUser"));
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Generate MFA secret for a user
 */
const generateMfaSecret = async (userId, isAdmin = false) => {
    const secret = speakeasy_1.default.generateSecret({
        name: `SecureBallot${isAdmin ? ' Admin' : ''}`,
        issuer: 'SecureBallot',
    });
    let user;
    if (isAdmin) {
        user = await AdminUser_1.default.findByPk(userId);
    }
    else {
        user = await Voter_1.default.findByPk(userId);
    }
    if (!user) {
        throw new errorHandler_1.ApiError(404, `${isAdmin ? 'Admin user' : 'Voter'} not found`);
    }
    await user.update({
        mfaSecret: secret.base32,
        mfaEnabled: false,
        mfaBackupCodes: null,
    });
    const qrCodeUrl = await qrcode_1.default.toDataURL(secret.otpauth_url || '');
    return {
        secret: secret.base32,
        otpAuthUrl: secret.otpauth_url || '',
        qrCodeUrl,
    };
};
exports.generateMfaSecret = generateMfaSecret;
/**
 * Verify MFA token
 */
const verifyMfaToken = async (userId, token, isAdmin = false) => {
    let user;
    if (isAdmin) {
        user = await AdminUser_1.default.findByPk(userId);
    }
    else {
        user = await Voter_1.default.findByPk(userId);
    }
    if (!user) {
        throw new errorHandler_1.ApiError(404, `${isAdmin ? 'Admin user' : 'Voter'} not found`);
    }
    if (!user.mfaSecret) {
        throw new errorHandler_1.ApiError(400, 'MFA not set up for this user');
    }
    const verified = speakeasy_1.default.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token,
        window: 1,
    });
    if (verified && !user.mfaEnabled) {
        await user.update({ mfaEnabled: true });
    }
    return verified;
};
exports.verifyMfaToken = verifyMfaToken;
/**
 * Disable MFA for a user
 */
const disableMfa = async (userId, token, isAdmin = false) => {
    const verified = await (0, exports.verifyMfaToken)(userId, token, isAdmin);
    if (!verified) {
        throw new errorHandler_1.ApiError(401, 'Invalid MFA token');
    }
    let user;
    if (isAdmin) {
        user = await AdminUser_1.default.findByPk(userId);
    }
    else {
        user = await Voter_1.default.findByPk(userId);
    }
    if (!user) {
        throw new errorHandler_1.ApiError(404, `${isAdmin ? 'Admin user' : 'Voter'} not found`);
    }
    await user.update({
        mfaSecret: null,
        mfaEnabled: false,
        mfaBackupCodes: null,
    });
    return true;
};
exports.disableMfa = disableMfa;
const hashBackupCode = (code) => {
    return crypto_1.default.createHash('sha256').update(code).digest('hex');
};
/**
 * Generate backup codes for a user
 */
const generateBackupCodes = async (userId, isAdmin = false) => {
    let user;
    if (isAdmin) {
        user = await AdminUser_1.default.findByPk(userId);
    }
    else {
        user = await Voter_1.default.findByPk(userId);
    }
    if (!user) {
        throw new errorHandler_1.ApiError(404, `${isAdmin ? 'Admin user' : 'Voter'} not found`);
    }
    if (!user.mfaEnabled) {
        throw new errorHandler_1.ApiError(400, 'MFA must be enabled to generate backup codes');
    }
    const backupCodes = Array.from({ length: 10 }, () => crypto_1.default.randomBytes(4).toString('hex').toUpperCase());
    const hashedCodes = backupCodes.map(hashBackupCode);
    await user.update({
        mfaBackupCodes: hashedCodes,
    });
    return backupCodes;
};
exports.generateBackupCodes = generateBackupCodes;
/**
 * Verify backup code
 */
const verifyBackupCode = async (userId, backupCode, isAdmin = false) => {
    let user;
    if (isAdmin) {
        user = await AdminUser_1.default.findByPk(userId);
    }
    else {
        user = await Voter_1.default.findByPk(userId);
    }
    if (!user || !user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
        throw new errorHandler_1.ApiError(404, 'Backup codes not set up or already used');
    }
    const hashedBackupCode = hashBackupCode(backupCode);
    const currentCodes = user.mfaBackupCodes;
    const codeIndex = currentCodes.findIndex(storedHash => storedHash === hashedBackupCode);
    if (codeIndex === -1) {
        return false;
    }
    const updatedCodes = [...currentCodes.slice(0, codeIndex), ...currentCodes.slice(codeIndex + 1)];
    await user.update({ mfaBackupCodes: updatedCodes });
    return true;
};
exports.verifyBackupCode = verifyBackupCode;
//# sourceMappingURL=mfaService.js.map