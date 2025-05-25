/**
 * @swagger
 * components:
 *   schemas:
 *     MobileLogin:
 *       type: object
 *       required:
 *         - nin
 *         - vin
 *         - password
 *         - deviceInfo
 *       properties:
 *         nin:
 *           type: string
 *           description: 11-character National Identification Number
 *           example: "12345678901"
 *         vin:
 *           type: string
 *           description: 19-character Voter Identification Number
 *           example: "1234567890123456789"
 *         password:
 *           type: string
 *           format: password
 *           description: User password
 *           example: "securepassword123"
 *         deviceInfo:
 *           type: object
 *           required:
 *             - deviceId
 *             - deviceModel
 *             - osVersion
 *             - appVersion
 *           properties:
 *             deviceId:
 *               type: string
 *               description: Unique device identifier
 *               example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             deviceModel:
 *               type: string
 *               description: Model of the device
 *               example: "Samsung Galaxy S21"
 *             osVersion:
 *               type: string
 *               description: Operating system version
 *               example: "Android 13.0"
 *             appVersion:
 *               type: string
 *               description: Mobile app version
 *               example: "1.2.0"
 *     DeviceVerification:
 *       type: object
 *       required:
 *         - deviceId
 *         - verificationCode
 *       properties:
 *         deviceId:
 *           type: string
 *           description: Unique device identifier
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         verificationCode:
 *           type: string
 *           description: 6-digit verification code
 *           example: "123456"
 *     OfflineVote:
 *       type: object
 *       required:
 *         - electionId
 *         - candidateId
 *         - signature
 *         - timestamp
 *       properties:
 *         electionId:
 *           type: string
 *           format: uuid
 *           description: ID of the election
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         candidateId:
 *           type: string
 *           format: uuid
 *           description: ID of the candidate
 *           example: "b2c3d4e5-f6a7-8901-bcde-f1234567890a"
 *         signature:
 *           type: string
 *           description: Digital signature of the vote
 *           example: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe..."
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Time when the vote was cast
 *           example: "2023-06-01T12:35:00Z"
 *     OfflineVoteSubmission:
 *       type: object
 *       required:
 *         - electionId
 *         - votes
 *         - deviceId
 *       properties:
 *         electionId:
 *           type: string
 *           format: uuid
 *           description: ID of the election
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         votes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OfflineVote'
 *         deviceId:
 *           type: string
 *           description: Unique device identifier
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 */

/**
 * @swagger
 * tags:
 *   name: Mobile Integration
 *   description: Mobile Application API endpoints
 */

/**
 * @swagger
 * /api/v1/mobile/auth/login:
 *   post:
 *     summary: Login from mobile app
 *     description: Authenticate mobile app user and validate device information
 *     tags: [Mobile Integration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MobileLogin'
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
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                         nin:
 *                           type: string
 *                           example: "12345678901"
 *                     deviceVerified:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/v1/mobile/auth/verify-device:
 *   post:
 *     summary: Verify mobile device
 *     description: Verify mobile device with verification code sent via SMS
 *     tags: [Mobile Integration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceVerification'
 *     responses:
 *       200:
 *         description: Device verified successfully
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
 *                   example: "Device verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid verification code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/v1/mobile/vote/offline-package:
 *   get:
 *     summary: Get offline voting package
 *     description: Download election data for offline voting
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the election
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Offline voting package
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
 *                     election:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                         name:
 *                           type: string
 *                           example: "Presidential Election 2023"
 *                     candidates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             example: "b2c3d4e5-f6a7-8901-bcde-f1234567890a"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           party:
 *                             type: string
 *                             example: "National Party"
 *                     publicKey:
 *                       type: string
 *                       description: Server public key for encryption
 *                       example: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe..."
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Election not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/v1/mobile/vote/submit-offline:
 *   post:
 *     summary: Submit offline votes
 *     description: Submit votes collected while offline
 *     tags: [Mobile Integration]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OfflineVoteSubmission'
 *     responses:
 *       200:
 *         description: Votes submitted successfully
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
 *                   example: "Offline votes submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     acceptedCount:
 *                       type: integer
 *                       example: 5
 *                     rejectedCount:
 *                       type: integer
 *                       example: 0
 *                     receiptCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "a1b2c3d4e5f6g7h8"
 *       400:
 *         description: Invalid input parameters or votes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Device not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
