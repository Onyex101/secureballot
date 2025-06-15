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
const rateLimiter_1 = require("../../middleware/rateLimiter");
const pollingUnitController = __importStar(require("../../controllers/voter/pollingUnitController"));
const electionController = __importStar(require("../../controllers/election/electionController"));
const router = (0, express_1.Router)();
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
router.get('/elections', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['active', 'upcoming', 'past', 'all'])
        .withMessage('Status must be one of: active, upcoming, past, all'),
    (0, express_validator_1.query)('type').optional(),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
]), electionController.getElections);
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
router.get('/polling-units', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.query)('regionId').optional().isUUID().withMessage('Region ID must be a valid UUID'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
]), pollingUnitController.getPollingUnits);
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
router.get('/polling-units/:id', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Polling Unit ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Polling Unit ID')),
]), pollingUnitController.getPollingUnitById);
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
router.get('/polling-units/nearby', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.query)('latitude')
        .notEmpty()
        .withMessage('Latitude is required')
        .isFloat()
        .withMessage('Latitude must be a valid number'),
    (0, express_validator_1.query)('longitude')
        .notEmpty()
        .withMessage('Longitude is required')
        .isFloat()
        .withMessage('Longitude must be a valid number'),
    (0, express_validator_1.query)('radius')
        .optional()
        .isFloat({ min: 0.1, max: 100 })
        .withMessage('Radius must be between 0.1 and 100 kilometers'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
]), pollingUnitController.getNearbyPollingUnits);
exports.default = router;
//# sourceMappingURL=publicRoutes.js.map