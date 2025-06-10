import swaggerJSDoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: process.env.SWAGGER_TITLE || 'Nigeria E-Voting API',
    description:
      process.env.SWAGGER_DESCRIPTION ||
      'A secure API for the Nigerian hybrid encryption-based voting system with USSD integration',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    contact: {
      name: 'Nigeria Electoral Commission',
      url: 'https://evoting.gov.ng',
      email: 'support@evoting.gov.ng',
    },
    license: {
      name: 'Proprietary',
      url: 'https://evoting.gov.ng/license',
    },
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Development Server',
    },
    {
      url: process.env.SWAGGER_SERVER_URL,
      description: 'Production Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
          details: {
            type: 'object',
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'API endpoints for user authentication',
    },
    {
      name: 'Voter Management',
      description: 'API endpoints for voter management',
    },
    {
      name: 'Elections',
      description: 'API endpoints for election management',
    },
    {
      name: 'Voting',
      description: 'API endpoints for casting votes',
    },
    {
      name: 'Results',
      description: 'API endpoints for election results',
    },
    {
      name: 'USSD',
      description: 'API endpoints for USSD integration',
    },
    {
      name: 'Mobile Integration',
      description: 'API endpoints for mobile application integration',
    },
    {
      name: 'System Administrator',
      description: 'API endpoints for system administration',
    },
    {
      name: 'Electoral Commissioner',
      description: 'API endpoints for electoral commissioners',
    },
    {
      name: 'Security',
      description: 'API endpoints for security monitoring',
    },
  ],
  swaggerURL: '/api-docs.json',
};

// Options for the swagger docs
const options: swaggerJSDoc.Options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes/**/*.ts'],
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
