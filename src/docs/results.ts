/**
 * @swagger
 * components:
 *   schemas:
 *     ElectionStatistics:
 *       type: object
 *       properties:
 *         electionId:
 *           type: string
 *           format: uuid
 *           description: Election unique identifier
 *           example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *         electionName:
 *           type: string
 *           description: Name of the election
 *           example: "Presidential Election 2023"
 *         electionType:
 *           type: string
 *           description: Type of election
 *           example: "Presidential"
 *         status:
 *           type: string
 *           enum: [draft, scheduled, active, completed, cancelled]
 *           description: Current election status
 *           example: "completed"
 *         totalRegisteredVoters:
 *           type: integer
 *           description: Total number of registered voters
 *           example: 95000000
 *         totalVotesCast:
 *           type: integer
 *           description: Total number of votes cast
 *           example: 28000000
 *         turnoutPercentage:
 *           type: number
 *           format: float
 *           description: Voter turnout percentage
 *           example: 29.47
 *         validVotes:
 *           type: integer
 *           description: Number of valid votes
 *           example: 27500000
 *         invalidVotes:
 *           type: integer
 *           description: Number of invalid votes
 *           example: 500000
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2023-02-25T20:30:00Z"
 *         candidateResults:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               candidateId:
 *                 type: string
 *                 format: uuid
 *                 example: "c1a2n3d4-i5d6-7890-abcd-ef1234567890"
 *               candidateName:
 *                 type: string
 *                 example: "John Presidential Candidate"
 *               partyName:
 *                 type: string
 *                 example: "All Progressives Congress"
 *               partyCode:
 *                 type: string
 *                 example: "APC"
 *               votes:
 *                 type: integer
 *                 example: 15000000
 *               percentage:
 *                 type: number
 *                 format: float
 *                 example: 54.55
 *               position:
 *                 type: integer
 *                 description: Ranking position (1st, 2nd, etc.)
 *                 example: 1
 *         regionalBreakdown:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 example: "Lagos"
 *               registeredVoters:
 *                 type: integer
 *                 example: 7000000
 *               votesCast:
 *                 type: integer
 *                 example: 2500000
 *               turnoutPercentage:
 *                 type: number
 *                 format: float
 *                 example: 35.71
 *               leadingCandidate:
 *                 type: string
 *                 example: "John Presidential Candidate"
 *               leadingParty:
 *                 type: string
 *                 example: "APC"
 *     RealTimeUpdate:
 *       type: object
 *       properties:
 *         electionId:
 *           type: string
 *           format: uuid
 *           description: Election ID
 *           example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Update timestamp
 *           example: "2023-02-25T15:30:00Z"
 *         totalVotesCast:
 *           type: integer
 *           description: Current total votes cast
 *           example: 15000000
 *         turnoutPercentage:
 *           type: number
 *           format: float
 *           description: Current turnout percentage
 *           example: 15.79
 *         pollingUnitsReported:
 *           type: integer
 *           description: Number of polling units that have reported
 *           example: 75000
 *         totalPollingUnits:
 *           type: integer
 *           description: Total number of polling units
 *           example: 176000
 *         reportingPercentage:
 *           type: number
 *           format: float
 *           description: Percentage of polling units reported
 *           example: 42.61
 *         leadingCandidate:
 *           type: object
 *           properties:
 *             candidateId:
 *               type: string
 *               format: uuid
 *               example: "c1a2n3d4-i5d6-7890-abcd-ef1234567890"
 *             candidateName:
 *               type: string
 *               example: "John Presidential Candidate"
 *             partyName:
 *               type: string
 *               example: "All Progressives Congress"
 *             votes:
 *               type: integer
 *               example: 8500000
 *             percentage:
 *               type: number
 *               format: float
 *               example: 56.67
 *         recentUpdates:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               pollingUnitCode:
 *                 type: string
 *                 example: "PU001"
 *               pollingUnitName:
 *                 type: string
 *                 example: "Central Primary School"
 *               state:
 *                 type: string
 *                 example: "Lagos"
 *               votesCast:
 *                 type: integer
 *                 example: 1500
 *               reportedAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-02-25T15:25:00Z"
 *     RegionalStatistics:
 *       type: object
 *       properties:
 *         region:
 *           type: string
 *           description: Region name (state/zone)
 *           example: "Lagos State"
 *         electionId:
 *           type: string
 *           format: uuid
 *           description: Election ID
 *           example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *         totalPollingUnits:
 *           type: integer
 *           description: Total polling units in region
 *           example: 8500
 *         reportedPollingUnits:
 *           type: integer
 *           description: Polling units that have reported
 *           example: 7200
 *         reportingPercentage:
 *           type: number
 *           format: float
 *           description: Percentage of units reported
 *           example: 84.71
 *         registeredVoters:
 *           type: integer
 *           description: Total registered voters in region
 *           example: 7000000
 *         votesCast:
 *           type: integer
 *           description: Total votes cast in region
 *           example: 2500000
 *         turnoutPercentage:
 *           type: number
 *           format: float
 *           description: Voter turnout percentage
 *           example: 35.71
 *         candidateResults:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               candidateId:
 *                 type: string
 *                 format: uuid
 *                 example: "c1a2n3d4-i5d6-7890-abcd-ef1234567890"
 *               candidateName:
 *                 type: string
 *                 example: "John Presidential Candidate"
 *               partyName:
 *                 type: string
 *                 example: "All Progressives Congress"
 *               votes:
 *                 type: integer
 *                 example: 1400000
 *               percentage:
 *                 type: number
 *                 format: float
 *                 example: 56.0
 *         lgaBreakdown:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               lga:
 *                 type: string
 *                 example: "Ikeja"
 *               pollingUnits:
 *                 type: integer
 *                 example: 250
 *               registeredVoters:
 *                 type: integer
 *                 example: 300000
 *               votesCast:
 *                 type: integer
 *                 example: 120000
 *               turnoutPercentage:
 *                 type: number
 *                 format: float
 *                 example: 40.0
 *               leadingCandidate:
 *                 type: string
 *                 example: "John Presidential Candidate"
 */

/**
 * @swagger
 * tags:
 *   name: Election Results
 *   description: Election results and statistics endpoints
 */

/**
 * @swagger
 * tags:
 *   name: Real-time Updates
 *   description: Real-time election updates endpoints
 */

/**
 * @swagger
 * tags:
 *   name: Regional Results
 *   description: Regional election results endpoints
 */

/**
 * @swagger
 * /api/v1/results/elections/{electionId}/statistics:
 *   get:
 *     summary: Get election statistics
 *     description: Retrieve comprehensive statistics for a specific election
 *     tags: [Election Results]
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Election ID
 *         example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *       - name: includeRegional
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include regional breakdown in results
 *       - name: includeCandidates
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include candidate results
 *     responses:
 *       200:
 *         description: Election statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ElectionStatistics'
 *       400:
 *         description: Invalid election ID format
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
 * /api/v1/results/elections/{electionId}/real-time:
 *   get:
 *     summary: Get real-time election updates
 *     description: Retrieve real-time updates for an ongoing election
 *     tags: [Real-time Updates]
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Election ID
 *         example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *       - name: includeRecent
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include recent polling unit updates
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Number of recent updates to include
 *     responses:
 *       200:
 *         description: Real-time updates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RealTimeUpdate'
 *       400:
 *         description: Invalid election ID or parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Election not found or not active
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
 * /api/v1/results/elections/{electionId}/regions/{region}:
 *   get:
 *     summary: Get regional election statistics
 *     description: Retrieve detailed statistics for a specific region in an election
 *     tags: [Regional Results]
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Election ID
 *         example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *       - name: region
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Region name (state)
 *         example: "Lagos"
 *       - name: includeLGA
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include LGA breakdown
 *       - name: includeWards
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include ward-level breakdown
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
 *                   $ref: '#/components/schemas/RegionalStatistics'
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Election or region not found
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
 * /api/v1/results/elections:
 *   get:
 *     summary: Get results for all elections
 *     description: Retrieve a summary of results for all elections
 *     tags: [Election Results]
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [completed, active, all]
 *           default: completed
 *         description: Filter elections by status
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
 *         description: Number of elections per page
 *     responses:
 *       200:
 *         description: Election results retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       electionId:
 *                         type: string
 *                         format: uuid
 *                         example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *                       electionName:
 *                         type: string
 *                         example: "Presidential Election 2023"
 *                       electionType:
 *                         type: string
 *                         example: "Presidential"
 *                       status:
 *                         type: string
 *                         example: "completed"
 *                       totalVotesCast:
 *                         type: integer
 *                         example: 28000000
 *                       turnoutPercentage:
 *                         type: number
 *                         format: float
 *                         example: 29.47
 *                       winner:
 *                         type: object
 *                         properties:
 *                           candidateName:
 *                             type: string
 *                             example: "John Presidential Candidate"
 *                           partyName:
 *                             type: string
 *                             example: "All Progressives Congress"
 *                           votes:
 *                             type: integer
 *                             example: 15000000
 *                           percentage:
 *                             type: number
 *                             format: float
 *                             example: 54.55
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-02-25T18:00:00Z"
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
 *       400:
 *         description: Invalid query parameters
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
