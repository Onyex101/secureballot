interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    from?: string;
}
interface EmailResult {
    success: boolean;
    messageId: string;
    timestamp: Date;
    error?: string;
}
declare class EmailService {
    private transporter;
    private fromEmail;
    constructor();
    private initializeTransporter;
    sendEmail(options: EmailOptions): Promise<EmailResult>;
    sendOtpEmail(email: string, otpCode: string, voterName: string): Promise<EmailResult>;
    sendVoteConfirmationEmail(email: string, voterName: string, electionName: string, receiptCode: string): Promise<EmailResult>;
    testConnection(): Promise<boolean>;
}
export declare const emailService: EmailService;
export default emailService;
