/**
 * @swagger
 * components:
 *   schemas:
 *     VoterProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Voter unique identifier
 *           example: "v1o2t3e4-r5i6-7890-abcd-ef1234567890"
 *         nin:
 *           type: string
 *           description: National Identification Number
 *           example: "12345678901"
 *         vin:
 *           type: string
 *           description: Voter Identification Number
 *           example: "1234567890123456789"
 *         fullName:
 *           type: string
 *           description: Full name of the voter
 *           example: "Jane Doe"
 *         phoneNumber:
 *           type: string
 *           description: Phone number
 *           example: "+2348012345678"
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: Date of birth
 *           example: "1990-01-01"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: Gender
 *           example: "Female"
 *         state:
 *           type: string
 *           description: State of residence
 *           example: "Lagos"
 *         lga:
 *           type: string
 *           description: Local Government Area
 *           example: "Ikeja"
 *         ward:
 *           type: string
 *           description: Ward
 *           example: "Ward 1"
 *         pollingUnitCode:
 *           type: string
 *           description: Assigned polling unit code
 *           example: "PU001"
 *         isVerified:
 *           type: boolean
 *           description: Whether the voter is verified
 *           example: true
 *         isActive:
 *           type: boolean
 *           description: Whether the voter account is active
 *           example: true
 *         registrationDate:
 *           type: string
 *           format: date-time
 *           description: Registration timestamp
 *           example: "2023-01-15T10:30:00Z"
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *           example: "2023-01-20T14:45:00Z"
 *     VoterUpdate:
 *       type: object
 *       properties:
 *         phoneNumber:
 *           type: string
 *           description: Updated phone number
 *           example: "+2348012345679"
 *         state:
 *           type: string
 *           description: Updated state of residence
 *           example: "Abuja"
 *         lga:
 *           type: string
 *           description: Updated Local Government Area
 *           example: "Garki"
 *         ward:
 *           type: string
 *           description: Updated ward
 *           example: "Ward 2"
 *     VoteHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Vote record ID
 *           example: "v1o2t3e4-h5i6-7890-abcd-ef1234567890"
 *         electionId:
 *           type: string
 *           format: uuid
 *           description: Election ID
 *           example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *         electionName:
 *           type: string
 *           description: Name of the election
 *           example: "Presidential Election 2023"
 *         electionType:
 *           type: string
 *           description: Type of election
 *           example: "Presidential"
 *         voteTimestamp:
 *           type: string
 *           format: date-time
 *           description: When the vote was cast
 *           example: "2023-02-25T10:30:00Z"
 *         receiptCode:
 *           type: string
 *           description: Vote receipt code for verification
 *           example: "VRC-2023-ABC123"
 *         pollingUnit:
 *           type: string
 *           description: Polling unit where vote was cast
 *           example: "Central Primary School"
 *         voteSource:
 *           type: string
 *           enum: [web, mobile, ussd, offline]
 *           description: How the vote was cast
 *           example: "mobile"
 *         isVerified:
 *           type: boolean
 *           description: Whether the vote has been verified
 *           example: true
 *     PollingUnitInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Polling unit ID
 *           example: "p1u2n3i4-t5a6-7890-abcd-ef1234567890"
 *         pollingUnitName:
 *           type: string
 *           description: Name of the polling unit
 *           example: "Central Primary School"
 *         pollingUnitCode:
 *           type: string
 *           description: Unique code for the polling unit
 *           example: "PU001"
 *         address:
 *           type: string
 *           description: Physical address
 *           example: "123 Main Street, Victoria Island"
 *         state:
 *           type: string
 *           description: State location
 *           example: "Lagos"
 *         lga:
 *           type: string
 *           description: Local Government Area
 *           example: "Ikeja"
 *         ward:
 *           type: string
 *           description: Ward within the LGA
 *           example: "Ward 1"
 *         latitude:
 *           type: number
 *           format: float
 *           description: GPS latitude
 *           example: 6.4281
 *         longitude:
 *           type: number
 *           format: float
 *           description: GPS longitude
 *           example: 3.4219
 *         registeredVoters:
 *           type: integer
 *           description: Number of registered voters
 *           example: 1500
 *         operatingHours:
 *           type: object
 *           properties:
 *             open:
 *               type: string
 *               example: "08:00"
 *             close:
 *               type: string
 *               example: "18:00"
 *         facilities:
 *           type: array
 *           items:
 *             type: string
 *           example: ["wheelchair_accessible", "parking", "restrooms"]
 *     VoteReceipt:
 *       type: object
 *       properties:
 *         receiptCode:
 *           type: string
 *           description: Unique receipt code
 *           example: "VRC-2023-ABC123"
 *         electionId:
 *           type: string
 *           format: uuid
 *           description: Election ID
 *           example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *         electionName:
 *           type: string
 *           description: Election name
 *           example: "Presidential Election 2023"
 *         voteTimestamp:
 *           type: string
 *           format: date-time
 *           description: When the vote was cast
 *           example: "2023-02-25T10:30:00Z"
 *         pollingUnit:
 *           type: string
 *           description: Polling unit name
 *           example: "Central Primary School"
 *         voteHash:
 *           type: string
 *           description: Cryptographic hash of the vote
 *           example: "a1b2c3d4e5f6789012345678901234567890abcdef"
 *         isVerified:
 *           type: boolean
 *           description: Whether the vote is verified on blockchain
 *           example: true
 *         blockchainTxId:
 *           type: string
 *           description: Blockchain transaction ID (if applicable)
 *           example: "0x1234567890abcdef"
 */

/**
 * @swagger
 * tags:
 *   name: Voter Profile
 *   description: Voter profile management endpoints
 */

/**
 * @swagger
 * tags:
 *   name: Vote History
 *   description: Voter's voting history endpoints
 */

/**
 * @swagger
 * tags:
 *   name: Polling Unit
 *   description: Polling unit information endpoints
 */

/**
 * @swagger
 * /api/v1/voter/profile:
 *   get:
 *     summary: Get voter profile
 *     description: Retrieve the authenticated voter's profile information
 *     tags: [Voter Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Voter profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/VoterProfile'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Voter profile not found
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
 *
 *   put:
 *     summary: Update voter profile
 *     description: Update the authenticated voter's profile information (limited fields)
 *     tags: [Voter Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VoterUpdate'
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: "Profile updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/VoterProfile'
 *       400:
 *         description: Invalid input data
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
 *         description: Voter not found
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
 *
 * /api/v1/voter/vote-history:
 *   get:
 *     summary: Get voter's voting history
 *     description: Retrieve the authenticated voter's complete voting history
 *     tags: [Vote History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: electionType
 *         in: query
 *         schema:
 *           type: string
 *           enum: [Presidential, Gubernatorial, Senatorial, HouseOfReps, StateAssembly, LocalGovernment]
 *         description: Filter by election type
 *       - name: year
 *         in: query
 *         schema:
 *           type: integer
 *         description: Filter by election year
 *         example: 2023
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Vote history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VoteHistory'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Unauthorized
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
 *
 * /api/v1/voter/polling-unit:
 *   get:
 *     summary: Get voter's assigned polling unit
 *     description: Retrieve information about the voter's assigned polling unit
 *     tags: [Polling Unit]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Polling unit information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PollingUnitInfo'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Polling unit not found or not assigned
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
 *
 * /api/v1/voter/verify-vote/{receiptCode}:
 *   get:
 *     summary: Verify a vote using receipt code
 *     description: Verify that a vote was properly recorded using the receipt code
 *     tags: [Vote History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: receiptCode
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Vote receipt code to verify
 *         example: "VRC-2023-ABC123"
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
 *                   $ref: '#/components/schemas/VoteReceipt'
 *                 verification:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     verificationTimestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-02-25T10:35:00Z"
 *                     blockchainConfirmed:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Vote successfully verified on blockchain"
 *       400:
 *         description: Invalid receipt code format
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
 *         description: Vote receipt not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Vote receipt not found"
 *                 verification:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: "Receipt code does not exist in our records"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/v1/voter/change-password:
 *   post:
 *     summary: Change voter password
 *     description: Change the authenticated voter's password
 *     tags: [Voter Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Current password
 *                 example: "currentPassword123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password (minimum 8 characters)
 *                 example: "newSecurePassword456"
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 description: Confirm new password
 *                 example: "newSecurePassword456"
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: "Password changed successfully"
 *       400:
 *         description: Invalid input (passwords don't match, weak password, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized or incorrect current password
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
 *
 * /api/v1/voter/deactivate-account:
 *   post:
 *     summary: Deactivate voter account
 *     description: Deactivate the authenticated voter's account (can be reactivated by admin)
 *     tags: [Voter Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - reason
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Current password for confirmation
 *                 example: "currentPassword123"
 *               reason:
 *                 type: string
 *                 description: Reason for deactivation
 *                 example: "Moving to another state"
 *     responses:
 *       200:
 *         description: Account deactivated successfully
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
 *                   example: "Account deactivated successfully"
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized or incorrect password
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
