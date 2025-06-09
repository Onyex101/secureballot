/**
 * @swagger
 * components:
 *   schemas:
 *     Election:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - startDate
 *         - endDate
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Election unique identifier
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         name:
 *           type: string
 *           description: Election name
 *           example: "Presidential Election 2023"
 *         description:
 *           type: string
 *           description: Detailed description
 *           example: "Nigeria Presidential Election for 2023"
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Start date and time
 *           example: "2023-02-25T08:00:00Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: End date and time
 *           example: "2023-02-25T18:00:00Z"
 *         type:
 *           type: string
 *           enum: [presidential, gubernatorial, senate, house, local]
 *           description: Type of election
 *           example: "presidential"
 *         status:
 *           type: string
 *           enum: [draft, scheduled, active, completed, cancelled]
 *           description: Current status
 *           example: "scheduled"
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: Admin who created the election
 *           example: "b2c3d4e5-f6a7-8901-bcde-f1234567890a"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2023-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2023-01-20T14:45:00Z"
 *     Candidate:
 *       type: object
 *       required:
 *         - name
 *         - party
 *         - electionId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Candidate unique identifier
 *           example: "c3d4e5f6-a7b8-9012-cdef-g1234567890h"
 *         name:
 *           type: string
 *           description: Candidate full name
 *           example: "John Doe"
 *         party:
 *           type: string
 *           description: Political party
 *           example: "National Democratic Party"
 *         image:
 *           type: string
 *           description: URL to candidate photo
 *           example: "https://example.com/images/candidates/john_doe.jpg"
 *         bio:
 *           type: string
 *           description: Brief biography
 *           example: "John Doe is a seasoned politician with 20 years of public service."
 *         electionId:
 *           type: string
 *           format: uuid
 *           description: Associated election ID
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     ElectionResults:
 *       type: object
 *       properties:
 *         electionId:
 *           type: string
 *           format: uuid
 *           description: Election ID
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         electionName:
 *           type: string
 *           description: Election name
 *           example: "Presidential Election 2023"
 *         totalVotes:
 *           type: integer
 *           description: Total votes cast
 *           example: 15000000
 *         candidates:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 example: "c3d4e5f6-a7b8-9012-cdef-g1234567890h"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               party:
 *                 type: string
 *                 example: "National Democratic Party"
 *               votes:
 *                 type: integer
 *                 example: 8500000
 *               percentage:
 *                 type: number
 *                 format: float
 *                 example: 56.67
 */
/**
 * @swagger
 * tags:
 *   name: Elections
 *   description: Election management endpoints
 */
/**
 * @swagger
 * /api/v1/elections:
 *   get:
 *     summary: Get all elections
 *     description: Retrieve a list of all elections
 *     tags: [Elections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, scheduled, active, completed, cancelled]
 *         description: Filter by election status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [presidential, gubernatorial, senate, house, local]
 *         description: Filter by election type
 *     responses:
 *       200:
 *         description: List of elections
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
 *                     $ref: '#/components/schemas/Election'
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
 *   post:
 *     summary: Create new election
 *     description: Create a new election (admin only)
 *     tags: [Elections]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Election'
 *     responses:
 *       201:
 *         description: Election created successfully
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
 *                   $ref: '#/components/schemas/Election'
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
 *       403:
 *         description: Forbidden - requires admin privileges
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
 * /api/v1/elections/{id}:
 *   get:
 *     summary: Get election by ID
 *     description: Retrieve detailed information about an election
 *     tags: [Elections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Election ID
 *     responses:
 *       200:
 *         description: Election details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Election'
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
 *
 *   put:
 *     summary: Update election
 *     description: Update an existing election (admin only)
 *     tags: [Elections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             $ref: '#/components/schemas/Election'
 *     responses:
 *       200:
 *         description: Election updated successfully
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
 *                   example: "Election updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Election'
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
 *       403:
 *         description: Forbidden - requires admin privileges
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
 *
 *   delete:
 *     summary: Delete election
 *     description: Delete an election (admin only)
 *     tags: [Elections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Election ID
 *     responses:
 *       200:
 *         description: Election deleted successfully
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
 *                   example: "Election deleted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - requires admin privileges
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
 * /api/v1/elections/{id}/candidates:
 *   get:
 *     summary: Get candidates for an election
 *     description: Retrieve all candidates for a specific election
 *     tags: [Elections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Election ID
 *     responses:
 *       200:
 *         description: List of candidates
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
 *                     $ref: '#/components/schemas/Candidate'
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
 * /api/v1/elections/{id}/results:
 *   get:
 *     summary: Get election results
 *     description: Retrieve results for a completed election
 *     tags: [Elections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Election ID
 *     responses:
 *       200:
 *         description: Election results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ElectionResults'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Election results not yet available
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
