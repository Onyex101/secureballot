import { Router } from 'express';
import { body } from 'express-validator';
import { validate, validationMessages } from '../../middleware/validator';
import * as authController from '../../controllers/auth/authController';
import * as mfaController from '../../controllers/auth/mfaController';
import * as ussdAuthController from '../../controllers/ussd/ussdAuthController';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

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
router.post(
  '/register',
  authLimiter,
  validate([
    body('nin')
      .notEmpty()
      .withMessage(validationMessages.required('NIN'))
      .isLength({ min: 11, max: 11 })
      .withMessage(validationMessages.nin()),

    body('vin')
      .notEmpty()
      .withMessage(validationMessages.required('VIN'))
      .isLength({ min: 19, max: 19 })
      .withMessage(validationMessages.vin()),

    body('phoneNumber')
      .notEmpty()
      .withMessage(validationMessages.required('Phone number'))
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage(validationMessages.phoneNumber()),

    body('dateOfBirth')
      .notEmpty()
      .withMessage(validationMessages.required('Date of birth'))
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),

    body('password')
      .notEmpty()
      .withMessage(validationMessages.required('Password'))
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),

    body('fullName')
      .notEmpty()
      .withMessage(validationMessages.required('Full name'))
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),

    body('pollingUnitCode')
      .notEmpty()
      .withMessage(validationMessages.required('Polling unit code'))
      .isLength({ min: 1, max: 50 })
      .withMessage('Polling unit code must be between 1 and 50 characters'),

    body('state')
      .notEmpty()
      .withMessage(validationMessages.required('State'))
      .isLength({ min: 2, max: 50 })
      .withMessage('State must be between 2 and 50 characters'),

    body('gender')
      .notEmpty()
      .withMessage(validationMessages.required('Gender'))
      .isIn(['male', 'female'])
      .withMessage('Gender must be either male or female'),

    body('lga')
      .notEmpty()
      .withMessage(validationMessages.required('LGA'))
      .isLength({ min: 2, max: 50 })
      .withMessage('LGA must be between 2 and 50 characters'),

    body('ward')
      .notEmpty()
      .withMessage(validationMessages.required('Ward'))
      .isLength({ min: 1, max: 100 })
      .withMessage('Ward must be between 1 and 100 characters'),
  ]),
  async (req, res, next) => {
    try {
      await authController.register(req, res, next);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: NIN, VIN, or phone number
 *                 example: "12345678901"
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  authLimiter,
  validate([
    body('identifier').notEmpty().withMessage(validationMessages.required('Identifier')),
    body('password').notEmpty().withMessage(validationMessages.required('Password')),
  ]),
  async (req, res, next) => {
    try {
      await authController.login(req, res, next);
    } catch (error) {
      next(error);
    }
  },
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
  validate([
    body('nin')
      .notEmpty()
      .withMessage(validationMessages.required('NIN'))
      .isLength({ min: 11, max: 11 })
      .withMessage(validationMessages.nin()),

    body('vin')
      .notEmpty()
      .withMessage(validationMessages.required('VIN'))
      .isLength({ min: 19, max: 19 })
      .withMessage(validationMessages.vin()),

    body('phoneNumber')
      .notEmpty()
      .withMessage(validationMessages.required('Phone number'))
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage(validationMessages.phoneNumber()),
  ]),
  async (req, res, next) => {
    try {
      await ussdAuthController.authenticateViaUssd(req, res, next);
    } catch (error) {
      next(error);
    }
  },
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
  async (req, res, next) => {
    try {
      await ussdAuthController.verifyUssdSession(req, res, next);
    } catch (error) {
      next(error);
    }
  },
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
  async (req, res, next) => {
    try {
      await authController.verifyMfa(req, res, next);
    } catch (error) {
      next(error);
    }
  },
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
router.post('/setup-mfa', authenticate, async (req, res, next) => {
  try {
    await mfaController.setupMfa(req, res, next);
  } catch (error) {
    next(error);
  }
});

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
  async (req, res, next) => {
    try {
      await mfaController.enableMfa(req, res, next);
    } catch (error) {
      next(error);
    }
  },
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
  async (req, res, next) => {
    try {
      await mfaController.disableMfa(req, res, next);
    } catch (error) {
      next(error);
    }
  },
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
router.post('/generate-backup-codes', authenticate, async (req, res, next) => {
  try {
    await mfaController.generateBackupCodes(req, res, next);
  } catch (error) {
    next(error);
  }
});

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
  async (req, res, next) => {
    try {
      await mfaController.verifyBackupCode(req, res, next);
    } catch (error) {
      next(error);
    }
  },
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
 */
router.post('/refresh-token', authenticate, async (req, res, next) => {
  try {
    await authController.refreshToken(req, res, next);
  } catch (error) {
    next(error);
  }
});

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
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authController.logout(req, res, next);
  } catch (error) {
    next(error);
  }
});

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
router.post(
  '/forgot-password',
  authLimiter,
  validate([
    body('email')
      .notEmpty()
      .withMessage(validationMessages.required('Email'))
      .isEmail()
      .withMessage(validationMessages.email()),
  ]),
  async (req, res, next) => {
    try {
      await authController.forgotPassword(req, res, next);
    } catch (error) {
      next(error);
    }
  },
);

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
router.post(
  '/reset-password',
  authLimiter,
  validate([
    body('token').notEmpty().withMessage(validationMessages.required('Token')),

    body('newPassword')
      .notEmpty()
      .withMessage(validationMessages.required('New password'))
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ]),
  async (req, res, next) => {
    try {
      await authController.resetPassword(req, res, next);
    } catch (error) {
      next(error);
    }
  },
);

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
router.post(
  '/admin-login',
  authLimiter,
  validate([
    body('email').isEmail().withMessage(validationMessages.email()),
    body('password').notEmpty().withMessage(validationMessages.required('Password')),
  ]),
  async (req, res, next) => {
    try {
      await authController.adminLogin(req, res, next);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
