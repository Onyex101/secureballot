/**
 * @swagger
 * components:
 *   schemas:
 *     UssdAuthentication:
 *       type: object
 *       required:
 *         - nin
 *         - vin
 *         - phoneNumber
 *       properties:
 *         nin:
 *           type: string
 *           description: 11-character National Identification Number
 *           example: "12345678901"
 *         vin:
 *           type: string
 *           description: 19-character Voter Identification Number
 *           example: "1234567890123456789"
 *         phoneNumber:
 *           type: string
 *           description: Registered phone number
 *           example: "+2348012345678"
 *     UssdVote:
 *       type: object
 *       required:
 *         - sessionCode
 *         - electionId
 *         - candidateId
 *       properties:
 *         sessionCode:
 *           type: string
 *           description: Temporary session code for USSD voting
 *           example: "123456"
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
 *     UssdVoteVerification:
 *       type: object
 *       required:
 *         - receiptCode
 *         - phoneNumber
 *       properties:
 *         receiptCode:
 *           type: string
 *           description: Vote receipt code
 *           example: "a1b2c3d4e5f6g7h8"
 *         phoneNumber:
 *           type: string
 *           description: Registered phone number
 *           example: "+2348012345678"
 */
/**
 * @swagger
 * tags:
 *   name: USSD
 *   description: USSD Integration API endpoints
 */
/**
 * @swagger
 * /api/v1/ussd/start:
 *   post:
 *     summary: Initiate USSD voting session
 *     description: Start a USSD voting session by authenticating with NIN, VIN, and phone number
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UssdAuthentication'
 *     responses:
 *       200:
 *         description: USSD session started successfully
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
 *                   example: "USSD session started. Code sent via SMS"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                       format: uuid
 *                       example: "c3d4e5f6-a7b8-9012-cdef-ghijklmnopqr"
 *                     expiryTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-06-01T12:30:00Z"
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Too many attempts
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
 * /api/v1/ussd/vote:
 *   post:
 *     summary: Cast vote via USSD
 *     description: Submit a vote using a valid USSD session code
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UssdVote'
 *     responses:
 *       200:
 *         description: Vote cast successfully
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
 *                   example: "Vote cast successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     receiptCode:
 *                       type: string
 *                       example: "a1b2c3d4e5f6g7h8"
 *                     electionName:
 *                       type: string
 *                       example: "Presidential Election 2023"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-06-01T12:35:00Z"
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Already voted or session expired
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
 * /api/v1/ussd/session-status:
 *   get:
 *     summary: Check USSD session status
 *     description: Check if a USSD session is still valid and get remaining time
 *     tags: [USSD]
 *     parameters:
 *       - name: sessionCode
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Temporary session code
 *         example: "123456"
 *     responses:
 *       200:
 *         description: Session status
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
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     remainingTimeSeconds:
 *                       type: integer
 *                       example: 450
 *                     elections:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                           name:
 *                             type: string
 *                             example: "Presidential Election 2023"
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Session not found
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
 * /api/v1/ussd/verify-vote:
 *   post:
 *     summary: Verify a vote using receipt code
 *     description: Validate that a vote was successfully recorded using the receipt code
 *     tags: [USSD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UssdVoteVerification'
 *     responses:
 *       200:
 *         description: Vote verification result
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
 *                     verified:
 *                       type: boolean
 *                       example: true
 *                     electionName:
 *                       type: string
 *                       example: "Presidential Election 2023"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-06-01T12:35:00Z"
 *                     vote:
 *                       type: object
 *                       properties:
 *                         hash:
 *                           type: string
 *                           example: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9"
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Vote not found
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
