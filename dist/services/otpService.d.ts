/**
 * Generate a 6-digit OTP code
 */
export declare const generateOtpCode: () => string;
/**
 * Calculate OTP expiry time
 */
export declare const calculateExpiryTime: () => Date;
/**
 * Check rate limiting for OTP generation
 */
export declare const checkRateLimit: (userId: string, ipAddress?: string | null) => Promise<boolean>;
/**
 * Generate and send OTP to voter's email
 */
export declare const generateAndSendOtp: (userId: string, email: string, ipAddress?: string | null, userAgent?: string | null) => Promise<{
    success: boolean;
    message: string;
    expiresAt?: Date;
}>;
/**
 * Verify OTP code
 */
export declare const verifyOtp: (userId: string, otpCode: string, ipAddress?: string | null) => Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Cleanup expired OTPs
 */
export declare const cleanupExpiredOtps: () => Promise<number>;
/**
 * Get OTP statistics for monitoring
 */
export declare const getOtpStatistics: (hours?: number) => Promise<{
    total: number;
    sent: number;
    verified: number;
    expired: number;
    failed: number;
}>;
/**
 * Resend OTP (with rate limiting)
 */
export declare const resendOtp: (userId: string, email: string, ipAddress?: string | null, userAgent?: string | null) => Promise<{
    success: boolean;
    message: string;
    expiresAt?: Date;
}>;
