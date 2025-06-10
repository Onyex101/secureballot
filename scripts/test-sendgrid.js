#!/usr/bin/env node

/**
 * SendGrid Test Script
 * 
 * This script tests your SendGrid configuration and sends a test email.
 * 
 * Usage:
 *   node scripts/test-sendgrid.js your-email@example.com
 */

const { emailService } = require('../dist/services/emailService');

async function testSendGrid(testEmail) {
  console.log('🚀 Testing SendGrid Configuration...\n');

  // Check if email service is properly configured
  console.log('📧 Email Provider:', process.env.EMAIL_PROVIDER || 'Not set');
  console.log('📧 Email From:', process.env.EMAIL_FROM || 'Not set');
  console.log('📧 SendGrid API Key:', process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('');

  // Test connection
  console.log('🔌 Testing connection...');
  try {
    const isConnected = await emailService.testConnection();
    console.log('Connection result:', isConnected ? '✅ SUCCESS' : '❌ FAILED');
    
    if (!isConnected) {
      console.log('\n❌ Connection failed. Please check your SendGrid configuration.');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    process.exit(1);
  }

  // Send test email if connection is successful
  if (testEmail) {
    console.log('\n📨 Sending test email to:', testEmail);
    
    try {
      const result = await emailService.sendEmail({
        to: testEmail,
        subject: 'SendGrid Test - SecureBallot Platform',
        text: 'This is a test email from the SecureBallot voting platform to verify SendGrid integration.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c5530;">SendGrid Test - SecureBallot</h1>
            <p>Congratulations! Your SendGrid integration is working correctly.</p>
            <p>This test email confirms that:</p>
            <ul>
              <li>✅ Your API key is valid</li>
              <li>✅ SMTP connection is working</li>
              <li>✅ Email templates will render properly</li>
            </ul>
            <p style="color: #666;">
              Sent at: ${new Date().toISOString()}<br>
              From: SecureBallot Platform
            </p>
          </div>
        `
      });

      if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log('📧 Message ID:', result.messageId);
        console.log('⏰ Timestamp:', result.timestamp);
        console.log('\n💡 Check your email inbox (and spam folder) for the test message.');
      } else {
        console.log('❌ Failed to send test email:', result.error);
      }
    } catch (error) {
      console.log('❌ Error sending test email:', error.message);
    }
  }

  console.log('\n🎉 SendGrid test completed!');
}

// Test OTP email template
async function testOtpEmail(testEmail) {
  console.log('\n📧 Testing OTP email template...');
  
  try {
    const result = await emailService.sendOtpEmail(testEmail, '123456', 'Test User');
    
    if (result.success) {
      console.log('✅ OTP email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
    } else {
      console.log('❌ Failed to send OTP email:', result.error);
    }
  } catch (error) {
    console.log('❌ Error sending OTP email:', error.message);
  }
}

// Test vote confirmation email template
async function testVoteConfirmationEmail(testEmail) {
  console.log('\n🗳️ Testing vote confirmation email template...');
  
  try {
    const result = await emailService.sendVoteConfirmationEmail(
      testEmail, 
      'Test User', 
      '2024 Test Election',
      'VOTE-RECEIPT-123456'
    );
    
    if (result.success) {
      console.log('✅ Vote confirmation email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
    } else {
      console.log('❌ Failed to send vote confirmation email:', result.error);
    }
  } catch (error) {
    console.log('❌ Error sending vote confirmation email:', error.message);
  }
}

// Main execution
async function main() {
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.log('Usage: node scripts/test-sendgrid.js your-email@example.com');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(testEmail)) {
    console.log('❌ Invalid email format:', testEmail);
    process.exit(1);
  }

  try {
    // Test basic configuration
    await testSendGrid(testEmail);
    
    // Test specialized email templates
    await testOtpEmail(testEmail);
    await testVoteConfirmationEmail(testEmail);
    
    console.log('\n🎯 All tests completed! Check your email for the test messages.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testSendGrid, testOtpEmail, testVoteConfirmationEmail }; 