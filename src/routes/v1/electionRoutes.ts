import { Router } from 'express';
import { param, body, query } from 'express-validator';
import * as electionController from '../../controllers/election/electionController';
import * as voteController from '../../controllers/election/voteController';
import * as candidateController from '../../controllers/election/candidateController';
import * as offlineVoteController from '../../controllers/election/offlineVoteController';
import { authenticate } from '../../middleware/auth';
import { validate, validationMessages } from '../../middleware/validator';
import { defaultLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Public routes (no authentication required)
/**
 * @swagger
 * /api/v1/elections:
 *   get:
 *     summary: Get list of elections with candidates (Public)
 *     tags: [Elections]
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, upcoming, past, all]
 *           default: active
 *       - name: type
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
 *           default: 10
 *     responses:
 *       200:
 *         description: List of elections with candidates returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "ELECTIONS_RETRIEVED"
 *                 message:
 *                   type: string
 *                   example: "Elections retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     elections:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           electionName:
 *                             type: string
 *                           electionType:
 *                             type: string
 *                           status:
 *                             type: string
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                           endDate:
 *                             type: string
 *                             format: date-time
 *                           description:
 *                             type: string
 *                           candidates:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 fullName:
 *                                   type: string
 *                                 partyName:
 *                                   type: string
 *                                 partyCode:
 *                                   type: string
 *                                 profileImageUrl:
 *                                   type: string
 *                           candidateCount:
 *                             type: integer
 *                             description: Total number of candidates
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                     voterStatus:
 *                       type: object
 *                       nullable: true
 */
router.get(
  '/',
  defaultLimiter,
  validate([
    query('status')
      .optional()
      .isIn(['active', 'upcoming', 'past', 'all'])
      .withMessage('Status must be one of: active, upcoming, past, all'),

    query('type').optional(),

    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ]),
  electionController.getElections,
);

// All other routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/elections/{id}:
 *   get:
 *     summary: Get election details
 *     tags: [Elections]
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
 *         description: Election details returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.get(
  '/:id',
  defaultLimiter,
  validate([
    param('id')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  electionController.getElectionById,
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/dashboard:
 *   get:
 *     summary: Get comprehensive election dashboard data
 *     tags: [Elections]
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
 *         description: Election dashboard data returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "ELECTION_DASHBOARD_RETRIEVED"
 *                 message:
 *                   type: string
 *                   example: "Election dashboard data retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       description: "Overview statistics and election info"
 *                     candidates:
 *                       type: object
 *                       description: "Candidates data and comparison"
 *                     statistics:
 *                       type: object
 *                       description: "Detailed statistics by region, age, gender"
 *                     liveUpdates:
 *                       type: array
 *                       description: "Live election updates and announcements"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.get(
  '/:electionId/dashboard',
  defaultLimiter,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  electionController.getElectionDashboard,
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/candidates:
 *   get:
 *     summary: Get all candidates for an election
 *     tags: [Candidates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
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
 *         description: List of candidates returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.get(
  '/:electionId/candidates',
  defaultLimiter,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),

    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ]),
  candidateController.getCandidates,
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/candidates:
 *   post:
 *     summary: Create a new candidate for an election (admin only)
 *     tags: [Candidates]
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
 *               - fullName
 *               - partyAffiliation
 *               - position
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "John Doe"
 *               partyAffiliation:
 *                 type: string
 *                 example: "Democratic Party"
 *               position:
 *                 type: string
 *                 example: "President"
 *               biography:
 *                 type: string
 *                 example: "John Doe is a seasoned politician..."
 *               photoUrl:
 *                 type: string
 *                 example: "https://example.com/photo.jpg"
 *     responses:
 *       201:
 *         description: Candidate created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 */
router.post(
  '/:electionId/candidates',
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),

    body('fullName').notEmpty().withMessage(validationMessages.required('Full name')),

    body('partyAffiliation')
      .notEmpty()
      .withMessage(validationMessages.required('Party affiliation')),

    body('position').notEmpty().withMessage(validationMessages.required('Position')),

    body('biography').optional(),

    body('photoUrl').optional().isURL().withMessage('Photo URL must be a valid URL'),
  ]),
  candidateController.createCandidate,
);

/**
 * @swagger
 * /api/v1/elections/{id}/vote:
 *   post:
 *     summary: Cast a vote in an election
 *     tags: [Voting]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
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
 *             properties:
 *               candidateId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Vote cast successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Already voted or ineligible
 *       404:
 *         description: Election or candidate not found
 */
router.post(
  '/:id/vote',
  validate([
    param('id')
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
  voteController.castVote,
);

/**
 * @swagger
 * /api/v1/elections/{id}/voting-status:
 *   get:
 *     summary: Check if voter has already voted in an election
 *     tags: [Voting]
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
 *         description: Voting status returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.get(
  '/:id/voting-status',
  validate([
    param('id')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  voteController.checkVotingStatus,
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/offline-package:
 *   get:
 *     summary: Generate offline voting package
 *     tags: [Offline Voting]
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
 *         description: Offline voting package generated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Voter not eligible
 *       404:
 *         description: Election not found
 */
router.get(
  '/:electionId/offline-package',
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  offlineVoteController.generateOfflinePackage,
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/submit-offline:
 *   post:
 *     summary: Submit offline votes
 *     tags: [Offline Voting]
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
 *               - keyId
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
 *               keyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Offline votes submitted successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.post(
  '/:electionId/submit-offline',
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

    body('keyId').notEmpty().withMessage(validationMessages.required('Key ID')),
  ]),
  offlineVoteController.submitOfflineVotes,
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/offline-votes/{receiptCode}:
 *   get:
 *     summary: Verify offline vote status
 *     tags: [Offline Voting]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Receipt code not found
 */
router.get(
  '/:electionId/offline-votes/:receiptCode',
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),

    param('receiptCode').notEmpty().withMessage(validationMessages.required('Receipt code')),
  ]),
  offlineVoteController.verifyOfflineVote,
);

export default router;
