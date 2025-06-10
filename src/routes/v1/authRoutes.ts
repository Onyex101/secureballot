import { Router } from 'express';
import { body } from 'express-validator';
import {
  validate,
  validationMessages,
  ninValidation,
  vinValidation,
  phoneValidation,
} from '../../middleware/validator';
import * as authController from '../../controllers/auth/authController';
import * as mfaController from '../../controllers/auth/mfaController';
import * as ussdAuthController from '../../controllers/ussd/ussdAuthController';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';
import * as otpAuthController from '../../controllers/auth/otpAuthController';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login a voter (POC - simplified)
 *     description: Authenticate a voter using NIN and VIN only (no OTP required for POC)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nin
 *               - vin
 *             properties:
 *               nin:
 *                 type: string
 *                 description: National Identification Number (11 digits)
 *                 pattern: '^\d{11}$'
 *                 example: '12345678901'
 *               vin:
 *                 type: string
 *                 description: Voter Identification Number (19 characters)
 *                 pattern: '^[A-Z0-9]{19}$'
 *                 example: 'VIN1234567890ABCDEF'
 *           examples:
 *             demo_voter:
 *               summary: Demo voter credentials
 *               value:
 *                 nin: '12345678901'
 *                 vin: 'VIN1234567890ABCDEF'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Login successful'
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT token for authentication
 *                     voter:
 *                       $ref: '#/components/schemas/Voter'
 *                     poc:
 *                       type: boolean
 *                       example: true
 *                     note:
 *                       type: string
 *                       example: 'POC: Login successful without OTP verification'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not active
 */
router.post(
  '/login',
  authLimiter,
  validate([ninValidation(), vinValidation()]),
  authController.login,
);

/**
 * @swagger
 * /api/v1/auth/ussd/authenticate:
 *   post:
 *     summary: Authenticate a voter via USSD
 *     tags: [USSD Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nin
 *               - vin
 *               - phoneNumber
 *             properties:
 *               nin:
 *                 type: string
 *                 example: "12345678901"
 *               vin:
 *                 type: string
 *                 example: "1234567890123456789"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345678"
 *     responses:
 *       200:
 *         description: USSD authentication successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/ussd/authenticate',
  authLimiter,
  validate([ninValidation(), vinValidation(), phoneValidation()]),
  ussdAuthController.authenticateViaUssd,
);

/**
 * @swagger
 * /api/v1/auth/ussd/verify-session:
 *   post:
 *     summary: Verify USSD session and get token
 *     tags: [USSD Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionCode
 *             properties:
 *               sessionCode:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: USSD session verified
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid or expired session
 */
router.post(
  '/ussd/verify-session',
  authLimiter,
  validate([
    body('sessionCode')
      .notEmpty()
      .withMessage(validationMessages.required('Session code'))
      .isLength({ min: 6, max: 10 })
      .withMessage('Session code must be 6-10 characters'),
  ]),
  ussdAuthController.verifyUssdSession,
);

/**
 * @swagger
 * /api/v1/auth/verify-mfa:
 *   post:
 *     summary: Verify MFA token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - token
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               token:
 *                 type: string
 *                 description: 6-digit MFA token
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: MFA verification successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid MFA token
 */
router.post(
  '/verify-mfa',
  authLimiter,
  validate([
    body('userId')
      .notEmpty()
      .withMessage(validationMessages.required('User ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('User ID')),

    body('token')
      .notEmpty()
      .withMessage(validationMessages.required('MFA token'))
      .isLength({ min: 6, max: 6 })
      .withMessage('MFA token must be 6 digits')
      .isNumeric()
      .withMessage('MFA token must contain only numbers'),
  ]),
  authController.verifyMfa,
);

/**
 * @swagger
 * /api/v1/auth/setup-mfa:
 *   post:
 *     summary: Set up MFA for a user
 *     tags: [MFA]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: MFA setup information returned
 *       401:
 *         description: Unauthorized
 */
router.post('/setup-mfa', authenticate, mfaController.setupMfa);

/**
 * @swagger
 * /api/v1/auth/enable-mfa:
 *   post:
 *     summary: Enable MFA after verification
 *     tags: [MFA]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit MFA token
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: MFA enabled successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized or invalid token
 */
router.post(
  '/enable-mfa',
  authenticate,
  validate([
    body('token')
      .notEmpty()
      .withMessage(validationMessages.required('MFA token'))
      .isLength({ min: 6, max: 6 })
      .withMessage('MFA token must be 6 digits')
      .isNumeric()
      .withMessage('MFA token must contain only numbers'),
  ]),
  mfaController.enableMfa,
);

/**
 * @swagger
 * /api/v1/auth/disable-mfa:
 *   post:
 *     summary: Disable MFA for a user
 *     tags: [MFA]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit MFA token
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: MFA disabled successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized or invalid token
 */
router.post(
  '/disable-mfa',
  authenticate,
  validate([
    body('token')
      .notEmpty()
      .withMessage(validationMessages.required('MFA token'))
      .isLength({ min: 6, max: 6 })
      .withMessage('MFA token must be 6 digits')
      .isNumeric()
      .withMessage('MFA token must contain only numbers'),
  ]),
  mfaController.disableMfa,
);

/**
 * @swagger
 * /api/v1/auth/generate-backup-codes:
 *   post:
 *     summary: Generate backup codes for MFA
 *     tags: [MFA]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes generated successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/generate-backup-codes', authenticate, mfaController.generateBackupCodes);

/**
 * @swagger
 * /api/v1/auth/verify-backup-code:
 *   post:
 *     summary: Verify a backup code for MFA
 *     tags: [MFA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - backupCode
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               backupCode:
 *                 type: string
 *                 example: "ABC123"
 *     responses:
 *       200:
 *         description: Backup code verified successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid backup code
 */
router.post(
  '/verify-backup-code',
  authLimiter,
  validate([
    body('userId')
      .notEmpty()
      .withMessage(validationMessages.required('User ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('User ID')),

    body('backupCode').notEmpty().withMessage(validationMessages.required('Backup code')),
  ]),
  mfaController.verifyBackupCode,
);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh authentication token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.post('/refresh-token', authLimiter, authenticate, authController.refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/v1/auth/admin-login:
 *   post:
 *     summary: Login as an admin
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nin
 *               - password
 *             properties:
 *               nin:
 *                 type: string
 *                 description: National Identification Number (11 digits)
 *                 pattern: '^\d{11}$'
 *                 example: '12345678901'
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Admin password
 *     responses:
 *       200:
 *         description: Admin login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account inactive
 */
router.post(
  '/admin-login',
  authLimiter,
  validate([
    ninValidation(),
    body('password').notEmpty().withMessage(validationMessages.required('Password')),
  ]),
  authController.adminLogin,
);

/**
 * @swagger
 * /api/v1/auth/voter/request-login:
 *   post:
 *     summary: Request voter login (Step 1 of 2)
 *     description: Initiate voter login by providing NIN and VIN. POC returns constant OTP 723111.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nin
 *               - vin
 *             properties:
 *               nin:
 *                 type: string
 *                 description: National Identification Number (11 digits)
 *                 pattern: '^\d{11}$'
 *                 example: '12345678901'
 *               vin:
 *                 type: string
 *                 description: Voter Identification Number (19 characters)
 *                 pattern: '^[A-Z0-9]{19}$'
 *                 example: 'VIN1234567890ABCDEF'
 *           examples:
 *             demo_request:
 *               summary: Demo login request
 *               value:
 *                 nin: '12345678901'
 *                 vin: 'VIN1234567890ABCDEF'
 *     responses:
 *       200:
 *         description: OTP request successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'POC: Use constant OTP 723111 for verification'
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       description: User ID for the next step
 *                     email:
 *                       type: string
 *                       description: Email address (POC mode)
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the OTP expires
 *                     constantOtp:
 *                       type: string
 *                       example: '723111'
 *                       description: Constant OTP for POC
 *                     poc:
 *                       type: boolean
 *                       example: true
 *                     instruction:
 *                       type: string
 *                       example: 'Use OTP code 723111 in the next step'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not active
 */
router.post(
  '/voter/request-login',
  authLimiter,
  validate([ninValidation(), vinValidation()]),
  otpAuthController.requestVoterLogin,
);

/**
 * @swagger
 * /api/v1/auth/voter/verify-otp:
 *   post:
 *     summary: Verify OTP and complete login (Step 2 of 2)
 *     description: Complete voter login by verifying OTP. POC accepts constant OTP 723111.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - otpCode
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID from step 1
 *                 example: '123e4567-e89b-12d3-a456-426614174000'
 *               otpCode:
 *                 type: string
 *                 description: OTP code (use 723111 for POC)
 *                 example: '723111'
 *           examples:
 *             poc_verification:
 *               summary: POC OTP verification
 *               value:
 *                 userId: '123e4567-e89b-12d3-a456-426614174000'
 *                 otpCode: '723111'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Login successful'
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT token for authentication
 *                     user:
 *                       $ref: '#/components/schemas/Voter'
 *                     poc:
 *                       type: boolean
 *                       example: true
 *                     loginMethod:
 *                       type: string
 *                       example: 'constant_otp_poc'
 *                     constantOtp:
 *                       type: string
 *                       example: '723111'
 *       400:
 *         description: Invalid OTP or missing data
 *       404:
 *         description: Voter not found
 */
router.post(
  '/voter/verify-otp',
  authLimiter,
  validate([
    body('userId').notEmpty().withMessage('User ID is required'),
    body('otpCode')
      .notEmpty()
      .withMessage('OTP code is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be exactly 6 digits'),
  ]),
  otpAuthController.verifyOtpAndLogin,
);

export default router;
