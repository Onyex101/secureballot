# SecureBallot (Nigerian E-Voting API)

A secure, scalable electronic voting system API designed for Nigerian elections with support for web, mobile, and USSD voting channels.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Docker Setup](#docker-setup)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Overview

The Nigerian E-Voting API is a comprehensive backend system that enables secure electronic voting through multiple channels. It incorporates hybrid encryption, multi-factor authentication, and extensive audit logging to ensure the integrity of the electoral process.

## Features

- Multi-channel voting (Web, Mobile, USSD)
- Secure voter authentication and verification
- Election and candidate management
- Hybrid encryption for vote data
- Real-time election results and statistics
- Comprehensive admin dashboard
- Role-based access control
- Extensive audit logging

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) v18.x or higher
- [npm](https://www.npmjs.com/) v9.x or higher
- [PostgreSQL](https://www.postgresql.org/) v14.x or higher
- [TypeScript](https://www.typescriptlang.org/) v5.x or higher
- [Git](https://git-scm.com/)

For Docker deployment:
- [Docker](https://www.docker.com/) v20.x or higher
- [Docker Compose](https://docs.docker.com/compose/) v2.x or higher

## Installation

1. Clone the repository:

```bash
git clone https://github.com/Onyex101/secureballot.git
cd secureballot
```

2. Install dependencies:

```bash
npm install
```

3. Create environment files:

```bash
cp .env.example .env
```

4. Edit the `.env` file with your configuration (see [Configuration](#configuration) section).

## Database Setup

1. Create the PostgreSQL databases:

```bash
npm run db:create
```

This script will create both the main and test databases as configured in your `.env` file.

2. Run the database migrations:

```bash
npm run db:migrate
```

3. (Optional) Seed the database with sample data for development:

```bash
npm run db:seed
```

### Working with Migrations

Database migrations help you manage changes to your database schema over time. Here's how to work with them:

#### Creating a New Migration

To create a new migration file:

```bash
npx sequelize-cli migration:generate --name add-new-table --migrations-path src/db/migrations
```

This will create a new migration file in the `src/db/migrations` directory with a timestamp prefix.

#### Structure of a Migration File

Each migration file contains `up` and `down` methods:
- `up`: Specifies changes to apply to the database
- `down`: Specifies how to revert those changes

Example migration file:

```typescript
import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('example_table', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('example_table');
  },
};
```

#### Running Migrations

To run all pending migrations:

```bash
npm run db:migrate
```

#### Reverting Migrations

To undo the most recent migration:

```bash
npm run db:migrate:undo
```

To undo all migrations:

```bash
npm run db:migrate:undo:all
```

To undo migrations to a specific point:

```bash
npx sequelize-cli db:migrate:undo:all --to XXXXXXXXXXXXXX-migration-name.js
```

#### Migration Status

To check the status of migrations:

```bash
npx sequelize-cli db:migrate:status
```

This shows which migrations have been applied and which are pending.

## Configuration

Configure the application by editing the `.env` file. Here are the key configuration options:

### Server Configuration
```
NODE_ENV=development
PORT=5000
API_VERSION=v1
API_PREFIX=/api
CORS_ORIGIN=*
```

### Database Configuration
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_ballot
DB_NAME_TEST=secure_ballot_test
DB_USER=postgres
DB_PASSWORD=your_db_password
```

### Authentication Configuration
```
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d
MFA_SECRET=your_mfa_secret_key
```

### Encryption Configuration
```
RSA_KEY_SIZE=4096
AES_KEY_SIZE=256
SHAMIR_THRESHOLD=3
SHAMIR_SHARES=5
```

### USSD and SMS Configuration (if applicable)
```
USSD_PROVIDER=africas_talking
USSD_API_KEY=your_africas_talking_api_key
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

## Running the Application

### Development Mode

Run the application in development mode with hot reload:

```bash
npm run dev
```

### Production Build

1. Build the TypeScript code:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

## Docker Setup

SecureBallot can be run using Docker, which simplifies deployment and ensures consistency across different environments.

### Prerequisites

- [Docker](https://www.docker.com/) (v20.x or higher)
- [Docker Compose](https://docs.docker.com/compose/) (v2.x or higher)

### Running with Docker Compose

1. Clone the repository:

```bash
git clone https://github.com/Onyex101/secureballot.git
cd secureballot
```

2. Start the application and database:

```bash
docker-compose up -d
```

This will:
- Build the application container using the provided Dockerfile
- Start a PostgreSQL database container
- Set up the necessary network between containers
- Create persistent volumes for logs and database data

3. Access the application at `http://localhost:5000`

### Running Database Migrations

To run database migrations in the Docker environment:

```bash
# Using the standard migration command (may require SSL)
docker-compose exec app npm run db:migrate

# For environments without SSL support (recommended for Docker)
docker-compose exec app npm run db:migrate:nossl
```

The `db:migrate:nossl` script explicitly disables SSL when connecting to the database, which is ideal for Docker environments where SSL is typically not required for database connections.

### Seeding the Database

To seed the database with sample data:

```bash
# Using the standard seed command (may require SSL)
docker-compose exec app npm run db:seed

# For environments without SSL support (recommended for Docker)
docker-compose exec app npm run db:seed:nossl

# For a smaller dataset without SSL (faster, recommended for development)
docker-compose exec app npm run db:seed:small:nossl
```

If you encounter SSL connection errors when running seeds, use the commands with `:nossl` suffix which disable SSL for the database connection. The `db:seed:small:nossl` command is particularly useful for quick development setups as it creates a minimal dataset.

### Viewing Application Logs

To view the application logs:

```bash
docker-compose logs -f app
```

### Stopping the Application

To stop the running containers:

```bash
docker-compose down
```

To stop the containers and remove all data (including the database volume):

```bash
docker-compose down -v
```

### Docker Configuration

The Docker setup consists of the following files:

- `Dockerfile`: Defines how the application image is built
- `docker-compose.yml`: Defines the services, networks, and volumes
- `.dockerignore`: Specifies which files should be excluded from the Docker build

The default setup is configured for production use. To use in development mode, adjust the environment variables in the `docker-compose.yml` file.

## API Documentation

The API documentation is automatically generated using Swagger/OpenAPI.

1. Generate the latest documentation:

```bash
npm run swagger-autogen
```

2. Access the documentation at:
   - `http://localhost:5000/api-docs` (when the server is running)

## Testing

SecureBallot includes comprehensive test suites for unit tests, integration tests, and end-to-end (E2E) tests.

### Test Types

#### Unit Tests

Unit tests verify individual functions and components in isolation, typically using mocks and stubs for dependencies. Our unit tests focus on business logic in service layers.

**Example:**
```javascript
// Testing the login function in the authService
it('should login a voter successfully without MFA', async () => {
  // Mock dependencies
  const findVoterStub = sandbox.stub(voterModel, 'findVoterByIdentifier').resolves(voter);
  const compareStub = sandbox.stub(bcrypt, 'compare').resolves(true);
  
  // Test the function
  const result = await authService.login(loginData);
  
  // Assertions
  expect(result).to.have.property('token');
  expect(result).to.have.property('mfaRequired', false);
});
```

#### Integration Tests

Integration tests verify that different components work together correctly. Our integration tests focus on API routes and controllers, testing how they interact with services and return proper responses.

**Example:**
```javascript
// Testing the elections API route
it('should return a list of elections', async () => {
  // Make actual API request
  const response = await request(app)
    .get('/api/v1/elections')
    .set('Authorization', `Bearer ${authToken}`)
    .query({ status: 'active' });
  
  // Assertions
  expect(response.status).to.equal(200);
  expect(response.body).to.have.property('elections');
});
```

#### End-to-End Tests

E2E tests verify entire user flows from start to finish, simulating real user behavior. Our E2E tests cover full voter journeys from registration to voting and viewing results.

**Example:**
```javascript
// Testing the full voter flow
it('should register a new voter', async () => {
  // Make registration request with test data
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(data);
  
  // Assertions
  expect(response.status).to.equal(201);
  expect(response.body).to.have.property('userId');
});

// More tests follow for login, voting, etc.
```

### Test Structure

```
tests/
├── api-test-data.json           # Test data for API routes
├── api-tests.js                 # Basic API tests
├── generate-test-data.js        # Script to generate test data
├── e2e/                         # End-to-end test suites
│   ├── config.js                # E2E test configuration
│   ├── data/                    # Test data directory
│   ├── index.js                 # Main E2E test runner
│   ├── setup.js                 # Test setup and teardown
│   ├── tests/                   # Test files
│   │   ├── auth.test.js         # Authentication flow tests
│   │   ├── elections.test.js    # Elections flow tests
│   │   ├── mobile.test.js       # Mobile app flow tests
│   │   └── ussd.test.js         # USSD flow tests
│   └── utils/                   # Utility functions
├── integration/                 # Integration test suites
│   └── electionRoutes.test.js   # Tests election API routes
└── unit/                        # Unit test suites
    └── authService.test.js      # Tests authentication service functions
```

### Running Tests

#### Prerequisites

- Node.js 16+ and npm
- MongoDB instance running
- Environment variables configured in `.env` file or test environment

#### Running All Tests

```bash
npm test
```

#### Running Specific Test Suites

```bash
# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e
```

#### Running End-to-End Tests

For more granular control of E2E tests:

```bash
# Run all E2E tests
npm run e2e

# Run only authentication tests
npm run e2e:auth

# Run only election tests
npm run e2e:elections

# Run only USSD tests
npm run e2e:ussd

# Run only mobile app tests
npm run e2e:mobile

# Run all E2E tests in staging environment
npm run e2e:staging
```

#### Running Test Coverage

Generate a test coverage report:

```bash
npm run test:coverage
```

This will generate a coverage report in the `coverage/` directory, showing which parts of the codebase are well-tested and which need more attention.

### Test Data Generation

SecureBallot includes a test data generator that can create realistic test data:

- Voters with realistic Nigerian information
- Elections with appropriate types and statuses
- Candidates with party affiliations
- Polling units with geographic data
- Admin users with different roles

Run the test data generator with:

```bash
node tests/generate-test-data.js
```

### CI/CD Integration

Our tests are automatically run in the CI/CD pipeline. See the `.github/workflows/test.yml` file for details on our GitHub Actions configuration.

## Project Structure

```
secureballot/
├── src/                      # Source directory
│   ├── config/               # Configuration files
│   │   ├── models/           # Sequelize models
│   │   ├── migrations/       # Database migrations
│   │   └── seeders/          # Seed data for development
│   ├── middleware/           # Express middleware
│   ├── routes/               # API route definitions
│   ├── services/             # Business logic services
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   ├── docs/                 # API documentation
│   ├── scripts/              # Utility scripts
│   ├── app.ts                # Express app setup
│   └── server.ts             # Server entry point
├── tests/                    # Test files
├── dist/                     # Compiled JavaScript output
├── .env.example              # Example environment variables
├── Dockerfile                # Docker container definition
├── docker-compose.yml        # Docker Compose configuration
├── .dockerignore             # Docker build exclusions
├── package.json              # npm package configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

## Deployment

### Prerequisites for Deployment

- Node.js runtime environment
- PostgreSQL database server
- Properly configured environment variables

### Deployment Steps

1. Clone the repository on your server
2. Install dependencies with `npm install --production`
3. Configure environment variables for production
4. Build the application with `npm run build`
5. Set up a process manager like PM2:

```bash
npm install -g pm2
pm2 start dist/server.js --name "secureballot"
```

6. Set up a reverse proxy (nginx/Apache) to forward requests to the application port

### Docker Deployment

The simplest way to deploy SecureBallot is using Docker:

1. Clone the repository on your server
2. Create a production `.env` file with appropriate settings
3. Run the application using Docker Compose:

```bash
docker-compose up -d
```

4. Set up a reverse proxy (nginx/Apache) to forward requests to port 5000

For production environments, you might want to customize the `docker-compose.yml` file to:
- Add environment-specific variables
- Set up additional security measures
- Configure monitoring and logging solutions
- Set up a production-ready database with appropriate resources

## Security Considerations

- Always use HTTPS in production
- Regularly rotate JWT secrets and encryption keys
- Enable rate limiting for all endpoints
- Implement proper IP blocking for suspicious activities
- Keep all dependencies updated

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Contact

For any inquiries, please contact the development team at support@evoting.gov.ng.
