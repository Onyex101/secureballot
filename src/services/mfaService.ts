import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import Voter from '../db/models/Voter';
import AdminUser from '../db/models/AdminUser';

/**
 * Generate MFA secret for a user
 */
export const generateMfaSecret = async (
  userId: string,
  isAdmin: boolean = false
): Promise<{
  secret: string;
  otpAuthUrl: string;
  qrCodeUrl: string;
}> => {
  // Generate a new secret
  const secret = speakeasy.generateSecret({
    name: `INEC E-Voting${isAdmin ? ' Admin' : ''}`,
    issuer: 'INEC'
  });
  
  // Store the secret in the user's record
  if (isAdmin) {
    const admin = await AdminUser.findByPk(userId);
    if (!admin) {
      throw new Error('Admin user not found');
    }
    
    // Update admin with MFA secret
    await admin.update({
      mfaSecret: secret.base32,
      mfaEnabled: false // Not enabled until verified
    });
  } else {
    const voter = await Voter.findByPk(userId);
    if (!voter) {
      throw new Error('Voter not found');
    }
    
    // Update voter with MFA secret
    await voter.update({
      mfaSecret: secret.base32,
      mfaEnabled: false // Not enabled until verified
    });
  }
  
  // Generate QR code
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');
  
  return {
    secret: secret.base32,
    otpAuthUrl: secret.otpauth_url || '',
    qrCodeUrl
  };
};

/**
 * Verify MFA token
 */
export const verifyMfaToken = async (
  userId: string,
  token: string,
  isAdmin: boolean = false
): Promise<boolean> => {
  // Get the user's MFA secret
  let mfaSecret: string | null = null;
  
  if (isAdmin) {
    const admin = await AdminUser.findByPk(userId);
    if (!admin) {
      throw new Error('Admin user not found');
    }
    mfaSecret = admin.mfaSecret;
  } else {
    const voter = await Voter.findByPk(userId);
    if (!voter) {
      throw new Error('Voter not found');
    }
    mfaSecret = voter.mfaSecret;
  }
  
  if (!mfaSecret) {
    throw new Error('MFA not set up for this user');
  }
  
  // Verify the token
  const verified = speakeasy.totp.verify({
    secret: mfaSecret,
    encoding: 'base32',
    token,
    window: 1 // Allow 1 step before and after current time
  });
  
  // If this is the first verification, enable MFA
  if (verified) {
    if (isAdmin) {
      const admin = await AdminUser.findByPk(userId);
      if (admin && !admin.mfaEnabled) {
        await admin.update({ mfaEnabled: true });
      }
    } else {
      const voter = await Voter.findByPk(userId);
      if (voter && !voter.mfaEnabled) {
        await voter.update({ mfaEnabled: true });
      }
    }
  }
  
  return verified;
};

/**
 * Disable MFA for a user
 */
export const disableMfa = async (
  userId: string,
  token: string,
  isAdmin: boolean = false
): Promise<boolean> => {
  // Verify the token first
  const verified = await verifyMfaToken(userId, token, isAdmin);
  
  if (!verified) {
    throw new Error('Invalid MFA token');
  }
  
  // Disable MFA
  if (isAdmin) {
    const admin = await AdminUser.findByPk(userId);
    if (!admin) {
      throw new Error('Admin user not found');
    }
    
    await admin.update({
      mfaSecret: null,
      mfaEnabled: false
    });
  } else {
    const voter = await Voter.findByPk(userId);
    if (!voter) {
      throw new Error('Voter not found');
    }
    
    await voter.update({
      mfaSecret: null,
      mfaEnabled: false
    });
  }
  
  return true;
};

/**
 * Generate backup codes for a user
 */
export const generateBackupCodes = async (
  userId: string,
  isAdmin: boolean = false
): Promise<string[]> => {
  // Generate 10 random backup codes
  const backupCodes = Array.from({ length: 10 }, () => 
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
  
  // Hash the backup codes before storing
  const hashedCodes = backupCodes.map(code => 
    speakeasy.generateSecret({ length: 20 }).base32
  );
  
  // Store the hashed codes
  if (isAdmin) {
    const admin = await AdminUser.findByPk(userId);
    if (!admin) {
      throw new Error('Admin user not found');
    }
    
    await admin.update({
      mfaBackupCodes: hashedCodes
    });
  } else {
    const voter = await Voter.findByPk(userId);
    if (!voter) {
      throw new Error('Voter not found');
    }
    
    await voter.update({
      mfaBackupCodes: hashedCodes
    });
  }
  
  // Return the plain text codes to the user
  return backupCodes;
};

/**
 * Verify backup code
 */
export const verifyBackupCode = async (
  userId: string,
  backupCode: string,
  isAdmin: boolean = false
): Promise<boolean> => {
  let backupCodes: string[] = [];
  
  // Get the user's backup codes
  if (isAdmin) {
    const admin = await AdminUser.findByPk(userId);
    if (!admin || !admin.mfaBackupCodes) {
      throw new Error('Backup codes not found');
    }
    backupCodes = admin.mfaBackupCodes;
  } else {
    const voter = await Voter.findByPk(userId);
    if (!voter || !voter.mfaBackupCodes) {
      throw new Error('Backup codes not found');
    }
    backupCodes = voter.mfaBackupCodes;
  }
  
  // Check if the provided code matches any of the backup codes
  const codeIndex = backupCodes.findIndex(code => code === backupCode);
  
  if (codeIndex === -1) {
    return false;
  }
  
  // Remove the used backup code
  backupCodes.splice(codeIndex, 1);
  
  // Update the user's backup codes
  if (isAdmin) {
    const admin = await AdminUser.findByPk(userId);
    if (admin) {
      await admin.update({ mfaBackupCodes: backupCodes });
    }
  } else {
    const voter = await Voter.findByPk(userId);
    if (voter) {
      await voter.update({ mfaBackupCodes: backupCodes });
    }
  }
  
  return true;
}; 