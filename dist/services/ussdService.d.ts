import { UssdSessionStatus } from '../db/models/UssdSession';
/**
 * Start a new USSD session
 */
export declare const startSession: (nin: string, vin: string, phoneNumber: string) => Promise<{
    sessionCode: string;
    expiresAt: Date;
}>;
/**
 * Cast a vote via USSD
 */
export declare const castVote: (sessionCode: string, electionId: string, candidateId: string) => Promise<{
    confirmationCode: string;
}>;
/**
 * Get session status
 */
export declare const getSessionStatus: (sessionCode: string) => Promise<{
    status: UssdSessionStatus;
    userId: string | null;
    expiresAt: Date;
    lastActivity: Date;
}>;
/**
 * Verify a vote using confirmation code (Note: USSD votes might not be verifiable this way)
 * This logic seems flawed as receiptCode was generated randomly and stored in sessionData
 * A better approach might be to verify based on userId and electionId
 */
export declare const verifyVote: (confirmationCode: string, phoneNumber: string) => Promise<{
    isProcessed: boolean;
    processedAt?: Date | null;
    electionName?: string;
    candidateName?: string;
    voteTimestamp?: Date;
}>;
/**
 * Create a USSD session
 */
export declare const createUssdSession: (userId: string, phoneNumber: string) => Promise<string>;
/**
 * Verify a USSD session
 */
export declare const verifyUssdSession: (sessionCode: string, phoneNumber: string) => {
    userId: string;
    phoneNumber: string;
    createdAt: Date;
    expiresAt: Date;
} | null;
/**
 * Process USSD request
 */
export declare const processUssdRequest: (sessionId: string, serviceCode: string, phoneNumber: string, text: string) => string;
/**
 * Update session state
 */
export declare const updateSessionState: (sessionId: string, newState: any) => Promise<void>;
/**
 * End USSD session
 */
export declare const endSession: (sessionId: string) => Promise<void>;
/**
 * Get session by session ID
 */
export declare const getSession: (sessionId: string) => Promise<any>;
