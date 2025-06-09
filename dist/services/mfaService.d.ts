/**
 * Generate MFA secret for a user
 */
export declare const generateMfaSecret: (userId: string, isAdmin?: boolean) => Promise<{
    secret: string;
    otpAuthUrl: string;
    qrCodeUrl: string;
}>;
/**
 * Verify MFA token
 */
export declare const verifyMfaToken: (userId: string, token: string, isAdmin?: boolean) => Promise<boolean>;
/**
 * Disable MFA for a user
 */
export declare const disableMfa: (userId: string, token: string, isAdmin?: boolean) => Promise<boolean>;
/**
 * Generate backup codes for a user
 */
export declare const generateBackupCodes: (userId: string, isAdmin?: boolean) => Promise<string[]>;
/**
 * Verify backup code
 */
export declare const verifyBackupCode: (userId: string, backupCode: string, isAdmin?: boolean) => Promise<boolean>;
