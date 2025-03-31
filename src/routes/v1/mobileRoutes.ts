import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate, validationMessages } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import { defaultLimiter } from '../../middleware/rateLimiter';
import * as mobileAuthController from '../../controllers/mobile/mobileAuthController';
import * as mobileVoteController from '../../controllers/mobile/mobileVoteController';
import * as mobilePollingUnitController from '../../controllers/mobile/mobilePollingUnitController';
import * as mobileSyncController from '../../controllers/mobile/mobileSyncController';

// This file contains routes specific to the mobile app
const router = Router();

/**
 * @swagger
 * /api/v1/mobile/auth/login:
 *   post:
 *     summary: Login via mobile app
 *     tags: [Mobile Integration]
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
 *               vin:
 *                 type: string
 *               password:
 *                 type: string
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   deviceId:
 *                     type: string
 *                   deviceModel:
 *                     type: string
 *                   osVersion:
 *                     type: string
 *                   appVersion:
 *                     type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for authenticated requests
 *                 verificationRequired:
 *                   type: boolean
 *                   description: Whether device verification is required
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Account locked or requires verification
 */
router.post(
  '/auth/login',
  defaultLimiter,
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

    body('password').notEmpty().withMessage(validationMessages.required('Password')),
  ]),
  mobileAuthController.mobileLogin,
);

/**
 * @swagger
 * /api/v1/mobile/auth/verify-device:
 *   post:
 *     summary: Verify a mobile device
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - verificationCode
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: Unique identifier for the device
 *               verificationCode:
 *                 type: string
 *                 description: 6-digit verification code sent to the user's phone
 *     responses:
 *       200:
 *         description: Device verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for authenticated requests
 *                 verified:
 *                   type: boolean
 *                   description: Whether the device was verified
 *       400:
 *         description: Invalid verification code
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/auth/verify-device',
  authenticate,
  validate([
    body('deviceId')
      .notEmpty()
      .withMessage(validationMessages.required('Device ID'))
      .isLength({ min: 36, max: 64 })
      .withMessage('Device ID must be between 36 and 64 characters'),

    body('verificationCode')
      .notEmpty()
      .withMessage(validationMessages.required('Verification code'))
      .isLength({ min: 6, max: 6 })
      .withMessage('Verification code must be 6 characters'),
  ]),
  mobileAuthController.verifyDevice,
);

/**
 * @swagger
 * /api/v1/mobile/vote/offline-package:
 *   get:
 *     summary: Download offline voting package
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Offline voting package returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Election not found
 */
router.get(
  '/vote/offline-package',
  authenticate,
  validate([
    query('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  mobileVoteController.getOfflinePackage,
);

/**
 * @swagger
 * /api/v1/mobile/vote/submit-offline:
 *   post:
 *     summary: Submit votes collected offline
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - encryptedVotes
 *               - signature
 *             properties:
 *               encryptedVotes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - candidateId
 *                     - encryptedVote
 *                   properties:
 *                     candidateId:
 *                       type: string
 *                       format: uuid
 *                     encryptedVote:
 *                       type: string
 *               signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Offline votes submitted successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/vote/submit-offline/:electionId',
  authenticate,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),

    body('encryptedVotes')
      .notEmpty()
      .withMessage(validationMessages.required('Encrypted votes'))
      .isArray()
      .withMessage('Encrypted votes must be an array'),

    body('signature').notEmpty().withMessage(validationMessages.required('Signature')),
  ]),
  mobileVoteController.submitOfflineVotes,
);

/**
 * @swagger
 * /api/v1/mobile/polling-units/nearby:
 *   get:
 *     summary: Find nearby polling units
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: latitude
 *         in: query
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *       - name: longitude
 *         in: query
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *       - name: radius
 *         in: query
 *         schema:
 *           type: number
 *           default: 5
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of nearby polling units returned
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/polling-units/nearby',
  authenticate,
  validate([
    query('latitude')
      .notEmpty()
      .withMessage(validationMessages.required('Latitude'))
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),

    query('longitude')
      .notEmpty()
      .withMessage(validationMessages.required('Longitude'))
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),

    query('radius')
      .optional()
      .isFloat({ min: 0.1, max: 50 })
      .withMessage('Radius must be between 0.1 and 50 km'),
  ]),
  mobilePollingUnitController.getNearbyPollingUnits,
);

/**
 * @swagger
 * /api/v1/mobile/sync:
 *   post:
 *     summary: Synchronize data between mobile app and server
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [elections, candidates, pollingUnits, profile]
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Data synchronized successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/sync',
  authenticate,
  validate([
    body('type')
      .notEmpty()
      .withMessage(validationMessages.required('Type'))
      .isIn(['elections', 'candidates', 'pollingUnits', 'profile'])
      .withMessage('Type must be one of: elections, candidates, pollingUnits, profile'),

    body('data').optional().isObject().withMessage('Invalid data type'),
  ]),
  mobileSyncController.syncData,
);

/**
 * @swagger
 * /api/v1/mobile/elections/{electionId}:
 *   get:
 *     summary: Get detailed election information for mobile app
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detailed election information returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     election:
 *                       type: object
 *                     candidates:
 *                       type: array
 *                     eligibility:
 *                       type: object
 *       400:
 *         description: Invalid election ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.get(
  '/elections/:electionId',
  authenticate,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  mobileSyncController.getElectionDetails,
);

/**
 * @swagger
 * /api/v1/mobile/vote/{electionId}:
 *   post:
 *     summary: Cast vote from mobile app
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateId
 *               - encryptedVote
 *               - signature
 *             properties:
 *               candidateId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the candidate being voted for
 *               encryptedVote:
 *                 type: string
 *                 description: Encrypted vote data
 *               signature:
 *                 type: string
 *                 description: Digital signature to verify vote integrity
 *     responses:
 *       201:
 *         description: Vote cast successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     voteId:
 *                       type: string
 *                     receiptCode:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input or vote casting error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Voter not eligible or has already voted
 *       404:
 *         description: Election or candidate not found
 */
router.post(
  '/vote/:electionId',
  authenticate,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),

    body('candidateId')
      .notEmpty()
      .withMessage(validationMessages.required('Candidate ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Candidate ID')),

    body('encryptedVote')
      .notEmpty()
      .withMessage(validationMessages.required('Encrypted vote data')),

    body('signature').notEmpty().withMessage(validationMessages.required('Signature')),
  ]),
  mobileSyncController.castVote,
);

export default router;
