import { logger } from '../config/logger';
import { emailService } from './emailService';

/**
 * Send SMS notification
 */
export const sendSMS = (
  phoneNumber: string,
  message: string,
): Promise<{ success: boolean; messageId: string; timestamp: Date }> => {
  // In a real implementation, this would use an SMS gateway
  // For now, just logging and returning success
  logger.debug(`[SMS] To: ${phoneNumber}, Message: ${message}`);
  return Promise.resolve({
    success: true,
    messageId: `sms-${Date.now()}`,
    timestamp: new Date(),
  });
};

/**
 * Send email notification
 */
export const sendEmail = async (
  email: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; messageId: string; timestamp: Date }> => {
  try {
    const result = await emailService.sendEmail({
      to: email,
      subject,
      text: body,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      timestamp: result.timestamp,
    };
  } catch (error) {
    logger.error('Error sending email via notification service', {
      email,
      subject,
      error: (error as Error).message,
    });
    return {
      success: false,
      messageId: '',
      timestamp: new Date(),
    };
  }
};

/**
 * Send push notification
 */
export const sendPushNotification = (
  deviceToken: string,
  title: string,
  body: string,
  data?: any,
): Promise<{ success: boolean; messageId: string; timestamp: Date }> => {
  // In a real implementation, this would use a push notification service
  // For now, just logging and returning success
  logger.debug(`[Push] To: ${deviceToken}, Title: ${title}, Body: ${body}, Data:`, data);
  return Promise.resolve({
    success: true,
    messageId: `push-${Date.now()}`,
    timestamp: new Date(),
  });
};

/**
 * Send verification code
 */
export const sendVerificationCode = (
  phoneNumber: string,
  code: string,
): Promise<{ success: boolean; messageId: string; timestamp: Date }> => {
  const message = `Your verification code is: ${code}. Valid for 10 minutes.`;
  return sendSMS(phoneNumber, message);
};

/**
 * Send vote receipt
 */
export const sendVoteReceipt = (
  phoneNumber: string,
  electionName: string,
  receiptCode: string,
): Promise<{ success: boolean; messageId: string; timestamp: Date }> => {
  const message = `Thank you for voting in the ${electionName}. Your receipt code is: ${receiptCode}`;
  return sendSMS(phoneNumber, message);
};

/**
 * Send OTP via email for voter authentication
 */
export const sendOtpEmail = async (
  email: string,
  otpCode: string,
  voterName: string,
): Promise<boolean> => {
  try {
    const result = await emailService.sendOtpEmail(email, otpCode, voterName);

    if (result.success) {
      logger.info('OTP email sent successfully', {
        email,
        messageId: result.messageId,
        timestamp: result.timestamp,
      });
      return true;
    } else {
      logger.error('Failed to send OTP email', { email, error: result.error });
      return false;
    }
  } catch (error) {
    logger.error('Error sending OTP email', {
      email,
      error: (error as Error).message,
    });
    return false;
  }
};

/**
 * Send OTP via SMS as fallback
 */
export const sendOtpSms = async (
  phoneNumber: string,
  otpCode: string,
  voterName: string,
): Promise<boolean> => {
  try {
    const message = `Dear ${voterName}, your voting platform login OTP is: ${otpCode}. Valid for 10 minutes. Do not share.`;

    const result = await sendSMS(phoneNumber, message);

    if (result.success) {
      logger.info('OTP SMS sent successfully', {
        phoneNumber,
        messageId: result.messageId,
        timestamp: result.timestamp,
      });
      return true;
    } else {
      logger.error('Failed to send OTP SMS', { phoneNumber });
      return false;
    }
  } catch (error) {
    logger.error('Error sending OTP SMS', {
      phoneNumber,
      error: (error as Error).message,
    });
    return false;
  }
};

/**
 * Send vote confirmation email
 */
export const sendVoteConfirmationEmail = async (
  email: string,
  voterName: string,
  electionName: string,
  receiptCode: string,
): Promise<boolean> => {
  try {
    const result = await emailService.sendVoteConfirmationEmail(
      email,
      voterName,
      electionName,
      receiptCode,
    );

    if (result.success) {
      logger.info('Vote confirmation email sent successfully', {
        email,
        electionName,
        receiptCode,
        messageId: result.messageId,
        timestamp: result.timestamp,
      });
      return true;
    } else {
      logger.error('Failed to send vote confirmation email', {
        email,
        electionName,
        error: result.error,
      });
      return false;
    }
  } catch (error) {
    logger.error('Error sending vote confirmation email', {
      email,
      electionName,
      error: (error as Error).message,
    });
    return false;
  }
};
