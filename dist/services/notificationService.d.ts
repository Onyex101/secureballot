/**
 * Send SMS notification
 */
export declare const sendSMS: (phoneNumber: string, message: string) => Promise<{
    success: boolean;
    messageId: string;
    timestamp: Date;
}>;
/**
 * Send email notification
 */
export declare const sendEmail: (email: string, subject: string, body: string) => Promise<{
    success: boolean;
    messageId: string;
    timestamp: Date;
}>;
/**
 * Send push notification
 */
export declare const sendPushNotification: (deviceToken: string, title: string, body: string, data?: any) => Promise<{
    success: boolean;
    messageId: string;
    timestamp: Date;
}>;
/**
 * Send verification code
 */
export declare const sendVerificationCode: (phoneNumber: string, code: string) => Promise<{
    success: boolean;
    messageId: string;
    timestamp: Date;
}>;
/**
 * Send vote receipt
 */
export declare const sendVoteReceipt: (phoneNumber: string, electionName: string, receiptCode: string) => Promise<{
    success: boolean;
    messageId: string;
    timestamp: Date;
}>;
