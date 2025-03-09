import { Router } from 'express';
import { param, query } from 'express-validator';
import * as resultsController from '../../controllers/results/resultsController';
import { validate, validationMessages } from '../../middleware/validator';
import { defaultLimiter } from '../../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /api/v1/results/live/{electionId}:
 *   get:
 *     summary: Get real-time election results
 *     tags: [Results]
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
  [
    param('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
  ],
  validate,
  resultsController.getLiveResults
);

/**
 * @swagger
 * /api/v1/results/region/{electionId}:
 *   get:
 *     summary: Get election results by region
 *     tags: [Results]
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
 *           enum: [state, lga, ward, pollingUnit]
 *           default: state
 *       - name: regionCode
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Regional results returned
 *       404:
 *         description: Election or region not found
 */
router.get(
  '/region/:electionId',
  defaultLimiter,
  [
    param('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
    
    query('regionType')
      .optional()
      .isIn(['state', 'lga', 'ward', 'pollingUnit'])
      .withMessage('Region type must be one of: state, lga, ward, pollingUnit'),
  ],
  validate,
  resultsController.getResultsByRegion
);

/**
 * @swagger
 * /api/v1/results/statistics/{electionId}:
 *   get:
 *     summary: Get comprehensive statistics for an election
 *     tags: [Results]
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
 *       404:
 *         description: Election not found
 */
router.get(
  '/statistics/:electionId',
  defaultLimiter,
  [
    param('electionId')
      .notEmpty().withMessage(validationMessages.required('Election ID'))
      .isUUID().withMessage(validationMessages.uuid('Election ID')),
  ],
  validate,
  resultsController.getElectionStatistics
);

export default router;