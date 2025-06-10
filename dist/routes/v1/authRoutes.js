"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validator_1 = require("../../middleware/validator");
const authController = __importStar(require("../../controllers/auth/authController"));
const mfaController = __importStar(require("../../controllers/auth/mfaController"));
const ussdAuthController = __importStar(require("../../controllers/ussd/ussdAuthController"));
const auth_1 = require("../../middleware/auth");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const otpAuthController = __importStar(require("../../controllers/auth/otpAuthController"));
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new voter
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
 *               - phoneNumber
 *               - dateOfBirth
 *               - password
 *               - fullName
 *               - pollingUnitCode
 *               - state
 *               - gender
 *               - lga
 *               - ward
 *             properties:
 *               nin:
 *                 type: string
 *                 description: 11-character National Identification Number
 *                 example: "12345678901"
 *               vin:
 *                 type: string
 *                 description: 19-character Voter Identification Number
 *                 example: "1234567890123456789"
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number for MFA
 *                 example: "+2348012345678"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Date of birth for verification
 *                 example: "1990-01-01"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *               fullName:
 *                 type: string
 *                 description: Full name of the voter
 *                 example: "John Doe"
 *               pollingUnitCode:
 *                 type: string
 *                 description: Assigned polling unit code
 *                 example: "PU001"
 *               state:
 *                 type: string
 *                 description: State of residence
 *                 example: "Lagos"
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *                 description: Gender of the voter
 *                 example: "male"
 *               lga:
 *                 type: string
 *                 description: Local Government Area
 *                 example: "Ikeja"
 *               ward:
 *                 type: string
 *                 description: Ward within the LGA
 *                 example: "Ward 1"
 *     responses:
 *       201:
 *         description: Voter registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Voter already exists
 */
router.post('/register', rateLimiter_1.authLimiter, (0, validator_1.validate)([
    (0, validator_1.ninValidation)(),
    (0, validator_1.vinValidation)(),
    (0, validator_1.phoneValidation)(),
    (0, express_validator_1.body)('dateOfBirth')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Date of birth'))
        .isISO8601()
        .withMessage('Date of birth must be a valid date'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Password'))
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('fullName')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Full name'))
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('pollingUnitCode')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Polling unit code'))
        .isLength({ min: 1, max: 50 })
        .withMessage('Polling unit code must be between 1 and 50 characters'),
    (0, express_validator_1.body)('state')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('State'))
        .isLength({ min: 2, max: 50 })
        .withMessage('State must be between 2 and 50 characters'),
    (0, express_validator_1.body)('gender')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Gender'))
        .isIn(['male', 'female'])
        .withMessage('Gender must be either male or female'),
    (0, express_validator_1.body)('lga')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('LGA'))
        .isLength({ min: 2, max: 50 })
        .withMessage('LGA must be between 2 and 50 characters'),
    (0, express_validator_1.body)('ward')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Ward'))
        .isLength({ min: 1, max: 100 })
        .withMessage('Ward must be between 1 and 100 characters'),
]), authController.register);
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
router.post('/login', rateLimiter_1.authLimiter, (0, validator_1.validate)([(0, validator_1.ninValidation)(), (0, validator_1.vinValidation)()]), authController.login);
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
router.post('/ussd/authenticate', rateLimiter_1.authLimiter, (0, validator_1.validate)([(0, validator_1.ninValidation)(), (0, validator_1.vinValidation)(), (0, validator_1.phoneValidation)()]), ussdAuthController.authenticateViaUssd);
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
router.post('/ussd/verify-session', rateLimiter_1.authLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('sessionCode')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Session code'))
        .isLength({ min: 6, max: 10 })
        .withMessage('Session code must be 6-10 characters'),
]), ussdAuthController.verifyUssdSession);
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
router.post('/verify-mfa', rateLimiter_1.authLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('userId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('User ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('User ID')),
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('MFA token'))
        .isLength({ min: 6, max: 6 })
        .withMessage('MFA token must be 6 digits')
        .isNumeric()
        .withMessage('MFA token must contain only numbers'),
]), authController.verifyMfa);
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
router.post('/setup-mfa', auth_1.authenticate, mfaController.setupMfa);
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
router.post('/enable-mfa', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('MFA token'))
        .isLength({ min: 6, max: 6 })
        .withMessage('MFA token must be 6 digits')
        .isNumeric()
        .withMessage('MFA token must contain only numbers'),
]), mfaController.enableMfa);
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
router.post('/disable-mfa', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('MFA token'))
        .isLength({ min: 6, max: 6 })
        .withMessage('MFA token must be 6 digits')
        .isNumeric()
        .withMessage('MFA token must contain only numbers'),
]), mfaController.disableMfa);
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
router.post('/generate-backup-codes', auth_1.authenticate, mfaController.generateBackupCodes);
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
router.post('/verify-backup-code', rateLimiter_1.authLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('userId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('User ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('User ID')),
    (0, express_validator_1.body)('backupCode').notEmpty().withMessage(validator_1.validationMessages.required('Backup code')),
]), mfaController.verifyBackupCode);
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
 */
router.post('/refresh-token', auth_1.authenticate, authController.refreshToken);
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
router.post('/logout', auth_1.authenticate, authController.logout);
/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset instructions sent
 *       400:
 *         description: Invalid input
 */
router.post('/forgot-password', rateLimiter_1.authLimiter, (0, validator_1.validate)([(0, validator_1.emailValidation)()]), authController.forgotPassword);
/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid input or token
 */
router.post('/reset-password', rateLimiter_1.authLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('token').notEmpty().withMessage(validator_1.validationMessages.required('Token')),
    (0, express_validator_1.body)('newPassword')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('New password'))
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
]), authController.resetPassword);
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
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
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
router.post('/admin-login', rateLimiter_1.authLimiter, (0, validator_1.validate)([
    (0, validator_1.emailValidation)(),
    (0, express_validator_1.body)('password').notEmpty().withMessage(validator_1.validationMessages.required('Password')),
]), authController.adminLogin);
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
router.post('/voter/request-login', rateLimiter_1.authLimiter, (0, validator_1.validate)([(0, validator_1.ninValidation)(), (0, validator_1.vinValidation)()]), otpAuthController.requestVoterLogin);
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
router.post('/voter/verify-otp', rateLimiter_1.authLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('userId').notEmpty().withMessage('User ID is required'),
    (0, express_validator_1.body)('otpCode')
        .notEmpty()
        .withMessage('OTP code is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be exactly 6 digits'),
]), otpAuthController.verifyOtpAndLogin);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map