/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: Error message
 *           example: "Invalid input data"
 *         code:
 *           type: string
 *           description: Error code for programmatic handling
 *           example: "VALIDATION_ERROR"
 *         details:
 *           type: object
 *           description: Additional error details
 *           example: { "field": "email", "message": "Invalid email format" }
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Error timestamp
 *           example: "2023-02-25T10:30:00Z"
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           description: Success message
 *           example: "Operation completed successfully"
 *         data:
 *           type: object
 *           description: Response data
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Response timestamp
 *           example: "2023-02-25T10:30:00Z"
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           description: Current page number
 *           example: 1
 *         limit:
 *           type: integer
 *           description: Items per page
 *           example: 20
 *         total:
 *           type: integer
 *           description: Total number of items
 *           example: 100
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *           example: 5
 *         hasNext:
 *           type: boolean
 *           description: Whether there are more pages
 *           example: true
 *         hasPrev:
 *           type: boolean
 *           description: Whether there are previous pages
 *           example: false
 *     ValidationError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Validation failed"
 *         code:
 *           type: string
 *           example: "VALIDATION_ERROR"
 *         validationErrors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: "email"
 *               message:
 *                 type: string
 *                 example: "Email is required"
 *               value:
 *                 type: string
 *                 example: ""
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2023-02-25T10:30:00Z"
 *     UnauthorizedError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Unauthorized access"
 *         code:
 *           type: string
 *           example: "UNAUTHORIZED"
 *         message:
 *           type: string
 *           example: "Invalid or expired authentication token"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2023-02-25T10:30:00Z"
 *     ForbiddenError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Forbidden"
 *         code:
 *           type: string
 *           example: "FORBIDDEN"
 *         message:
 *           type: string
 *           example: "Insufficient permissions to access this resource"
 *         requiredRole:
 *           type: string
 *           example: "SystemAdministrator"
 *         userRole:
 *           type: string
 *           example: "ElectoralCommissioner"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2023-02-25T10:30:00Z"
 *     NotFoundError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Resource not found"
 *         code:
 *           type: string
 *           example: "NOT_FOUND"
 *         message:
 *           type: string
 *           example: "The requested resource could not be found"
 *         resourceType:
 *           type: string
 *           example: "Election"
 *         resourceId:
 *           type: string
 *           example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2023-02-25T10:30:00Z"
 *     ConflictError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Resource conflict"
 *         code:
 *           type: string
 *           example: "CONFLICT"
 *         message:
 *           type: string
 *           example: "A resource with this identifier already exists"
 *         conflictField:
 *           type: string
 *           example: "email"
 *         conflictValue:
 *           type: string
 *           example: "user@example.com"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2023-02-25T10:30:00Z"
 *     ServerError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Internal server error"
 *         code:
 *           type: string
 *           example: "INTERNAL_ERROR"
 *         message:
 *           type: string
 *           example: "An unexpected error occurred while processing your request"
 *         requestId:
 *           type: string
 *           example: "req_1234567890abcdef"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2023-02-25T10:30:00Z"
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token obtained from login endpoint
 *   parameters:
 *     PageParam:
 *       name: page
 *       in: query
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: Page number for pagination
 *     LimitParam:
 *       name: limit
 *       in: query
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 20
 *       description: Number of items per page
 *     ElectionIdParam:
 *       name: electionId
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: Election unique identifier
 *       example: "e1l2e3c4-t5i6-7890-abcd-ef1234567890"
 *     UserIdParam:
 *       name: userId
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: User unique identifier
 *       example: "u1s2e3r4-i5d6-7890-abcd-ef1234567890"
 *   responses:
 *     UnauthorizedResponse:
 *       description: Unauthorized - Invalid or missing authentication token
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnauthorizedError'
 *     ForbiddenResponse:
 *       description: Forbidden - Insufficient permissions
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForbiddenError'
 *     NotFoundResponse:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotFoundError'
 *     ValidationErrorResponse:
 *       description: Validation error - Invalid input data
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidationError'
 *     ConflictResponse:
 *       description: Conflict - Resource already exists
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConflictError'
 *     ServerErrorResponse:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServerError'
 */ 
