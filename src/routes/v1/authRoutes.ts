import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate, validationMessages, sanitize } from '../../middleware/validator';
import * as authController from '../../controllers/auth/authController';
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
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: User already exists
 */
router.post(
  '/register',
  [
    sanitize(),
    authLimiter
  ],
  validate([
    body('nin')
      .notEmpty().withMessage(validationMessages.required('NIN'))
      .isLength({ min: 11, max: 11 }).withMessage(validationMessages.nin()),
    
    body('vin')
      .notEmpty().withMessage(validationMessages.required('VIN'))
      .isLength({ min: 19, max: 19 }).withMessage(validationMessages.vin()),
    
    body('phoneNumber')
      .notEmpty().withMessage(validationMessages.required('Phone number'))
      .matches(/^\+?[0-9]{10,15}$/).withMessage(validationMessages.phoneNumber()),
    
    body('dateOfBirth')
      .notEmpty().withMessage(validationMessages.required('Date of birth'))
      .isDate().withMessage(validationMessages.date('Date of birth')),
    
    body('password')
      .notEmpty().withMessage(validationMessages.required('Password'))
      .isLength({ min: 8 }).withMessage(validationMessages.min('Password', 8))
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(validationMessages.password())
  ]),
  authController.register
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate a user
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
 *               - password
 *             properties:
 *               nin:
 *                 type: string
 *                 example: "12345678901"
 *               vin:
 *                 type: string
 *                 example: "1234567890123456789"
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Account locked due to multiple failed attempts
 */
router.post(
  '/login',
  authLimiter,
  validate([
    body('nin')
      .notEmpty().withMessage(validationMessages.required('NIN'))
      .isLength({ min: 11, max: 11 }).withMessage(validationMessages.nin()),
    
    body('vin')
      .notEmpty().withMessage(validationMessages.required('VIN'))
      .isLength({ min: 19, max: 19 }).withMessage(validationMessages.vin()),
    
    body('password')
      .notEmpty().withMessage(validationMessages.required('Password'))
  ]),
  authController.login
);

/**
 * @swagger
 * /api/v1/auth/verify-mfa:
 *   post:
 *     summary: Complete MFA verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - code
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID received from login response
 *               code:
 *                 type: string
 *                 description: MFA code sent to phone
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: MFA verification successful
 *       401:
 *         description: Invalid MFA code
 */
router.post(
  '/verify-mfa',
  authLimiter,
  validate([
    body('userId')
      .notEmpty().withMessage(validationMessages.required('User ID'))
      .isUUID().withMessage(validationMessages.uuid('User ID')),
    
    body('code')
      .notEmpty().withMessage(validationMessages.required('MFA code'))
      .isLength({ min: 6, max: 6 }).withMessage('MFA code must be 6 characters')
  ]),
  authController.verifyMfa
);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh authentication token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired token
 */
router.post(
  '/refresh-token',
  validate([
    body('refreshToken')
      .notEmpty().withMessage(validationMessages.required('Refresh token'))
  ]),
  authController.refreshToken
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out user and invalidate token
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
 *         description: Password reset request processed
 */
router.post(
  '/forgot-password',
  authLimiter,
  validate([
    body('nin')
      .notEmpty().withMessage(validationMessages.required('NIN'))
      .isLength({ min: 11, max: 11 }).withMessage(validationMessages.nin()),
    
    body('vin')
      .notEmpty().withMessage(validationMessages.required('VIN'))
      .isLength({ min: 19, max: 19 }).withMessage(validationMessages.vin()),
    
    body('phoneNumber')
      .notEmpty().withMessage(validationMessages.required('Phone number'))
      .matches(/^\+?[0-9]{10,15}$/).withMessage(validationMessages.phoneNumber())
  ]),
  authController.forgotPassword
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
 *                 description: Password reset token
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid input or expired token
 */
router.post(
  '/reset-password',
  authLimiter,
  validate([
    body('token')
      .notEmpty().withMessage(validationMessages.required('Reset token')),
    
    body('newPassword')
      .notEmpty().withMessage(validationMessages.required('New password'))
      .isLength({ min: 8 }).withMessage(validationMessages.min('New password', 8))
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(validationMessages.password())
  ]),
  authController.resetPassword
);

export default router;