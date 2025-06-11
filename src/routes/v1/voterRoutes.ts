import { Router } from 'express';
import { body, param } from 'express-validator';
import * as voterController from '../../controllers/voter/voterController';
import * as voteController from '../../controllers/election/voteController';
import * as pollingUnitController from '../../controllers/voter/pollingUnitController';
import * as verificationController from '../../controllers/voter/verificationController';
import * as dashboardController from '../../controllers/dashboard/dashboardController';
import { authenticate } from '../../middleware/auth';
import { validate, validationMessages } from '../../middleware/validator';
import { defaultLimiter, authLimiter, sensitiveOpLimiter } from '../../middleware/rateLimiter';

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
router.get('/profile', defaultLimiter, voterController.getProfile);

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
 *         description: Profile updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/profile',
  authLimiter,
  validate([
    body('phoneNumber')
      .optional()
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage(validationMessages.phoneNumber()),
  ]),
  voterController.updateProfile,
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
router.get('/polling-unit', defaultLimiter, voterController.getPollingUnit);

/**
 * @swagger
 * /api/v1/voter/polling-units:
 *   get:
 *     summary: Get all polling units with pagination and filtering
 *     tags: [Polling Units]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: regionId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of polling units returned
 *       401:
 *         description: Unauthorized
 */
router.get('/polling-units', defaultLimiter, pollingUnitController.getPollingUnits);

/**
 * @swagger
 * /api/v1/voter/polling-units/{id}:
 *   get:
 *     summary: Get polling unit by ID
 *     tags: [Polling Units]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Polling unit returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Polling unit not found
 */
router.get(
  '/polling-units/:id',
  defaultLimiter,
  validate([
    param('id')
      .notEmpty()
      .withMessage(validationMessages.required('Polling Unit ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Polling Unit ID')),
  ]),
  pollingUnitController.getPollingUnitById,
);

/**
 * @swagger
 * /api/v1/voter/polling-units/nearby:
 *   get:
 *     summary: Get nearby polling units based on coordinates
 *     tags: [Polling Units]
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
 *         description: Missing coordinates
 *       401:
 *         description: Unauthorized
 */
router.get('/polling-units/nearby', defaultLimiter, pollingUnitController.getNearbyPollingUnits);

/**
 * @swagger
 * /api/v1/voter/verification-status:
 *   get:
 *     summary: Get voter verification status
 *     tags: [Verification]
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
router.get('/verification-status', defaultLimiter, verificationController.getVerificationStatus);

/**
 * @swagger
 * /api/v1/voter/submit-verification:
 *   post:
 *     summary: Submit verification request
 *     tags: [Verification]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *               - documentNumber
 *               - documentImageUrl
 *             properties:
 *               documentType:
 *                 type: string
 *                 example: "NIN"
 *               documentNumber:
 *                 type: string
 *                 example: "12345678901"
 *               documentImageUrl:
 *                 type: string
 *                 example: "https://example.com/document.jpg"
 *     responses:
 *       200:
 *         description: Verification request submitted
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/submit-verification',
  sensitiveOpLimiter,
  validate([
    body('documentType').notEmpty().withMessage(validationMessages.required('Document type')),
    body('documentNumber').notEmpty().withMessage(validationMessages.required('Document number')),
    body('documentImageUrl')
      .notEmpty()
      .withMessage(validationMessages.required('Document image URL'))
      .isURL()
      .withMessage(validationMessages.url('Document image URL')),
  ]),
  verificationController.submitVerification,
);

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
 */
router.get(
  '/eligibility/:electionId',
  defaultLimiter,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  voterController.checkEligibility,
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
router.get('/vote-history', defaultLimiter, voteController.getVoteHistory);

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
  defaultLimiter,
  validate([
    param('receiptCode')
      .notEmpty()
      .withMessage(validationMessages.required('Receipt code'))
      .isLength({ min: 16, max: 16 })
      .withMessage('Receipt code must be 16 characters'),
  ]),
  voteController.verifyVote,
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
 *               - voteId
 *               - issueType
 *               - description
 *             properties:
 *               voteId:
 *                 type: string
 *                 format: uuid
 *               issueType:
 *                 type: string
 *                 enum: [technical, fraud, coercion, other]
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
  sensitiveOpLimiter,
  validate([
    body('voteId')
      .notEmpty()
      .withMessage(validationMessages.required('Vote ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Vote ID')),

    body('issueType')
      .notEmpty()
      .withMessage(validationMessages.required('Issue type'))
      .isIn(['technical', 'fraud', 'coercion', 'other'])
      .withMessage('Issue type must be one of: technical, fraud, coercion, other'),

    body('description')
      .notEmpty()
      .withMessage(validationMessages.required('Description'))
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
  ]),
  voteController.reportVoteIssue,
);

/**
 * @swagger
 * /api/v1/voter/dashboard/{electionId}:
 *   get:
 *     summary: Get comprehensive dashboard data
 *     description: Retrieve all dashboard data for a specific election in a single API call
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier for the election
 *       - name: userId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to get personalized voting status
 *       - name: includeRealTime
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to include real-time updates
 *       - name: includeRegionalBreakdown
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to include regional breakdown data
 *     responses:
 *       200:
 *         description: Successful response with comprehensive dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardResponse'
 *       400:
 *         description: Bad request - Invalid election ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Election not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/dashboard/:electionId',
  defaultLimiter,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  dashboardController.getDashboardData,
);

export default router;
