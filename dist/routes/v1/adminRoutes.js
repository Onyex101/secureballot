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
const auth_1 = require("../../middleware/auth");
const accessControl_1 = require("../../middleware/accessControl");
const types_1 = require("../../types");
const rateLimiter_1 = require("../../middleware/rateLimiter");
// Import controllers
const systemAdminController = __importStar(require("../../controllers/admin/systemAdminController"));
const systemAuditorController = __importStar(require("../../controllers/admin/systemAuditorController"));
const securityOfficerController = __importStar(require("../../controllers/admin/securityOfficerController"));
const electoralCommissionerController = __importStar(require("../../controllers/admin/electoralCommissionerController"));
const resultVerificationController = __importStar(require("../../controllers/admin/resultVerificationController"));
const regionalOfficerController = __importStar(require("../../controllers/admin/regionalOfficerController"));
const verificationController = __importStar(require("../../controllers/voter/verificationController"));
const authController = __importStar(require("../../controllers/auth/authController"));
// Controllers would be implemented based on admin dashboard needs
const router = (0, express_1.Router)();
// All admin routes require authentication
router.use(auth_1.authenticate);
/**
 * @swagger
 * /api/v1/admin/profile:
 *   get:
 *     summary: Get current admin user profile
 *     tags: [Admin Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     fullName:
 *                       type: string
 *                       example: "John Admin"
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "admin@example.com"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+2348012345678"
 *                     adminType:
 *                       type: string
 *                       example: "SystemAdministrator"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00Z"
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "2024-12-19T10:30:00Z"
 *                     mfaEnabled:
 *                       type: boolean
 *                       example: false
 *                     creator:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         fullName:
 *                           type: string
 *                         email:
 *                           type: string
 *                           format: email
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Admin user not found
 */
router.get('/profile', rateLimiter_1.adminLimiter, systemAdminController.getProfile);
/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all admin users (System Admin only)
 *     tags: [Admin Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: role
 *         in: query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
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
 *         description: List of admin users returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a System Admin
 */
router.get('/users', (0, accessControl_1.requireRole)([types_1.UserRole.SYSTEM_ADMIN]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.query)('role').optional(),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['active', 'inactive', 'all'])
        .withMessage('Status must be one of: active, inactive, all'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
]), systemAdminController.listUsers);
/**
 * @swagger
 * /api/v1/admin/users:
 *   post:
 *     summary: Create a new admin user (System Admin only)
 *     tags: [Admin Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - fullName
 *               - phoneNumber
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [SystemAdministrator, ElectoralCommissioner, SecurityOfficer, SystemAuditor, RegionalElectoralOfficer, ElectionManager, ResultVerificationOfficer]
 *     responses:
 *       201:
 *         description: Admin user created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a System Admin
 *       409:
 *         description: User with this email already exists
 */
router.post('/users', (0, accessControl_1.requireRole)([types_1.UserRole.SYSTEM_ADMIN]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('email')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Email'))
        .isEmail()
        .withMessage(validator_1.validationMessages.email()),
    (0, express_validator_1.body)('fullName').notEmpty().withMessage(validator_1.validationMessages.required('Full name')),
    (0, express_validator_1.body)('phoneNumber')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Phone number'))
        .matches(/^\+?[0-9]{10,15}$/)
        .withMessage(validator_1.validationMessages.phoneNumber()),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Password'))
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('role')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Role'))
        .isIn(Object.values(types_1.UserRole).filter(role => role !== types_1.UserRole.VOTER))
        .withMessage('Invalid admin role'),
]), systemAdminController.createUser);
/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get audit logs with filtering and pagination
 *     tags: [System Auditor]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: actionType
 *         in: query
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: userId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Audit logs returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/audit-logs', (0, accessControl_1.requireRole)([types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.SYSTEM_AUDITOR, types_1.UserRole.SECURITY_OFFICER]), rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.query)('actionType')
        .optional()
        .isIn([
        'login',
        'logout',
        'registration',
        'verification',
        'password_reset',
        'vote_cast',
        'profile_update',
        'election_view',
        'mfa_setup',
        'mfa_verify',
        'ussd_session',
    ])
        .withMessage('Invalid action type'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    (0, express_validator_1.query)('userId').optional().isUUID(4).withMessage('User ID must be a valid UUID'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
]), systemAuditorController.getAuditLogs);
/**
 * @swagger
 * /api/v1/admin/elections:
 *   post:
 *     summary: Create a new election and generate encryption keys
 *     description: Creates a new election and automatically generates encryption keys for secure voting. If key generation fails, the election is still created successfully.
 *     tags: [Electoral Commissioner]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - electionName
 *               - electionType
 *               - startDate
 *               - endDate
 *             properties:
 *               electionName:
 *                 type: string
 *                 description: Name of the election
 *                 example: "2024 Presidential Election"
 *               electionType:
 *                 type: string
 *                 enum: [Presidential, Gubernatorial, Senatorial, HouseOfReps, StateAssembly, LocalGovernment]
 *                 description: Type of election
 *                 example: "Presidential"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Election start date and time
 *                 example: "2024-12-20T08:00:00.000Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Election end date and time
 *                 example: "2024-12-20T18:00:00.000Z"
 *               description:
 *                 type: string
 *                 description: Optional election description
 *                 example: "Presidential election for the year 2024"
 *               eligibilityRules:
 *                 type: object
 *                 description: Optional eligibility rules for voters
 *     responses:
 *       201:
 *         description: Election created successfully with encryption keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Election created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: Election ID
 *                       example: "f0c6ff28-374b-4f2b-8756-55147cd9a60f"
 *                     electionName:
 *                       type: string
 *                       example: "2024 Presidential Election"
 *                     electionType:
 *                       type: string
 *                       example: "Presidential"
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-12-20T08:00:00.000Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-12-20T18:00:00.000Z"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: "Presidential election for the year 2024"
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *                     status:
 *                       type: string
 *                       example: "draft"
 *                     keysGenerated:
 *                       type: boolean
 *                       description: Whether encryption keys were successfully generated
 *                       example: true
 *                     publicKeyFingerprint:
 *                       type: string
 *                       description: Fingerprint of the generated public key (if keys were generated)
 *                       example: "abc123def456"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-12-19T15:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-12-19T15:30:00.000Z"
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Election with overlapping dates already exists
 */
router.post('/elections', (0, accessControl_1.requireRole)([types_1.UserRole.ELECTORAL_COMMISSIONER, types_1.UserRole.ELECTION_MANAGER]), rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('electionName')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election name'))
        .isLength({ min: 3, max: 100 })
        .withMessage('Election name must be between 3 and 100 characters'),
    (0, express_validator_1.body)('electionType')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election type'))
        .isIn([
        'Presidential',
        'Gubernatorial',
        'Senatorial',
        'HouseOfReps',
        'StateAssembly',
        'LocalGovernment',
    ])
        .withMessage('Invalid election type'),
    (0, express_validator_1.body)('startDate')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Start date'))
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),
    (0, express_validator_1.body)('endDate')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('End date'))
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),
]), electoralCommissionerController.createElection);
/**
 * @swagger
 * /api/v1/admin/elections/{electionId}/generate-keys:
 *   post:
 *     summary: Generate encryption keys for an election
 *     description: Generates encryption keys for an existing election that doesn't have keys yet. This is useful for elections created before automatic key generation was implemented.
 *     tags: [Electoral Commissioner]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         description: The ID of the election to generate keys for
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "f0c6ff28-374b-4f2b-8756-55147cd9a60f"
 *     responses:
 *       201:
 *         description: Election keys generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Election keys generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     electionId:
 *                       type: string
 *                       format: uuid
 *                       description: Election ID
 *                       example: "f0c6ff28-374b-4f2b-8756-55147cd9a60f"
 *                     publicKeyFingerprint:
 *                       type: string
 *                       description: Fingerprint of the generated public key
 *                       example: "abc123def456"
 *                     keyGeneratedAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the keys were generated
 *                       example: "2024-12-19T15:30:00.000Z"
 *                     isActive:
 *                       type: boolean
 *                       description: Whether the keys are active
 *                       example: true
 *       400:
 *         description: Invalid election ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Election not found
 *       409:
 *         description: Keys already exist for this election
 */
router.post('/elections/:electionId/generate-keys', (0, accessControl_1.requireRole)([types_1.UserRole.ELECTORAL_COMMISSIONER, types_1.UserRole.ELECTION_MANAGER]), rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID(4)
        .withMessage('Election ID must be a valid UUID'),
]), electoralCommissionerController.generateElectionKeys);
/**
 * @swagger
 * /api/v1/admin/security-logs:
 *   get:
 *     summary: Get security logs with filtering and pagination
 *     tags: [Security Officer]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: severity
 *         in: query
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
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
 *         description: Security logs returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/security-logs', (0, accessControl_1.requireRole)([types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.SECURITY_OFFICER]), rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.query)('severity')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Severity must be one of: low, medium, high, critical'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
]), securityOfficerController.getSecurityLogs);
/**
 * @swagger
 * /api/v1/admin/results/publish:
 *   post:
 *     summary: Publish election results
 *     tags: [Electoral Commissioner, Result Verification Officer]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - electionId
 *             properties:
 *               electionId:
 *                 type: string
 *                 format: uuid
 *               publishLevel:
 *                 type: string
 *                 enum: [preliminary, final]
 *                 default: preliminary
 *     responses:
 *       200:
 *         description: Results published successfully
 *       400:
 *         description: Invalid input data or election not completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Election not found
 */
router.post('/results/publish', (0, accessControl_1.requireRole)([types_1.UserRole.ELECTORAL_COMMISSIONER, types_1.UserRole.RESULT_VERIFICATION_OFFICER]), rateLimiter_1.defaultLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('electionId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Election ID'))
        .isUUID(4)
        .withMessage('Election ID must be a valid UUID'),
    (0, express_validator_1.body)('publishLevel')
        .optional()
        .isIn(['preliminary', 'final'])
        .withMessage('Publish level must be either preliminary or final'),
]), resultVerificationController.verifyAndPublishResults);
/**
 * @swagger
 * /api/v1/admin/register-voter:
 *   post:
 *     summary: Register a new voter (Admin only)
 *     tags: [Voter Management]
 *     security:
 *       - BearerAuth: []
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
 *               - dateOfBirth
 *               - fullName
 *               - pollingUnitCode
 *               - state
 *               - gender
 *               - lga
 *               - ward
 *             properties:
 *               nin:
 *                 type: string
 *                 description: 11-character National Identification Number
 *                 example: "12345678901"
 *               vin:
 *                 type: string
 *                 description: 19-character Voter Identification Number
 *                 example: "1234567890123456789"
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number for MFA
 *                 example: "+2348012345678"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Date of birth for verification
 *                 example: "1990-01-01"
 *               fullName:
 *                 type: string
 *                 description: Full name of the voter
 *                 example: "John Doe"
 *               pollingUnitCode:
 *                 type: string
 *                 description: Assigned polling unit code
 *                 example: "PU001"
 *               state:
 *                 type: string
 *                 description: State of residence
 *                 example: "Lagos"
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *                 description: Gender of the voter
 *                 example: "male"
 *               lga:
 *                 type: string
 *                 description: Local Government Area
 *                 example: "Ikeja"
 *               ward:
 *                 type: string
 *                 description: Ward within the LGA
 *                 example: "Ward 1"
 *               autoVerify:
 *                 type: boolean
 *                 description: Whether to automatically verify the voter after registration
 *                 default: false
 *     responses:
 *       201:
 *         description: Voter registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Voter registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     voter:
 *                       type: object
 *                       description: Registered voter details
 *                     verification:
 *                       type: object
 *                       description: Verification status (if auto-verified)
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Voter already exists
 */
router.post('/register-voter', (0, accessControl_1.requireRole)([
    types_1.UserRole.SYSTEM_ADMIN,
    types_1.UserRole.VOTER_REGISTRATION_OFFICER,
    types_1.UserRole.ELECTORAL_COMMISSIONER,
]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, validator_1.ninValidation)(),
    (0, validator_1.vinValidation)(),
    (0, validator_1.phoneValidation)(),
    (0, express_validator_1.body)('dateOfBirth')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Date of birth'))
        .isISO8601()
        .withMessage('Date of birth must be a valid date'),
    (0, express_validator_1.body)('fullName')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Full name'))
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('pollingUnitCode')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Polling unit code'))
        .isLength({ min: 1, max: 50 })
        .withMessage('Polling unit code must be between 1 and 50 characters'),
    (0, express_validator_1.body)('state')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('State'))
        .isLength({ min: 2, max: 50 })
        .withMessage('State must be between 2 and 50 characters'),
    (0, express_validator_1.body)('gender')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Gender'))
        .isIn(['male', 'female'])
        .withMessage('Gender must be either male or female'),
    (0, express_validator_1.body)('lga')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('LGA'))
        .isLength({ min: 2, max: 50 })
        .withMessage('LGA must be between 2 and 50 characters'),
    (0, express_validator_1.body)('ward')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Ward'))
        .isLength({ min: 1, max: 100 })
        .withMessage('Ward must be between 1 and 100 characters'),
    (0, express_validator_1.body)('autoVerify').optional().isBoolean().withMessage('autoVerify must be a boolean'),
]), authController.register);
/**
 * @swagger
 * /api/v1/admin/pending-verifications:
 *   get:
 *     summary: Get pending voter verification requests (Voter Registration Officer only)
 *     tags: [Verification]
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
 *         description: List of pending verification requests returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Voter Registration Officer
 */
router.get('/pending-verifications', (0, accessControl_1.requireRole)([types_1.UserRole.VOTER_REGISTRATION_OFFICER]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
]), verificationController.getPendingVerifications);
/**
 * @swagger
 * /api/v1/admin/approve-verification/{id}:
 *   post:
 *     summary: Approve a voter verification request (Voter Registration Officer only)
 *     tags: [Verification]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification request approved
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Voter Registration Officer
 *       404:
 *         description: Verification request not found
 */
router.post('/approve-verification/:id', (0, accessControl_1.requireRole)([types_1.UserRole.VOTER_REGISTRATION_OFFICER]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Verification ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Verification ID')),
    (0, express_validator_1.body)('notes').optional(),
]), verificationController.approveVerification);
/**
 * @swagger
 * /api/v1/admin/reject-verification/{id}:
 *   post:
 *     summary: Reject a voter verification request (Voter Registration Officer only)
 *     tags: [Verification]
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification request rejected
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Voter Registration Officer
 *       404:
 *         description: Verification request not found
 */
router.post('/reject-verification/:id', (0, accessControl_1.requireRole)([types_1.UserRole.VOTER_REGISTRATION_OFFICER]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Verification ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Verification ID')),
    (0, express_validator_1.body)('reason').notEmpty().withMessage(validator_1.validationMessages.required('Rejection reason')),
]), verificationController.rejectVerification);
/**
 * @swagger
 * /api/v1/admin/login:
 *   post:
 *     summary: Admin user login
 *     tags: [Admin Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nin
 *               - vin
 *             properties:
 *               nin:
 *                 type: string
 *                 description: National Identification Number (11 digits)
 *                 pattern: '^\d{11}$'
 *                 example: '12345678901'
 *               vin:
 *                 type: string
 *                 description: Voter Identification Number (19 characters)
 *                 pattern: '^[A-Z0-9]{19}$'
 *                 example: 'VIN1234567890ABCDEF'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Login successful'
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT token for authentication
 *                     user:
 *                       type: object
 *                       description: Admin user information
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not active
 */
router.post('/login', async (req, res, next) => {
    try {
        await authController.login(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /api/v1/admin/logout:
 *   post:
 *     summary: Admin user logout
 *     tags: [Admin Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Logout successful'
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', async (req, res, next) => {
    try {
        await authController.adminLogout(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /api/v1/admin/verify-results:
 *   post:
 *     summary: Verify election results
 *     tags: [Result Verification Officer]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - electionId
 *             properties:
 *               electionId:
 *                 type: string
 *                 format: uuid
 *                 description: Election ID to verify results for
 *     responses:
 *       200:
 *         description: Results verified successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Election not found
 */
router.post('/verify-results', async (req, res, next) => {
    try {
        await resultVerificationController.verifyAndPublishResults(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /api/v1/admin/publish-results:
 *   post:
 *     summary: Publish verified election results
 *     tags: [Result Verification Officer]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - electionId
 *             properties:
 *               electionId:
 *                 type: string
 *                 format: uuid
 *                 description: Election ID to publish results for
 *               publishLevel:
 *                 type: string
 *                 enum: [preliminary, final]
 *                 default: preliminary
 *                 description: Level of results to publish
 *     responses:
 *       200:
 *         description: Results published successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Election not found
 */
router.post('/publish-results', async (req, res, next) => {
    try {
        await resultVerificationController.publishResults(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /api/v1/admin/reject-results:
 *   post:
 *     summary: Reject election results
 *     tags: [Result Verification Officer]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - electionId
 *               - reason
 *             properties:
 *               electionId:
 *                 type: string
 *                 format: uuid
 *                 description: Election ID to reject results for
 *               reason:
 *                 type: string
 *                 description: Reason for rejecting the results
 *     responses:
 *       200:
 *         description: Results rejected successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Election not found
 */
router.post('/reject-results', async (req, res, next) => {
    try {
        await resultVerificationController.rejectResults(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /api/v1/admin/regions/{state}/polling-units:
 *   get:
 *     summary: Get polling units in a region (Regional Officer only)
 *     tags: [Regional Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: state
 *         in: path
 *         required: true
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
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *       - name: lga
 *         in: query
 *         schema:
 *           type: string
 *       - name: ward
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Polling units in region returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Regional Officer
 */
router.get('/regions/:state/polling-units', (0, accessControl_1.requireRole)([types_1.UserRole.REGIONAL_OFFICER]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('state').notEmpty().withMessage(validator_1.validationMessages.required('State')),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('search').optional(),
    (0, express_validator_1.query)('lga').optional(),
    (0, express_validator_1.query)('ward').optional(),
]), regionalOfficerController.getRegionPollingUnits);
/**
 * @swagger
 * /api/v1/admin/polling-units:
 *   post:
 *     summary: Create a new polling unit (Regional Officer only)
 *     tags: [Regional Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pollingUnitName
 *               - pollingUnitCode
 *               - address
 *               - state
 *               - lga
 *               - ward
 *             properties:
 *               pollingUnitName:
 *                 type: string
 *               pollingUnitCode:
 *                 type: string
 *               address:
 *                 type: string
 *               state:
 *                 type: string
 *               lga:
 *                 type: string
 *               ward:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       201:
 *         description: Polling unit created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Regional Officer
 */
router.post('/polling-units', (0, accessControl_1.requireRole)([types_1.UserRole.REGIONAL_OFFICER]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.body)('pollingUnitName')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Polling unit name')),
    (0, express_validator_1.body)('pollingUnitCode')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Polling unit code')),
    (0, express_validator_1.body)('address').notEmpty().withMessage(validator_1.validationMessages.required('Address')),
    (0, express_validator_1.body)('state').notEmpty().withMessage(validator_1.validationMessages.required('State')),
    (0, express_validator_1.body)('lga').notEmpty().withMessage(validator_1.validationMessages.required('LGA')),
    (0, express_validator_1.body)('ward').notEmpty().withMessage(validator_1.validationMessages.required('Ward')),
    (0, express_validator_1.body)('latitude').optional().isFloat().withMessage('Latitude must be a number'),
    (0, express_validator_1.body)('longitude').optional().isFloat().withMessage('Longitude must be a number'),
]), regionalOfficerController.createPollingUnit);
/**
 * @swagger
 * /api/v1/admin/polling-units/{pollingUnitId}:
 *   put:
 *     summary: Update a polling unit (Regional Officer only)
 *     tags: [Regional Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: pollingUnitId
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
 *             properties:
 *               pollingUnitName:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Polling unit updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Regional Officer
 *       404:
 *         description: Polling unit not found
 */
router.put('/polling-units/:pollingUnitId', (0, accessControl_1.requireRole)([types_1.UserRole.REGIONAL_OFFICER]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.param)('pollingUnitId')
        .notEmpty()
        .withMessage(validator_1.validationMessages.required('Polling unit ID'))
        .isUUID()
        .withMessage(validator_1.validationMessages.uuid('Polling unit ID')),
    (0, express_validator_1.body)('pollingUnitName').optional(),
    (0, express_validator_1.body)('address').optional(),
    (0, express_validator_1.body)('latitude').optional().isFloat().withMessage('Latitude must be a number'),
    (0, express_validator_1.body)('longitude').optional().isFloat().withMessage('Longitude must be a number'),
]), regionalOfficerController.updatePollingUnit);
/**
 * @swagger
 * /api/v1/admin/regions/{state}/statistics:
 *   get:
 *     summary: Get regional statistics (Regional Officer only)
 *     tags: [Regional Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: state
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Regional statistics returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Regional Officer
 */
router.get('/regions/:state/statistics', (0, accessControl_1.requireRole)([types_1.UserRole.REGIONAL_OFFICER]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([(0, express_validator_1.param)('state').notEmpty().withMessage(validator_1.validationMessages.required('State'))]), regionalOfficerController.getRegionStatistics);
/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get comprehensive admin dashboard data
 *     description: |
 *       Retrieve all administrative dashboard data in a single API call including
 *       system statistics, admin users, polling units, verification requests,
 *       audit logs, and suspicious activities. This endpoint consolidates multiple
 *       data sources to optimize dashboard loading performance.
 *     tags:
 *       - Electoral Commissioner
 *       - Admin Dashboard
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: includeAuditLogs
 *         in: query
 *         description: "Include audit logs in the response (default: true)"
 *         required: false
 *         schema:
 *           type: boolean
 *           default: true
 *       - name: auditLogsLimit
 *         in: query
 *         description: "Limit number of audit log entries returned"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - name: suspiciousActivitiesLimit
 *         in: query
 *         description: "Limit number of suspicious activities returned"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     systemStatistics:
 *                       type: object
 *                       properties:
 *                         totalVoters:
 *                           type: integer
 *                           example: 2847392
 *                         activeElections:
 *                           type: integer
 *                           example: 3
 *                         totalVotes:
 *                           type: integer
 *                           example: 1923847
 *                         completedElections:
 *                           type: integer
 *                           example: 12
 *                         pendingVerifications:
 *                           type: integer
 *                           example: 156
 *                         totalPollingUnits:
 *                           type: integer
 *                           example: 8842
 *                         systemUptime:
 *                           type: number
 *                           format: float
 *                           example: 99.97
 *                         averageTurnout:
 *                           type: number
 *                           format: float
 *                           example: 67.4
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-12-19T10:30:00Z"
 *                 message:
 *                   type: string
 *                   example: "Dashboard data retrieved successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - Insufficient permissions (not an admin user)
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *       500:
 *         description: Internal Server Error
 */
router.get('/dashboard', (0, accessControl_1.requireRole)([types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.ELECTORAL_COMMISSIONER]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.query)('includeAuditLogs')
        .optional()
        .isBoolean()
        .withMessage('includeAuditLogs must be a boolean'),
    (0, express_validator_1.query)('auditLogsLimit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('auditLogsLimit must be between 1 and 100'),
    (0, express_validator_1.query)('suspiciousActivitiesLimit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('suspiciousActivitiesLimit must be between 1 and 100'),
]), systemAdminController.getDashboard);
/**
 * @swagger
 * /api/v1/admin/suspicious-activities:
 *   get:
 *     summary: Get suspicious activities with filtering
 *     description: Retrieve detected suspicious activities with filtering and pagination
 *     tags:
 *       - Security Officer
 *       - System Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: severity
 *         in: query
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, investigated, resolved, false_positive]
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
 *           default: 50
 *     responses:
 *       200:
 *         description: Suspicious activities retrieved successfully
 */
router.get('/suspicious-activities', (0, accessControl_1.requireRole)([types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.SECURITY_OFFICER]), rateLimiter_1.adminLimiter, (0, validator_1.validate)([
    (0, express_validator_1.query)('severity')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Severity must be one of: low, medium, high, critical'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['active', 'investigated', 'resolved', 'false_positive'])
        .withMessage('Status must be one of: active, investigated, resolved, false_positive'),
    (0, express_validator_1.query)('type').optional(),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
]), securityOfficerController.getSuspiciousActivities);
// Add more admin routes as needed...
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map