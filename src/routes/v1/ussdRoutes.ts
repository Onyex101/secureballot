import { Router } from 'express';
import { body } from 'express-validator';
import { validate, validationMessages } from '../../middleware/validator';
import { ussdLimiter } from '../../middleware/rateLimiter';
import * as ussdSessionController from '../../controllers/ussd/ussdSessionController';
import * as ussdVoteController from '../../controllers/ussd/ussdVoteController';

// Controllers would be implemented based on USSD processing needs
// This is a placeholder for the route structure
const router = Router();

/**
 * @swagger
 * /api/v1/ussd/start:
 *   post:
 *     summary: Initiate USSD voting session
 *     tags: [USSD]
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
 *         description: USSD session started, code sent via SMS
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Too many attempts
 */
router.post(
  '/start',
  ussdLimiter,
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
  ussdSessionController.startSession,
);

/**
 * @swagger
 * /api/v1/ussd/vote:
 *   post:
 *     summary: Cast a vote via USSD
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionCode
 *               - electionId
 *               - candidateId
 *             properties:
 *               sessionCode:
 *                 type: string
 *                 example: "123456"
 *               electionId:
 *                 type: string
 *                 format: uuid
 *               candidateId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Vote cast successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid session
 *       403:
 *         description: Already voted
 */
router.post(
  '/vote',
  ussdLimiter,
  validate([
    body('sessionCode')
      .notEmpty()
      .withMessage(validationMessages.required('Session code'))
      .isLength({ min: 6, max: 10 })
      .withMessage('Session code must be 6-10 characters'),

    body('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),

    body('candidateId')
      .notEmpty()
      .withMessage(validationMessages.required('Candidate ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Candidate ID')),
  ]),
  ussdVoteController.castVote,
);

/**
 * @swagger
 * /api/v1/ussd/session-status:
 *   get:
 *     summary: Check USSD session status
 *     tags: [USSD]
 *     parameters:
 *       - name: sessionCode
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session status returned
 *       404:
 *         description: Session not found
 */
router.get(
  '/session-status',
  validate([
    body('sessionCode')
      .notEmpty()
      .withMessage(validationMessages.required('Session code'))
      .isLength({ min: 6, max: 10 })
      .withMessage('Session code must be 6-10 characters'),
  ]),
  ussdSessionController.getSessionStatus,
);

/**
 * @swagger
 * /api/v1/ussd/verify-vote:
 *   post:
 *     summary: Verify a vote using receipt code
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiptCode
 *               - phoneNumber
 *             properties:
 *               receiptCode:
 *                 type: string
 *                 example: "a1b2c3d4e5f6g7h8"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345678"
 *     responses:
 *       200:
 *         description: Vote verification result
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Vote not found
 */
router.post(
  '/verify-vote',
  ussdLimiter,
  validate([
    body('receiptCode')
      .notEmpty()
      .withMessage(validationMessages.required('Receipt code'))
      .isLength({ min: 16, max: 16 })
      .withMessage('Receipt code must be 16 characters'),

    body('phoneNumber')
      .notEmpty()
      .withMessage(validationMessages.required('Phone number'))
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage(validationMessages.phoneNumber()),
  ]),
  ussdVoteController.verifyVote,
);

export default router;
