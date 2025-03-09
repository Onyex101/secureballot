import { Router } from 'express';
import { body, param } from 'express-validator';
import * as voterController from '../../controllers/voter/voterController';
import * as voteController from '../../controllers/election/voteController';
import { authenticate } from '../../middleware/auth';
import { validate, validationMessages } from '../../middleware/validator';
import { defaultLimiter } from '../../middleware/rateLimiter';

const router = Router();

// All voter routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/voter/profile:
 *   get:
 *     summary: Get voter profile
 *     tags: [Voter Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Voter profile returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Voter not found
 */
router.get('/profile', voterController.getProfile);

/**
 * @swagger
 * /api/v1/voter/profile:
 *   put:
 *     summary: Update voter profile
 *     tags: [Voter Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345678"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Voter not found
 */
router.put(
  '/profile',
  [
    body('phoneNumber')
      .optional()
      .matches(/^\+?[0-9]{10,15}$/).withMessage(validationMessages.phoneNumber()),
  ],
  validate,
  voterController.updateProfile
);

/**
 * @swagger
 * /api/v1/voter/change-password:
 *   put:
 *     summary: Change voter password
 *     tags: [Voter Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input or current password incorrect
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/change-password',
  defaultLimiter,
  [
    body('currentPassword')
      .notEmpty().withMessage(validationMessages.required('Current password')),
    
    body('newPassword')
      .notEmpty().withMessage(validationMessages.required('New password'))
      .isLength({ min: 8 }).withMessage(validationMessages.min('New password', 8))
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(validationMessages.password()),
  ],
  validate,
  voterController.changePassword
);

/**
 * @swagger
 * /api/v1/voter/polling-unit:
 *   get:
 *     summary: Get voter's assigned polling unit
 *     tags: [Voter Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Polling unit returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Polling unit not found
 */
router.get('/polling-unit', voterController.getPollingUnit);

/**
 * @swagger
 * /api/v1/voter/verification-status:
 *   get:
 *     summary: Get voter verification status
 *     tags: [Voter Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Verification status returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Verification status not found
 */
router.get('/verification-status', voterController.getVerificationStatus);

/**
 * @swagger
 * /api/v1/voter/eligibility/{electionId}:
 *   get:
 *     summary: Check voter eligibility for an election
 *     tags: [Voter Management]
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
 *         description: Eligibility status returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.get(
  '/eligibility/:electionId',
  [
    param('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
  ],
  validate,
  voterController.checkEligibility
);

/**
 * @swagger
 * /api/v1/voter/vote-history:
 *   get:
 *     summary: Get voter's vote history
 *     tags: [Voting]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Vote history returned
 *       401:
 *         description: Unauthorized
 */
router.get('/vote-history', voteController.getVoteHistory);

/**
 * @swagger
 * /api/v1/voter/verify-vote/{receiptCode}:
 *   get:
 *     summary: Verify a vote receipt
 *     tags: [Voting]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: receiptCode
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vote verified successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invalid receipt code
 */
router.get(
  '/verify-vote/:receiptCode',
  [
    param('receiptCode')
      .notEmpty().withMessage(validationMessages.required('Receipt code'))
      .isLength({ min: 16, max: 16 }).withMessage('Receipt code must be 16 characters'),
  ],
  validate,
  voteController.verifyVote
);

/**
 * @swagger
 * /api/v1/voter/report-vote-issue:
 *   post:
 *     summary: Report an issue with a vote
 *     tags: [Voting]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - electionId
 *               - issueType
 *               - description
 *             properties:
 *               electionId:
 *                 type: string
 *                 format: uuid
 *               receiptCode:
 *                 type: string
 *               issueType:
 *                 type: string
 *                 enum: [vote_not_recorded, wrong_candidate, technical_issue, verification_issue, other]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Issue reported successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/report-vote-issue',
  [
    body('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
    
    body('receiptCode')
      .optional()
      .isLength({ min: 16, max: 16 }).withMessage('Receipt code must be 16 characters'),
    
    body('issueType')
      .notEmpty().withMessage(validationMessages.required('Issue type'))
      .isIn(['vote_not_recorded', 'wrong_candidate', 'technical_issue', 'verification_issue', 'other'])
      .withMessage('Invalid issue type'),
    
    body('description')
      .notEmpty().withMessage(validationMessages.required('Description'))
      .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  ],
  validate,
  voteController.reportVoteIssue
);

export default router;