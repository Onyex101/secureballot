import { Router } from 'express';
import { param, query } from 'express-validator';
import * as resultsController from '../../controllers/results/resultsController';
import * as statisticsController from '../../controllers/results/statisticsController';
import { authenticate } from '../../middleware/auth';
import { validate, validationMessages } from '../../middleware/validator';
import { defaultLimiter } from '../../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/results/live/{electionId}:
 *   get:
 *     summary: Get real-time election results
 *     tags: [Results]
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
 *         description: Results returned
 *       404:
 *         description: Election not found
 */
router.get(
  '/live/:electionId',
  defaultLimiter,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  resultsController.getLiveResults,
);

/**
 * @swagger
 * /api/v1/results/statistics/{electionId}:
 *   get:
 *     summary: Get comprehensive election statistics
 *     tags: [Statistics]
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
 *         description: Statistics returned
 *       400:
 *         description: Error retrieving statistics
 *       404:
 *         description: Election not found
 */
router.get(
  '/statistics/:electionId',
  defaultLimiter,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  statisticsController.getElectionStatistics,
);

/**
 * @swagger
 * /api/v1/results/elections/{electionId}:
 *   get:
 *     summary: Get detailed election results
 *     tags: [Results]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: includePollingUnitBreakdown
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Results returned
 *       400:
 *         description: Error retrieving results
 *       404:
 *         description: Election not found
 */
router.get(
  '/elections/:electionId',
  defaultLimiter,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),
  ]),
  statisticsController.getElectionResults,
);

/**
 * @swagger
 * /api/v1/results/live:
 *   get:
 *     summary: Get real-time voting statistics across all active elections
 *     tags: [Statistics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time statistics returned
 *       400:
 *         description: Error retrieving statistics
 */
router.get('/live', defaultLimiter, statisticsController.getRealTimeVotingStats);

/**
 * @swagger
 * /api/v1/results/region/{electionId}:
 *   get:
 *     summary: Get election results by region
 *     tags: [Results]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: regionType
 *         in: query
 *         schema:
 *           type: string
 *           enum: [state, lga, ward]
 *           default: state
 *       - name: regionCode
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Results by region returned
 *       400:
 *         description: Invalid region type or missing region code
 *       404:
 *         description: Election not found
 */
router.get(
  '/region/:electionId',
  defaultLimiter,
  validate([
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Election ID')),

    query('regionType')
      .optional()
      .isIn(['state', 'lga', 'ward'])
      .withMessage('Region type must be one of: state, lga, ward'),

    query('regionCode').optional().isString().withMessage('Region code must be a string'),
  ]),
  resultsController.getResultsByRegion,
);

export default router;
