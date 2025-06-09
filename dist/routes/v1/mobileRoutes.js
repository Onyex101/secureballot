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
const auth_1 = require("../../middleware/auth");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const mobileAuthController = __importStar(require("../../controllers/mobile/mobileAuthController"));
const mobileVoteController = __importStar(require("../../controllers/mobile/mobileVoteController"));
const mobilePollingUnitController = __importStar(require("../../controllers/mobile/mobilePollingUnitController"));
const mobileSyncController = __importStar(require("../../controllers/mobile/mobileSyncController"));
const locationController = __importStar(require("../../controllers/mobile/locationController"));
// This file contains routes specific to the mobile app
const router = (0, express_1.Router)();
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
router.post('/auth/login', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('nin')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('NIN'))
        .isLength({ min: 11, max: 11 })
        .withMessage(validator_1.validationMessages.nin()),
    (0, express_validator_1.body)('vin')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('VIN'))
        .isLength({ min: 19, max: 19 })
        .withMessage(validator_1.validationMessages.vin()),
    (0, express_validator_1.body)('password').notEmpty().withMessage(validator_1.validationMessages.required('Password')),
]), mobileAuthController.mobileLogin);
/**
 * @swagger
 * /api/v1/mobile/auth/request-device-verification:
 *   post:
 *     summary: Request device verification code
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
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: Unique identifier for the device
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *       400:
 *         description: Invalid device ID
 *       401:
 *         description: Unauthorized
 */
router.post('/auth/request-device-verification', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.body)('deviceId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Device ID'))
        .isLength({ min: 36, max: 64 })
        .withMessage('Device ID must be between 36 and 64 characters'),
]), mobileAuthController.requestDeviceVerification);
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
router.post('/auth/verify-device', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.body)('deviceId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Device ID'))
        .isLength({ min: 36, max: 64 })
        .withMessage('Device ID must be between 36 and 64 characters'),
    (0, express_validator_1.body)('verificationCode')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Verification code'))
        .isLength({ min: 6, max: 6 })
        .withMessage('Verification code must be 6 characters'),
]), mobileAuthController.verifyDevice);
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
router.get('/vote/offline-package', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.query)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
]), mobileVoteController.getOfflinePackage);
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
router.post('/vote/submit-offline/:electionId', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
    (0, express_validator_1.body)('encryptedVotes')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Encrypted votes'))
        .isArray()
        .withMessage('Encrypted votes must be an array'),
    (0, express_validator_1.body)('signature').notEmpty().withMessage(validator_1.validationMessages.required('Signature')),
]), mobileVoteController.submitOfflineVotes);
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
router.get('/polling-units/nearby', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.query)('latitude')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Latitude'))
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    (0, express_validator_1.query)('longitude')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Longitude'))
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    (0, express_validator_1.query)('radius')
        .optional()
        .isFloat({ min: 0.1, max: 50 })
        .withMessage('Radius must be between 0.1 and 50 km'),
]), mobilePollingUnitController.getNearbyPollingUnits);
/**
 * @swagger
 * /api/v1/mobile/my-polling-unit:
 *   get:
 *     summary: Get user's assigned polling unit
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's polling unit information
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
 *                     pollingUnit:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *                         address:
 *                           type: string
 *                         state:
 *                           type: string
 *                         lga:
 *                           type: string
 *                         ward:
 *                           type: string
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Polling unit not found
 */
router.get('/my-polling-unit', auth_1.authenticate, locationController.getUserPollingUnit);
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
router.post('/sync', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.body)('type')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Type'))
        .isIn(['elections', 'candidates', 'pollingUnits', 'profile'])
        .withMessage('Type must be one of: elections, candidates, pollingUnits, profile'),
    (0, express_validator_1.body)('data').optional().isObject().withMessage('Invalid data type'),
]), mobileSyncController.syncData);
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
router.get('/elections/:electionId', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
]), mobileSyncController.getElectionDetails);
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
router.post('/vote/:electionId', auth_1.authenticate, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
    (0, express_validator_1.body)('candidateId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Candidate ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Candidate ID')),
    (0, express_validator_1.body)('encryptedVote')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Encrypted vote data')),
    (0, express_validator_1.body)('signature').notEmpty().withMessage(validator_1.validationMessages.required('Signature')),
]), mobileSyncController.castVote);
exports.default = router;
//# sourceMappingURL=mobileRoutes.js.map