/**
 * Get verification status by voter ID
 */
export declare const getVerificationStatus: (voterId: string) => Promise<any>;
/**
 * Submit verification request
 */
export declare const submitVerificationRequest: (voterId: string, documentType: string, documentNumber: string, documentImageUrl: string) => Promise<any>;
/**
 * Approve verification request
 */
export declare const approveVerification: (verificationId: string, adminId: string, notes?: string) => Promise<any>;
/**
 * Reject verification request
 */
export declare const rejectVerification: (verificationId: string, adminId: string, reason: string) => Promise<any>;
/**
 * Get pending verification requests with pagination
 */
export declare const getPendingVerifications: (page?: number, limit?: number) => Promise<{
    verifications: any[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
