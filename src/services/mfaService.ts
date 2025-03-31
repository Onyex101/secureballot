import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import Voter from '../db/models/Voter';
import AdminUser from '../db/models/AdminUser';
import { ApiError } from '../middleware/errorHandler';
import { Model } from 'sequelize';

/**
 * Generate MFA secret for a user
 */
export const generateMfaSecret = async (
  userId: string,
  isAdmin: boolean = false,
): Promise<{
  secret: string;
  otpAuthUrl: string;
  qrCodeUrl: string;
}> => {
  const secret = speakeasy.generateSecret({
    name: `SecureBallot${isAdmin ? ' Admin' : ''}`,
    issuer: 'SecureBallot',
  });

  let user: Voter | AdminUser | null;
  if (isAdmin) {
    user = await AdminUser.findByPk(userId);
  } else {
    user = await Voter.findByPk(userId);
  }

  if (!user) {
    throw new ApiError(404, `${isAdmin ? 'Admin user' : 'Voter'} not found`);
  }

  await (user as Model).update({
    mfaSecret: secret.base32,
    mfaEnabled: false,
    mfaBackupCodes: null,
  });

  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

  return {
    secret: secret.base32,
    otpAuthUrl: secret.otpauth_url || '',
    qrCodeUrl,
  };
};

/**
 * Verify MFA token
 */
export const verifyMfaToken = async (
  userId: string,
  token: string,
  isAdmin: boolean = false,
): Promise<boolean> => {
  let user: Voter | AdminUser | null;
  if (isAdmin) {
    user = await AdminUser.findByPk(userId);
  } else {
    user = await Voter.findByPk(userId);
  }

  if (!user) {
    throw new ApiError(404, `${isAdmin ? 'Admin user' : 'Voter'} not found`);
  }

  if (!user.mfaSecret) {
    throw new ApiError(400, 'MFA not set up for this user');
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (verified && !user.mfaEnabled) {
    await (user as Model).update({ mfaEnabled: true });
  }

  return verified;
};

/**
 * Disable MFA for a user
 */
export const disableMfa = async (
  userId: string,
  token: string,
  isAdmin: boolean = false,
): Promise<boolean> => {
  const verified = await verifyMfaToken(userId, token, isAdmin);

  if (!verified) {
    throw new ApiError(401, 'Invalid MFA token');
  }

  let user: Voter | AdminUser | null;
  if (isAdmin) {
    user = await AdminUser.findByPk(userId);
  } else {
    user = await Voter.findByPk(userId);
  }

  if (!user) {
    throw new ApiError(404, `${isAdmin ? 'Admin user' : 'Voter'} not found`);
  }

  await (user as Model).update({
    mfaSecret: null,
    mfaEnabled: false,
    mfaBackupCodes: null,
  });

  return true;
};

const hashBackupCode = (code: string): string => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

/**
 * Generate backup codes for a user
 */
export const generateBackupCodes = async (
  userId: string,
  isAdmin: boolean = false,
): Promise<string[]> => {
  let user: Voter | AdminUser | null;
  if (isAdmin) {
    user = await AdminUser.findByPk(userId);
  } else {
    user = await Voter.findByPk(userId);
  }

  if (!user) {
    throw new ApiError(404, `${isAdmin ? 'Admin user' : 'Voter'} not found`);
  }

  if (!user.mfaEnabled) {
    throw new ApiError(400, 'MFA must be enabled to generate backup codes');
  }

  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase(),
  );

  const hashedCodes = backupCodes.map(hashBackupCode);

  await (user as Model).update({
    mfaBackupCodes: hashedCodes,
  });

  return backupCodes;
};

/**
 * Verify backup code
 */
export const verifyBackupCode = async (
  userId: string,
  backupCode: string,
  isAdmin: boolean = false,
): Promise<boolean> => {
  let user: Voter | AdminUser | null;
  if (isAdmin) {
    user = await AdminUser.findByPk(userId);
  } else {
    user = await Voter.findByPk(userId);
  }

  if (!user || !user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
    throw new ApiError(404, 'Backup codes not set up or already used');
  }

  const hashedBackupCode = hashBackupCode(backupCode);
  const currentCodes = user.mfaBackupCodes;

  const codeIndex = currentCodes.findIndex(storedHash => storedHash === hashedBackupCode);

  if (codeIndex === -1) {
    return false;
  }

  const updatedCodes = [...currentCodes.slice(0, codeIndex), ...currentCodes.slice(codeIndex + 1)];

  await (user as Model).update({ mfaBackupCodes: updatedCodes });

  return true;
};
