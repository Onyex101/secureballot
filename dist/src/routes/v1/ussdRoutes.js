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
const ussdSessionController = __importStar(require("../../controllers/ussd/ussdSessionController"));
const ussdVoteController = __importStar(require("../../controllers/ussd/ussdVoteController"));
// Controllers would be implemented based on USSD processing needs
// This is a placeholder for the route structure
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/v1/ussd/start:
 *   post:
 *     summary: Initiate USSD voting session
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nin
 *               - vin
 *               - phoneNumber
 *             properties:
 *               nin:
 *                 type: string
 *                 example: "12345678901"
 *               vin:
 *                 type: string
 *                 example: "1234567890123456789"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345678"
 *     responses:
 *       200:
 *         description: USSD session started, code sent via SMS
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Too many attempts
 */
router.post('/start', rateLimiter_1.ussdLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('nin')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('NIN'))
        .isLength({ min: 11, max: 11 })
        .withMessage(validator_1.validationMessages.nin()),
    (0, express_validator_1.body)('vin')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('VIN'))
        .isLength({ min: 19, max: 19 })
        .withMessage(validator_1.validationMessages.vin()),
    (0, express_validator_1.body)('phoneNumber')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Phone number'))
        .matches(/^\+?[0-9]{10,15}$/)
        .withMessage(validator_1.validationMessages.phoneNumber()),
]), ussdSessionController.startSession);
/**
 * @swagger
 * /api/v1/ussd/vote:
 *   post:
 *     summary: Cast a vote via USSD
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionCode
 *               - electionId
 *               - candidateId
 *             properties:
 *               sessionCode:
 *                 type: string
 *                 example: "123456"
 *               electionId:
 *                 type: string
 *                 format: uuid
 *               candidateId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Vote cast successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid session
 *       403:
 *         description: Already voted
 */
router.post('/vote', rateLimiter_1.ussdLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('sessionCode')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Session code'))
        .isLength({ min: 6, max: 10 })
        .withMessage('Session code must be 6-10 characters'),
    (0, express_validator_1.body)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Election ID')),
    (0, express_validator_1.body)('candidateId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Candidate ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Candidate ID')),
]), ussdVoteController.castVote);
/**
 * @swagger
 * /api/v1/ussd/session-status:
 *   get:
 *     summary: Check USSD session status
 *     tags: [USSD]
 *     parameters:
 *       - name: sessionCode
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session status returned
 *       404:
 *         description: Session not found
 */
router.get('/session-status', (0, validator_1.validate)([
    (0, express_validator_1.query)('sessionCode')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Session code'))
        .isLength({ min: 6, max: 10 })
        .withMessage('Session code must be 6-10 characters'),
]), ussdSessionController.getSessionStatus);
/**
 * @swagger
 * /api/v1/ussd/verify-vote:
 *   post:
 *     summary: Verify a vote using receipt code
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiptCode
 *               - phoneNumber
 *             properties:
 *               receiptCode:
 *                 type: string
 *                 example: "a1b2c3d4e5f6g7h8"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345678"
 *     responses:
 *       200:
 *         description: Vote verification result
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Vote not found
 */
router.post('/verify-vote', rateLimiter_1.ussdLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('receiptCode')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Receipt code'))
        .isLength({ min: 16, max: 16 })
        .withMessage('Receipt code must be 16 characters'),
    (0, express_validator_1.body)('phoneNumber')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Phone number'))
        .matches(/^\+?[0-9]{10,15}$/)
        .withMessage(validator_1.validationMessages.phoneNumber()),
]), ussdVoteController.verifyVote);
/**
 * @swagger
 * /api/v1/ussd/menu:
 *   post:
 *     summary: Handle USSD menu navigation
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - selection
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "123456"
 *               selection:
 *                 type: string
 *                 example: "1"
 *     responses:
 *       200:
 *         description: Menu navigation processed
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Session not found
 */
router.post('/menu', rateLimiter_1.ussdLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('sessionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Session ID'))
        .isLength({ min: 6, max: 10 })
        .withMessage('Session ID must be 6-10 characters'),
    (0, express_validator_1.body)('selection').notEmpty().withMessage(validator_1.validationMessages.required('Selection')),
]), ussdSessionController.handleMenuNavigation);
/**
 * @swagger
 * /api/v1/ussd/end:
 *   post:
 *     summary: End USSD session
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Session ended successfully
 *       404:
 *         description: Session not found
 */
router.post('/end', rateLimiter_1.ussdLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('sessionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Session ID'))
        .isLength({ min: 6, max: 10 })
        .withMessage('Session ID must be 6-10 characters'),
]), ussdSessionController.endSession);
exports.default = router;
//# sourceMappingURL=ussdRoutes.js.map