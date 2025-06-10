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
const electionController = __importStar(require("../../controllers/election/electionController"));
const voteController = __importStar(require("../../controllers/election/voteController"));
const candidateController = __importStar(require("../../controllers/election/candidateController"));
const offlineVoteController = __importStar(require("../../controllers/election/offlineVoteController"));
const auth_1 = require("../../middleware/auth");
const validator_1 = require("../../middleware/validator");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
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
router.get('/:id', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
]), electionController.getElectionById);
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
router.get('/:electionId/dashboard', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
]), electionController.getElectionDashboard);
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
router.get('/:electionId/candidates', rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
]), candidateController.getCandidates);
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
router.post('/:electionId/candidates', (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
    (0, express_validator_1.body)('fullName').notEmpty().withMessage(validator_1.validationMessages.required('Full name')),
    (0, express_validator_1.body)('partyAffiliation')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Party affiliation')),
    (0, express_validator_1.body)('position').notEmpty().withMessage(validator_1.validationMessages.required('Position')),
    (0, express_validator_1.body)('biography').optional(),
    (0, express_validator_1.body)('photoUrl').optional().isURL().withMessage('Photo URL must be a valid URL'),
]), candidateController.createCandidate);
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
router.post('/:id/vote', (0, validator_1.validate)([
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
    (0, express_validator_1.body)('candidateId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Candidate ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Candidate ID')),
]), voteController.castVote);
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
router.get('/:id/voting-status', (0, validator_1.validate)([
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
]), voteController.checkVotingStatus);
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
router.get('/:electionId/offline-package', (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
]), offlineVoteController.generateOfflinePackage);
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
router.post('/:electionId/submit-offline', (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
    (0, express_validator_1.body)('encryptedVotes')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Encrypted votes'))
        .isArray()
        .withMessage('Encrypted votes must be an array'),
    (0, express_validator_1.body)('signature').notEmpty().withMessage(validator_1.validationMessages.required('Signature')),
    (0, express_validator_1.body)('keyId').notEmpty().withMessage(validator_1.validationMessages.required('Key ID')),
]), offlineVoteController.submitOfflineVotes);
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
router.get('/:electionId/offline-votes/:receiptCode', (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
    (0, express_validator_1.param)('receiptCode').notEmpty().withMessage(validator_1.validationMessages.required('Receipt code')),
]), offlineVoteController.verifyOfflineVote);
exports.default = router;
//# sourceMappingURL=electionRoutes.js.map