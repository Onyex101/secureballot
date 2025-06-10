import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

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

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@secureballot.ng';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

      switch (emailProvider.toLowerCase()) {
        case 'gmail':
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
            },
          });
          break;

        case 'sendgrid':
          this.transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY,
            },
          });
          break;

        case 'mailgun':
          this.transporter = nodemailer.createTransport({
            host: 'smtp.mailgun.org',
            port: 587,
            secure: false,
            auth: {
              user: process.env.MAILGUN_USERNAME,
              pass: process.env.MAILGUN_PASSWORD,
            },
          });
          break;

        case 'ses':
          this.transporter = nodemailer.createTransport({
            host: 'email-smtp.us-east-1.amazonaws.com', // Change region as needed
            port: 587,
            secure: false,
            auth: {
              user: process.env.AWS_SES_ACCESS_KEY,
              pass: process.env.AWS_SES_SECRET_KEY,
            },
          });
          break;

        case 'smtp':
        default:
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
            tls: {
              rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
            },
          });
          break;
      }

      logger.info(`Email service initialized with provider: ${emailProvider}`);
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.transporter) {
      return {
        success: false,
        messageId: '',
        timestamp: new Date(),
        error: 'Email transporter not initialized',
      };
    }

    try {
      const mailOptions = {
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId || `email-${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: errorMessage,
      });

      return {
        success: false,
        messageId: '',
        timestamp: new Date(),
        error: errorMessage,
      };
    }
  }

  sendOtpEmail(email: string, otpCode: string, voterName: string): Promise<EmailResult> {
    const subject = 'Your Voting Platform Login OTP';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c5530; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .otp-code { font-size: 24px; font-weight: bold; color: #2c5530; text-align: center; 
                     background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { background-color: #2c5530; color: white; padding: 10px; text-align: center; font-size: 12px; }
          .warning { color: #d9534f; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nigerian Electronic Voting Platform</h1>
          </div>
          <div class="content">
            <h2>Hello ${voterName},</h2>
            <p>You have requested to log in to the Nigerian Electronic Voting Platform.</p>
            <p>Your One-Time Password (OTP) is:</p>
            <div class="otp-code">${otpCode}</div>
            <p><strong>This OTP is valid for 10 minutes only.</strong></p>
            <p class="warning">⚠️ Please do not share this code with anyone.</p>
            <p>If you did not request this OTP, please contact our support team immediately.</p>
            <p>Thank you for using our secure voting platform.</p>
          </div>
          <div class="footer">
            <p>Nigerian Electronic Voting Platform - Secure • Transparent • Trustworthy</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Dear ${voterName},

      You have requested to log in to the Nigerian Electronic Voting Platform.

      Your One-Time Password (OTP) is: ${otpCode}

      This OTP is valid for 10 minutes only. Please do not share this code with anyone.

      If you did not request this OTP, please contact support immediately.

      Thank you,
      Nigerian Electronic Voting Platform
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  sendVoteConfirmationEmail(
    email: string,
    voterName: string,
    electionName: string,
    receiptCode: string,
  ): Promise<EmailResult> {
    const subject = 'Vote Confirmation - Receipt';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c5530; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .receipt-code { font-size: 20px; font-weight: bold; color: #2c5530; text-align: center; 
                         background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { background-color: #2c5530; color: white; padding: 10px; text-align: center; font-size: 12px; }
          .success { color: #5cb85c; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Vote Successfully Recorded</h1>
          </div>
          <div class="content">
            <h2>Dear ${voterName},</h2>
            <p class="success">✅ Thank you for participating in the democratic process!</p>
            <p>Your vote for <strong>${electionName}</strong> has been successfully recorded.</p>
            <p>Your receipt code is:</p>
            <div class="receipt-code">${receiptCode}</div>
            <p><strong>Please save this receipt code for your records.</strong></p>
            <p>This code serves as proof that your vote was successfully cast and recorded in the system.</p>
            <p>Thank you for using our secure voting platform.</p>
          </div>
          <div class="footer">
            <p>Nigerian Electronic Voting Platform - Your Vote, Your Voice</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Dear ${voterName},

      Thank you for participating in the democratic process!

      Your vote for ${electionName} has been successfully recorded.

      Your receipt code is: ${receiptCode}

      Please save this receipt code for your records. This code serves as proof that your vote was successfully cast and recorded in the system.

      Thank you for using our secure voting platform.

      Nigerian Electronic Voting Platform
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection test successful');
      return true;
    } catch (error) {
      logger.error('Email service connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
