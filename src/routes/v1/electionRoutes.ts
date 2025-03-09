import { Router } from 'express';
import { param, body, query } from 'express-validator';
import * as electionController from '../../controllers/election/electionController';
import * as voteController from '../../controllers/election/voteController';
import { authenticate } from '../../middleware/auth';
import { validate, validationMessages } from '../../middleware/validator';
import { defaultLimiter } from '../../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/elections:
 *   get:
 *     summary: Get list of elections
 *     tags: [Elections]
 *     security:
 *       - BearerAuth: []
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
 *         description: List of elections returned
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  [
    query('status')
      .optional()
      .isIn(['active', 'upcoming', 'past', 'all'])
      .withMessage('Status must be one of: active, upcoming, past, all'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validate,
  electionController.getElections
);

/**
 * @swagger
 * /api/v1/elections/{electionId}:
 *   get:
 *     summary: Get election details
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
 *         description: Election details returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.get(
  '/:electionId',
  [
    param('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
  ],
  validate,
  electionController.getElectionById
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/candidates:
 *   get:
 *     summary: Get candidates for an election
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
 *         description: List of candidates returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.get(
  '/:electionId/candidates',
  [
    param('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
  ],
  validate,
  electionController.getElectionCandidates
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/candidates/{candidateId}:
 *   get:
 *     summary: Get candidate details
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
 *       - name: candidateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Candidate details returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Candidate not found
 */
router.get(
  '/:electionId/candidates/:candidateId',
  [
    param('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
    
    param('candidateId')
      .notEmpty().withMessage(validationMessages.required('Candidate ID'))
      .isUUID().withMessage(validationMessages.uuid('Candidate ID')),
  ],
  validate,
  electionController.getCandidateById
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/voting-status:
 *   get:
 *     summary: Check voter's voting status for an election
 *     tags: [Voting]
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
 *         description: Voting status returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Election not found
 */
router.get(
  '/:electionId/voting-status',
  [
    param('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
  ],
  validate,
  electionController.getVotingStatus
);

/**
 * @swagger
 * /api/v1/elections/{electionId}/vote:
 *   post:
 *     summary: Cast a vote in an election
 *     tags: [Voting]
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
 *             properties:
 *               candidateId:
 *                 type: string
 *                 format: uuid
 *               encryptedVote:
 *                 type: string
 *                 description: Client-side encrypted vote data
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
  '/:electionId/vote',
  defaultLimiter,
  [
    param('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
    
    body('candidateId')
      .notEmpty().withMessage(validationMessages.required('Candidate ID'))
      .isUUID().withMessage(validationMessages.uuid('Candidate ID')),
    
    body('encryptedVote')
      .notEmpty().withMessage(validationMessages.required('Encrypted vote data')),
  ],
  validate,
  voteController.castVote
);

export default router;