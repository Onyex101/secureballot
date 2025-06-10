import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate, validationMessages } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/accessControl';
import { UserRole } from '../../types';
import { defaultLimiter, adminLimiter } from '../../middleware/rateLimiter';

// Import controllers
import * as systemAdminController from '../../controllers/admin/systemAdminController';
import * as systemAuditorController from '../../controllers/admin/systemAuditorController';
import * as securityOfficerController from '../../controllers/admin/securityOfficerController';
import * as electoralCommissionerController from '../../controllers/admin/electoralCommissionerController';
import * as resultVerificationController from '../../controllers/admin/resultVerificationController';
import * as regionalOfficerController from '../../controllers/admin/regionalOfficerController';
import * as verificationController from '../../controllers/voter/verificationController';
import * as authController from '../../controllers/auth/authController';

// Controllers would be implemented based on admin dashboard needs
const router = Router();

// All admin routes require authentication
router.use(authenticate);

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
router.get(
  '/users',
  requireRole([UserRole.SYSTEM_ADMIN]),
  adminLimiter,
  validate([
    query('role').optional(),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'all'])
      .withMessage('Status must be one of: active, inactive, all'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ]),
  systemAdminController.listUsers,
);

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
router.post(
  '/users',
  requireRole([UserRole.SYSTEM_ADMIN]),
  adminLimiter,
  validate([
    body('email')
      .notEmpty()
      .withMessage(validationMessages.required('Email'))
      .isEmail()
      .withMessage(validationMessages.email()),

    body('fullName').notEmpty().withMessage(validationMessages.required('Full name')),

    body('phoneNumber')
      .notEmpty()
      .withMessage(validationMessages.required('Phone number'))
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage(validationMessages.phoneNumber()),

    body('password')
      .notEmpty()
      .withMessage(validationMessages.required('Password'))
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),

    body('role')
      .notEmpty()
      .withMessage(validationMessages.required('Role'))
      .isIn(Object.values(UserRole).filter(role => role !== UserRole.VOTER))
      .withMessage('Invalid admin role'),
  ]),
  systemAdminController.createUser,
);

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
router.get(
  '/audit-logs',
  requireRole([UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_AUDITOR, UserRole.SECURITY_OFFICER]),
  defaultLimiter,
  [
    query('actionType')
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
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('userId').optional().isUUID(4).withMessage('User ID must be a valid UUID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validate([query('status'), query('page'), query('limit')]),
  systemAuditorController.getAuditLogs,
);

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
router.post(
  '/elections',
  requireRole([UserRole.ELECTORAL_COMMISSIONER, UserRole.ELECTION_MANAGER]),
  defaultLimiter,
  [
    body('electionName')
      .notEmpty()
      .withMessage(validationMessages.required('Election name'))
      .isLength({ min: 3, max: 100 })
      .withMessage('Election name must be between 3 and 100 characters'),

    body('electionType')
      .notEmpty()
      .withMessage(validationMessages.required('Election type'))
      .isIn([
        'Presidential',
        'Gubernatorial',
        'Senatorial',
        'HouseOfReps',
        'StateAssembly',
        'LocalGovernment',
      ])
      .withMessage('Invalid election type'),

    body('startDate')
      .notEmpty()
      .withMessage(validationMessages.required('Start date'))
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),

    body('endDate')
      .notEmpty()
      .withMessage(validationMessages.required('End date'))
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
  ],
  validate([body('electionName'), body('electionType'), body('startDate'), body('endDate')]),
  electoralCommissionerController.createElection,
);

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
router.post(
  '/elections/:electionId/generate-keys',
  requireRole([UserRole.ELECTORAL_COMMISSIONER, UserRole.ELECTION_MANAGER]),
  defaultLimiter,
  [
    param('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID(4)
      .withMessage('Election ID must be a valid UUID'),
  ],
  validate([param('electionId')]),
  electoralCommissionerController.generateElectionKeys,
);

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
router.get(
  '/security-logs',
  requireRole([UserRole.SYSTEM_ADMIN, UserRole.SECURITY_OFFICER]),
  defaultLimiter,
  [
    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Severity must be one of: low, medium, high, critical'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validate([
    query('severity'),
    query('startDate'),
    query('endDate'),
    query('page'),
    query('limit'),
  ]),
  securityOfficerController.getSecurityLogs,
);

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
router.post(
  '/results/publish',
  requireRole([UserRole.ELECTORAL_COMMISSIONER, UserRole.RESULT_VERIFICATION_OFFICER]),
  defaultLimiter,
  [
    body('electionId')
      .notEmpty()
      .withMessage(validationMessages.required('Election ID'))
      .isUUID(4)
      .withMessage('Election ID must be a valid UUID'),
    body('publishLevel')
      .optional()
      .isIn(['preliminary', 'final'])
      .withMessage('Publish level must be either preliminary or final'),
  ],
  validate([body('electionId'), body('publishLevel')]),
  resultVerificationController.verifyAndPublishResults,
);

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
router.get(
  '/pending-verifications',
  requireRole([UserRole.VOTER_REGISTRATION_OFFICER]),
  adminLimiter,
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ]),
  verificationController.getPendingVerifications,
);

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
router.post(
  '/approve-verification/:id',
  requireRole([UserRole.VOTER_REGISTRATION_OFFICER]),
  adminLimiter,
  validate([
    param('id')
      .notEmpty()
      .withMessage(validationMessages.required('Verification ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Verification ID')),

    body('notes').optional(),
  ]),
  verificationController.approveVerification,
);

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
router.post(
  '/reject-verification/:id',
  requireRole([UserRole.VOTER_REGISTRATION_OFFICER]),
  adminLimiter,
  validate([
    param('id')
      .notEmpty()
      .withMessage(validationMessages.required('Verification ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Verification ID')),

    body('reason').notEmpty().withMessage(validationMessages.required('Rejection reason')),
  ]),
  verificationController.rejectVerification,
);

router.post('/login', async (req, res, next) => {
  try {
    await authController.login(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    await authController.logout(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.post('/verify-results', async (req, res, next) => {
  try {
    await resultVerificationController.verifyAndPublishResults(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.post('/publish-results', async (req, res, next) => {
  try {
    await resultVerificationController.publishResults(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.post('/reject-results', async (req, res, next) => {
  try {
    await resultVerificationController.rejectResults(req, res, next);
  } catch (error) {
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
router.get(
  '/regions/:state/polling-units',
  requireRole([UserRole.REGIONAL_OFFICER]),
  adminLimiter,
  validate([
    param('state').notEmpty().withMessage(validationMessages.required('State')),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search').optional(),
    query('lga').optional(),
    query('ward').optional(),
  ]),
  regionalOfficerController.getRegionPollingUnits,
);

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
router.post(
  '/polling-units',
  requireRole([UserRole.REGIONAL_OFFICER]),
  adminLimiter,
  validate([
    body('pollingUnitName')
      .notEmpty()
      .withMessage(validationMessages.required('Polling unit name')),
    body('pollingUnitCode')
      .notEmpty()
      .withMessage(validationMessages.required('Polling unit code')),
    body('address').notEmpty().withMessage(validationMessages.required('Address')),
    body('state').notEmpty().withMessage(validationMessages.required('State')),
    body('lga').notEmpty().withMessage(validationMessages.required('LGA')),
    body('ward').notEmpty().withMessage(validationMessages.required('Ward')),
    body('latitude').optional().isFloat().withMessage('Latitude must be a number'),
    body('longitude').optional().isFloat().withMessage('Longitude must be a number'),
  ]),
  regionalOfficerController.createPollingUnit,
);

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
router.put(
  '/polling-units/:pollingUnitId',
  requireRole([UserRole.REGIONAL_OFFICER]),
  adminLimiter,
  validate([
    param('pollingUnitId')
      .notEmpty()
      .withMessage(validationMessages.required('Polling unit ID'))
      .isUUID()
      .withMessage(validationMessages.uuid('Polling unit ID')),
    body('pollingUnitName').optional(),
    body('address').optional(),
    body('latitude').optional().isFloat().withMessage('Latitude must be a number'),
    body('longitude').optional().isFloat().withMessage('Longitude must be a number'),
  ]),
  regionalOfficerController.updatePollingUnit,
);

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
router.get(
  '/regions/:state/statistics',
  requireRole([UserRole.REGIONAL_OFFICER]),
  adminLimiter,
  validate([param('state').notEmpty().withMessage(validationMessages.required('State'))]),
  regionalOfficerController.getRegionStatistics,
);

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
 *         description: Include audit logs in the response (default: true)
 *         required: false
 *         schema:
 *           type: boolean
 *           default: true
 *       - name: auditLogsLimit
 *         in: query
 *         description: Limit number of audit log entries returned
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - name: suspiciousActivitiesLimit
 *         in: query
 *         description: Limit number of suspicious activities returned
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
router.get(
  '/dashboard',
  requireRole([UserRole.SYSTEM_ADMIN, UserRole.ELECTORAL_COMMISSIONER]),
  adminLimiter,
  validate([
    query('includeAuditLogs')
      .optional()
      .isBoolean()
      .withMessage('includeAuditLogs must be a boolean'),
    query('auditLogsLimit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('auditLogsLimit must be between 1 and 100'),
    query('suspiciousActivitiesLimit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('suspiciousActivitiesLimit must be between 1 and 100'),
  ]),
  systemAdminController.getDashboard,
);

// Add more admin routes as needed...

export default router;
