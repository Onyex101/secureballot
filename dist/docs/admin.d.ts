/**
 * @swagger
 * components:
 *   schemas:
 *     AdminUser:
 *       type: object
 *       required:
 *         - email
 *         - fullName
 *         - phoneNumber
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Admin user unique identifier
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *           example: "admin@securevote.com"
 *         fullName:
 *           type: string
 *           description: Full name of the admin
 *           example: "John Admin"
 *         phoneNumber:
 *           type: string
 *           description: Phone number
 *           example: "+2348012345678"
 *         role:
 *           type: string
 *           enum: [SystemAdministrator, ElectoralCommissioner, SecurityOfficer, SystemAuditor, RegionalElectoralOfficer, ElectionManager, ResultVerificationOfficer]
 *           description: Admin role
 *           example: "ElectoralCommissioner"
 *         isActive:
 *           type: boolean
 *           description: Whether the admin is active
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2023-01-15T10:30:00Z"
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *           example: "2023-01-20T14:45:00Z"
 *     AdminUserCreate:
 *       type: object
 *       required:
 *         - email
 *         - fullName
 *         - phoneNumber
 *         - password
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *           example: "admin@securevote.com"
 *         fullName:
 *           type: string
 *           description: Full name of the admin
 *           example: "John Admin"
 *         phoneNumber:
 *           type: string
 *           description: Phone number
 *           example: "+2348012345678"
 *         password:
 *           type: string
 *           format: password
 *           description: Admin password
 *           example: "SecurePass123!"
 *         role:
 *           type: string
 *           enum: [SystemAdministrator, ElectoralCommissioner, SecurityOfficer, SystemAuditor, RegionalElectoralOfficer, ElectionManager, ResultVerificationOfficer]
 *           description: Admin role
 *           example: "ElectoralCommissioner"
 *     PollingUnit:
 *       type: object
 *       required:
 *         - pollingUnitName
 *         - pollingUnitCode
 *         - address
 *         - state
 *         - lga
 *         - ward
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Polling unit unique identifier
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
 *         assignedOfficer:
 *           type: string
 *           format: uuid
 *           description: ID of assigned officer
 *           example: "o1f2f3i4-c5e6-7890-abcd-ef1234567890"
 *         isActive:
 *           type: boolean
 *           description: Whether the polling unit is active
 *           example: true
 *     VerificationRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Verification request ID
 *           example: "v1e2r3i4-f5y6-7890-abcd-ef1234567890"
 *         userId:
 *           type: string
 *           format: uuid
 *           description: Voter ID
 *           example: "u1s2e3r4-i5d6-7890-abcd-ef1234567890"
 *         voterName:
 *           type: string
 *           description: Voter's full name
 *           example: "Jane Doe"
 *         nin:
 *           type: string
 *           description: National Identification Number
 *           example: "12345678901"
 *         vin:
 *           type: string
 *           description: Voter Identification Number
 *           example: "1234567890123456789"
 *         phoneNumber:
 *           type: string
 *           description: Phone number
 *           example: "+2348012345678"
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           description: Verification status
 *           example: "pending"
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: Submission timestamp
 *           example: "2023-01-15T10:30:00Z"
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Audit log entry ID
 *           example: "a1u2d3i4-t5l6-7890-abcd-ef1234567890"
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User who performed the action
 *           example: "u1s2e3r4-i5d6-7890-abcd-ef1234567890"
 *         actionType:
 *           type: string
 *           description: Type of action performed
 *           example: "VOTE_CAST"
 *         actionTimestamp:
 *           type: string
 *           format: date-time
 *           description: When the action occurred
 *           example: "2023-01-15T10:30:00Z"
 *         ipAddress:
 *           type: string
 *           description: IP address of the user
 *           example: "192.168.1.100"
 *         userAgent:
 *           type: string
 *           description: User agent string
 *           example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
 *         actionDetails:
 *           type: object
 *           description: Additional details about the action
 *         isSuspicious:
 *           type: boolean
 *           description: Whether the action is flagged as suspicious
 *           example: false
 */
/**
 * @swagger
 * tags:
 *   name: Admin Management
 *   description: Admin user management endpoints
 */
/**
 * @swagger
 * tags:
 *   name: Electoral Commissioner
 *   description: Electoral Commissioner specific endpoints
 */
/**
 * @swagger
 * tags:
 *   name: Security Officer
 *   description: Security Officer specific endpoints
 */
/**
 * @swagger
 * tags:
 *   name: System Auditor
 *   description: System Auditor specific endpoints
 */
/**
 * @swagger
 * tags:
 *   name: Verification
 *   description: Voter verification management endpoints
 */
/**
 * @swagger
 * tags:
 *   name: Regional Management
 *   description: Regional management endpoints
 */
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
 *           enum: [SystemAdministrator, ElectoralCommissioner, SecurityOfficer, SystemAuditor, RegionalElectoralOfficer, ElectionManager, ResultVerificationOfficer]
 *         description: Filter by admin role
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of admin users returned
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
 *                     $ref: '#/components/schemas/AdminUser'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     total:
 *                       type: integer
 *                       example: 25
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a System Admin
 *
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
 *             $ref: '#/components/schemas/AdminUserCreate'
 *     responses:
 *       201:
 *         description: Admin user created successfully
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
 *                   example: "Admin user created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AdminUser'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a System Admin
 *       409:
 *         description: User with this email already exists
 *
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get admin user by ID (System Admin only)
 *     tags: [Admin Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin user ID
 *     responses:
 *       200:
 *         description: Admin user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AdminUser'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a System Admin
 *       404:
 *         description: Admin user not found
 *
 *   put:
 *     summary: Update admin user (System Admin only)
 *     tags: [Admin Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "John Updated Admin"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345679"
 *               role:
 *                 type: string
 *                 enum: [SystemAdministrator, ElectoralCommissioner, SecurityOfficer, SystemAuditor, RegionalElectoralOfficer, ElectionManager, ResultVerificationOfficer]
 *                 example: "SecurityOfficer"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Admin user updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a System Admin
 *       404:
 *         description: Admin user not found
 *
 *   delete:
 *     summary: Delete admin user (System Admin only)
 *     tags: [Admin Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin user ID
 *     responses:
 *       200:
 *         description: Admin user deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a System Admin
 *       404:
 *         description: Admin user not found
 *
 * /api/v1/admin/elections:
 *   post:
 *     summary: Create a new election
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
 *                 example: "Presidential Election 2024"
 *               electionType:
 *                 type: string
 *                 enum: [Presidential, Gubernatorial, Senatorial, HouseOfReps, StateAssembly, LocalGovernment]
 *                 example: "Presidential"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-02-25T08:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-02-25T18:00:00Z"
 *               description:
 *                 type: string
 *                 example: "Nigeria Presidential Election for 2024"
 *               eligibilityRules:
 *                 type: object
 *                 description: Rules for voter eligibility
 *     responses:
 *       201:
 *         description: Election created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Election with overlapping dates already exists
 *
 * /api/v1/admin/elections/{id}/candidates:
 *   post:
 *     summary: Add candidate to election
 *     tags: [Electoral Commissioner]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Election ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - partyCode
 *               - partyName
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "John Presidential Candidate"
 *               partyCode:
 *                 type: string
 *                 example: "APC"
 *               partyName:
 *                 type: string
 *                 example: "All Progressives Congress"
 *               bio:
 *                 type: string
 *                 example: "Experienced politician with 20 years of service"
 *               photoUrl:
 *                 type: string
 *                 example: "https://example.com/candidate-photo.jpg"
 *               position:
 *                 type: string
 *                 example: "President"
 *               manifesto:
 *                 type: string
 *                 example: "Our vision for a better Nigeria"
 *     responses:
 *       201:
 *         description: Candidate added successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Election not found
 *       409:
 *         description: Candidate already exists for this party
 *
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get audit logs (Security Officer only)
 *     tags: [Security Officer]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - name: actionType
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter from date
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter to date
 *       - name: suspicious
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter suspicious activities only
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
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
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     total:
 *                       type: integer
 *                       example: 1000
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Security Officer
 *
 * /api/v1/admin/security/suspicious-activities:
 *   get:
 *     summary: Get suspicious activities (Security Officer only)
 *     tags: [Security Officer]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: severity
 *         in: query
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity level
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Suspicious activities retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Security Officer
 *
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
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of pending verification requests returned
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
 *                     $ref: '#/components/schemas/VerificationRequest'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     total:
 *                       type: integer
 *                       example: 25
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Voter Registration Officer
 *
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
 *         description: Verification request ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "All documents verified successfully"
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
 *
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
 *         description: Verification request ID
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
 *                 example: "Invalid NIN provided"
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
 *
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
 *         description: State name
 *       - name: lga
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by LGA
 *       - name: ward
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by ward
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Polling units retrieved successfully
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
 *                     $ref: '#/components/schemas/PollingUnit'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     total:
 *                       type: integer
 *                       example: 150
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Regional Officer
 *
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
 *                 example: "Central Primary School"
 *               pollingUnitCode:
 *                 type: string
 *                 example: "PU001"
 *               address:
 *                 type: string
 *                 example: "123 Main Street, Victoria Island"
 *               state:
 *                 type: string
 *                 example: "Lagos"
 *               lga:
 *                 type: string
 *                 example: "Ikeja"
 *               ward:
 *                 type: string
 *                 example: "Ward 1"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 6.4281
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 3.4219
 *     responses:
 *       201:
 *         description: Polling unit created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Regional Officer
 *
 * /api/v1/admin/polling-units/{pollingUnitId}:
 *   put:
 *     summary: Update polling unit (Regional Officer only)
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
 *         description: Polling unit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pollingUnitName:
 *                 type: string
 *                 example: "Updated Primary School"
 *               address:
 *                 type: string
 *                 example: "456 New Street, Victoria Island"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 6.4281
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 3.4219
 *               isActive:
 *                 type: boolean
 *                 example: true
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
 *
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
 *         description: State name
 *       - name: electionId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by election ID
 *     responses:
 *       200:
 *         description: Regional statistics retrieved successfully
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
 *                     state:
 *                       type: string
 *                       example: "Lagos"
 *                     totalPollingUnits:
 *                       type: integer
 *                       example: 150
 *                     totalRegisteredVoters:
 *                       type: integer
 *                       example: 500000
 *                     totalVotesCast:
 *                       type: integer
 *                       example: 350000
 *                     turnoutPercentage:
 *                       type: number
 *                       format: float
 *                       example: 70.0
 *                     lgaBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           lga:
 *                             type: string
 *                             example: "Ikeja"
 *                           pollingUnits:
 *                             type: integer
 *                             example: 25
 *                           registeredVoters:
 *                             type: integer
 *                             example: 75000
 *                           votesCast:
 *                             type: integer
 *                             example: 52500
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a Regional Officer
 */
