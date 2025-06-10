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
const resultsController = __importStar(require("../../controllers/results/resultsController"));
const statisticsController = __importStar(require("../../controllers/results/statisticsController"));
const auth_1 = require("../../middleware/auth");
const validator_1 = require("../../middleware/validator");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
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
router.get('/live/:electionId', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
]), resultsController.getLiveResults);
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
router.get('/statistics/:electionId', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
]), statisticsController.getElectionStatistics);
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
router.get('/elections/:electionId', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
]), statisticsController.getElectionResults);
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
router.get('/live', rateLimiter_1.defaultLimiter, statisticsController.getRealTimeVotingStats);
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
router.get('/region/:electionId', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
    (0, express_validator_1.query)('regionType')
        .optional()
        .isIn(['state', 'lga', 'ward'])
        .withMessage('Region type must be one of: state, lga, ward'),
    (0, express_validator_1.query)('regionCode').optional().isString().withMessage('Region code must be a string'),
]), resultsController.getResultsByRegion);
exports.default = router;
//# sourceMappingURL=resultsRoutes.js.map