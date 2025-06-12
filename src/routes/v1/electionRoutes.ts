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
 *     summary: Create multiple candidates for an election (admin only)
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
 *               - candidates
 *             properties:
 *               candidates:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   required:
 *                     - fullName
 *                     - partyCode
 *                     - partyName
 *                   properties:
 *                     fullName:
 *                       type: string
 *                       example: "John Doe"
 *                     partyCode:
 *                       type: string
 *                       example: "DEM"
 *                     partyName:
 *                       type: string
 *                       example: "Democratic Party"
 *                     position:
 *                       type: string
 *                       example: "President"
 *                     bio:
 *                       type: string
 *                       example: "John Doe is a seasoned politician..."
 *                     photoUrl:
 *                       type: string
 *                       example: "https://example.com/photo.jpg"
 *                     manifesto:
 *                       type: string
 *                       example: "Our vision for a better future..."
 *           example:
 *             candidates:
 *               - fullName: "John Doe"
 *                 partyCode: "DEM"
 *                 partyName: "Democratic Party"
 *                 position: "President"
 *                 bio: "John Doe is a seasoned politician..."
 *                 photoUrl: "https://example.com/john-doe.jpg"
 *                 manifesto: "Our vision for economic growth and social justice..."
 *               - fullName: "Jane Smith"
 *                 partyCode: "REP"
 *                 partyName: "Republican Party"
 *                 position: "President"
 *                 bio: "Jane Smith has extensive experience in governance..."
 *                 photoUrl: "https://example.com/jane-smith.jpg"
 *                 manifesto: "Strong leadership for a secure future..."
 *     responses:
 *       201:
 *         description: Candidates created successfully
 *       400:
 *         description: Invalid input or only one candidate provided
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

    body('candidates')
      .notEmpty()
      .withMessage(validationMessages.required('Candidates'))
      .isArray()
      .withMessage('Candidates must be an array')
      .isLength({ min: 2 })
      .withMessage('At least 2 candidates must be provided'),

    body('candidates.*.fullName').notEmpty().withMessage(validationMessages.required('Full name')),

    body('candidates.*.partyCode')
      .notEmpty()
      .withMessage(validationMessages.required('Party code')),

    body('candidates.*.partyName')
      .notEmpty()
      .withMessage(validationMessages.required('Party name')),

    body('candidates.*.position').optional(),

    body('candidates.*.bio').optional(),

    body('candidates.*.photoUrl').optional().isURL().withMessage('Photo URL must be a valid URL'),

    body('candidates.*.manifesto').optional(),
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
