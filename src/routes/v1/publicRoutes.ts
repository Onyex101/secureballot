import { Router } from 'express';
import { param, query } from 'express-validator';
import { validate, validationMessages } from '../../middleware/validator';
import { defaultLimiter } from '../../middleware/rateLimiter';
import * as pollingUnitController from '../../controllers/voter/pollingUnitController';
import * as electionController from '../../controllers/election/electionController';

const router = Router();

/**
 * @swagger
 * /api/v1/public/elections:
 *   get:
 *     summary: Get list of elections with candidates (Public)
 *     tags: [Public, Elections]
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
 *                           registeredVotersCount:
 *                             type: integer
 *                             description: Total number of registered voters
 *                           votesCastCount:
 *                             type: integer
 *                             description: Total number of votes cast for this election
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
 *                     availableElectionTypes:
 *                       type: array
 *                       description: All possible election types that can be created
 *                       items:
 *                         type: string
 *                         enum: [Presidential, Gubernatorial, Senatorial, HouseOfReps, StateAssembly, LocalGovernment]
 *                       example: ["Presidential", "Gubernatorial", "Senatorial", "HouseOfReps", "StateAssembly", "LocalGovernment"]
 */
router.get(
  '/elections',
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

/**
 * @swagger
 * /api/v1/public/polling-units:
 *   get:
 *     summary: Get all polling units with pagination and filtering (Public)
 *     tags: [Public, Polling Units]
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
 */
router.get(
  '/polling-units',
  defaultLimiter,
  validate([
    query('regionId').optional().isUUID().withMessage('Region ID must be a valid UUID'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ]),
  pollingUnitController.getPollingUnits,
);

/**
 * @swagger
 * /api/v1/public/polling-units/{id}:
 *   get:
 *     summary: Get polling unit by ID (Public)
 *     tags: [Public, Polling Units]
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
 * /api/v1/public/polling-units/nearby:
 *   get:
 *     summary: Get nearby polling units based on coordinates (Public)
 *     tags: [Public, Polling Units]
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
 */
router.get(
  '/polling-units/nearby',
  defaultLimiter,
  validate([
    query('latitude')
      .notEmpty()
      .withMessage('Latitude is required')
      .isFloat()
      .withMessage('Latitude must be a valid number'),
    query('longitude')
      .notEmpty()
      .withMessage('Longitude is required')
      .isFloat()
      .withMessage('Longitude must be a valid number'),
    query('radius')
      .optional()
      .isFloat({ min: 0.1, max: 100 })
      .withMessage('Radius must be between 0.1 and 100 kilometers'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ]),
  pollingUnitController.getNearbyPollingUnits,
);

export default router;
