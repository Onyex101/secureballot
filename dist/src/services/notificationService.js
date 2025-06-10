"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVoteConfirmationEmail = exports.sendOtpSms = exports.sendOtpEmail = exports.sendVoteReceipt = exports.sendVerificationCode = exports.sendPushNotification = exports.sendEmail = exports.sendSMS = void 0;
const logger_1 = require("../config/logger");
const emailService_1 = require("./emailService");
/**
 * Send SMS notification
 */
const sendSMS = (phoneNumber, message) => {
    // In a real implementation, this would use an SMS gateway
    // For now, just logging and returning success
    logger_1.logger.debug(`[SMS] To: ${phoneNumber}, Message: ${message}`);
    return Promise.resolve({
        success: true,
        messageId: `sms-${Date.now()}`,
        timestamp: new Date(),
    });
};
exports.sendSMS = sendSMS;
/**
 * Send email notification
 */
const sendEmail = async (email, subject, body) => {
    try {
        const result = await emailService_1.emailService.sendEmail({
            to: email,
            subject,
            text: body,
        });
        return {
            success: result.success,
            messageId: result.messageId,
            timestamp: result.timestamp,
        };
    }
    catch (error) {
        logger_1.logger.error('Error sending email via notification service', {
            email,
            subject,
            error: error.message,
        });
        return {
            success: false,
            messageId: '',
            timestamp: new Date(),
        };
    }
};
exports.sendEmail = sendEmail;
/**
 * Send push notification
 */
const sendPushNotification = (deviceToken, title, body, data) => {
    // In a real implementation, this would use a push notification service
    // For now, just logging and returning success
    logger_1.logger.debug(`[Push] To: ${deviceToken}, Title: ${title}, Body: ${body}, Data:`, data);
    return Promise.resolve({
        success: true,
        messageId: `push-${Date.now()}`,
        timestamp: new Date(),
    });
};
exports.sendPushNotification = sendPushNotification;
/**
 * Send verification code
 */
const sendVerificationCode = (phoneNumber, code) => {
    const message = `Your verification code is: ${code}. Valid for 10 minutes.`;
    return (0, exports.sendSMS)(phoneNumber, message);
};
exports.sendVerificationCode = sendVerificationCode;
/**
 * Send vote receipt
 */
const sendVoteReceipt = (phoneNumber, electionName, receiptCode) => {
    const message = `Thank you for voting in the ${electionName}. Your receipt code is: ${receiptCode}`;
    return (0, exports.sendSMS)(phoneNumber, message);
};
exports.sendVoteReceipt = sendVoteReceipt;
/**
 * Send OTP via email for voter authentication
 */
const sendOtpEmail = async (email, otpCode, voterName) => {
    try {
        const result = await emailService_1.emailService.sendOtpEmail(email, otpCode, voterName);
        if (result.success) {
            logger_1.logger.info('OTP email sent successfully', {
                email,
                messageId: result.messageId,
                timestamp: result.timestamp,
            });
            return true;
        }
        else {
            logger_1.logger.error('Failed to send OTP email', { email, error: result.error });
            return false;
        }
    }
    catch (error) {
        logger_1.logger.error('Error sending OTP email', {
            email,
            error: error.message,
        });
        return false;
    }
};
exports.sendOtpEmail = sendOtpEmail;
/**
 * Send OTP via SMS as fallback
 */
const sendOtpSms = async (phoneNumber, otpCode, voterName) => {
    try {
        const message = `Dear ${voterName}, your voting platform login OTP is: ${otpCode}. Valid for 10 minutes. Do not share.`;
        const result = await (0, exports.sendSMS)(phoneNumber, message);
        if (result.success) {
            logger_1.logger.info('OTP SMS sent successfully', {
                phoneNumber,
                messageId: result.messageId,
                timestamp: result.timestamp,
            });
            return true;
        }
        else {
            logger_1.logger.error('Failed to send OTP SMS', { phoneNumber });
            return false;
        }
    }
    catch (error) {
        logger_1.logger.error('Error sending OTP SMS', {
            phoneNumber,
            error: error.message,
        });
        return false;
    }
};
exports.sendOtpSms = sendOtpSms;
/**
 * Send vote confirmation email
 */
const sendVoteConfirmationEmail = async (email, voterName, electionName, receiptCode) => {
    try {
        const result = await emailService_1.emailService.sendVoteConfirmationEmail(email, voterName, electionName, receiptCode);
        if (result.success) {
            logger_1.logger.info('Vote confirmation email sent successfully', {
                email,
                electionName,
                receiptCode,
                messageId: result.messageId,
                timestamp: result.timestamp,
            });
            return true;
        }
        else {
            logger_1.logger.error('Failed to send vote confirmation email', {
                email,
                electionName,
                error: result.error,
            });
            return false;
        }
    }
    catch (error) {
        logger_1.logger.error('Error sending vote confirmation email', {
            email,
            electionName,
            error: error.message,
        });
        return false;
    }
};
exports.sendVoteConfirmationEmail = sendVoteConfirmationEmail;
//# sourceMappingURL=notificationService.js.map