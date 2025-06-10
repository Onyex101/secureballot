import express from 'express';
import * as otpAuthController from '../../controllers/auth/otpAuthController';
import { validate } from '../../middleware';
import { createRateLimiter } from '../../middleware/rateLimiter';
import { body } from 'express-validator';

// Create a helper function for dynamic rate limiting
const rateLimitMiddleware = (name: string, options: { points: number; duration: number }) => {
  return createRateLimiter(
    options.duration * 1000, // Convert seconds to milliseconds
    options.points,
    `TOO_MANY_${name.toUpperCase()}_REQUESTS`,
    `Too many ${name} requests from this IP, please try again later.`,
  );
};

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     VoterLoginRequest:
 *       type: object
 *       required:
 *         - nin
 *         - vin
 *       properties:
 *         nin:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *           description: 11-digit National Identification Number
 *           example: '12345678901'
 *         vin:
 *           type: string
 *           pattern: '^[A-Z0-9]{19}$'
 *           description: 19-character Voter Identification Number
 *           example: 'ABC12345678901234567'
 *
 *     OtpVerificationRequest:
 *       type: object
 *       required:
 *         - userId
 *         - otpCode
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User ID from initial login request
 *         otpCode:
 *           type: string
 *           pattern: '^[0-9]{6}$'
 *           description: 6-digit OTP code
 *           example: '123456'
 *
 *     AdminLoginRequest:
 *       type: object
 *       required:
 *         - nin
 *         - password
 *       properties:
 *         nin:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *           description: 11-digit National Identification Number
 *           example: '12345678901'
 *         password:
 *           type: string
 *           description: Admin password
 *           example: 'SecurePassword123!'
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: JWT authentication token
 *             user:
 *               type: object
 *               description: User information
 *
 *     OtpResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *               format: uuid
 *             email:
 *               type: string
 *               description: Masked email address
 *             expiresAt:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /api/v1/auth/voter/request-login:
 *   post:
 *     summary: Request voter login with NIN and VIN
 *     description: |
 *       First step of voter authentication. Validates NIN and VIN, then sends OTP to registered email.
 *
 *       **Rate Limits:**
 *       - 5 requests per 5 minutes per IP
 *       - 3 requests per 5 minutes per user
 *     tags:
 *       - Voter Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VoterLoginRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpResponse'
 *       400:
 *         description: Invalid input or validation error
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account inactive
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post(
  '/voter/request-login',
  rateLimitMiddleware('voter-login', { points: 5, duration: 300 }), // 5 requests per 5 minutes
  validate([
    body('nin')
      .isLength({ min: 11, max: 11 })
      .withMessage('NIN must be exactly 11 digits')
      .isNumeric()
      .withMessage('NIN must contain only numbers'),
    body('vin')
      .isLength({ min: 19, max: 19 })
      .withMessage('VIN must be exactly 19 characters')
      .isAlphanumeric()
      .withMessage('VIN must contain only letters and numbers')
      .isUppercase()
      .withMessage('VIN must be uppercase'),
  ]),
  otpAuthController.requestVoterLogin,
);

/**
 * @swagger
 * /api/v1/auth/voter/verify-otp:
 *   post:
 *     summary: Verify OTP and complete voter login
 *     description: |
 *       Second step of voter authentication. Verifies OTP code and returns JWT token.
 *
 *       **Rate Limits:**
 *       - 10 requests per 5 minutes per IP
 *       - Maximum 3 OTP attempts per code
 *     tags:
 *       - Voter Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpVerificationRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid OTP or verification failed
 *       404:
 *         description: User not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post(
  '/voter/verify-otp',
  rateLimitMiddleware('otp-verify', { points: 10, duration: 300 }), // 10 requests per 5 minutes
  validate([
    body('userId').isUUID().withMessage('User ID must be a valid UUID'),
    body('otpCode')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP code must be exactly 6 digits')
      .isNumeric()
      .withMessage('OTP code must contain only numbers'),
  ]),
  otpAuthController.verifyOtpAndLogin,
);

/**
 * @swagger
 * /api/v1/auth/voter/resend-otp:
 *   post:
 *     summary: Resend OTP code
 *     description: |
 *       Resend OTP code to voter's registered email. Previous OTP codes are invalidated.
 *
 *       **Rate Limits:**
 *       - 3 requests per 5 minutes per IP
 *       - 3 requests per 5 minutes per user
 *     tags:
 *       - Voter Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID from initial login request
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpResponse'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post(
  '/voter/resend-otp',
  rateLimitMiddleware('otp-resend', { points: 3, duration: 300 }), // 3 requests per 5 minutes
  validate([body('userId').isUUID().withMessage('User ID must be a valid UUID')]),
  otpAuthController.resendOtp,
);

/**
 * @swagger
 * /api/v1/auth/admin/login:
 *   post:
 *     summary: Admin login with NIN and password
 *     description: |
 *       Admin authentication using NIN and password. No OTP required for admin users.
 *
 *       **Rate Limits:**
 *       - 5 requests per 15 minutes per IP
 *     tags:
 *       - Admin Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminLoginRequest'
 *     responses:
 *       200:
 *         description: Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input or validation error
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account inactive
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post(
  '/admin/login',
  rateLimitMiddleware('admin-login', { points: 5, duration: 900 }), // 5 requests per 15 minutes
  validate([
    body('nin')
      .isLength({ min: 11, max: 11 })
      .withMessage('NIN must be exactly 11 digits')
      .isNumeric()
      .withMessage('NIN must contain only numbers'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .notEmpty()
      .withMessage('Password is required'),
  ]),
  otpAuthController.adminLogin,
);

export default router;
