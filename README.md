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
npx sequelize-cli migration:generate --name add-new-table
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

## API Documentation

The API documentation is automatically generated using Swagger/OpenAPI.

1. Generate the latest documentation:

```bash
npm run swagger-autogen
```

2. Access the documentation at:
   - `http://localhost:5000/api-docs` (when the server is running)

## Testing

### Running Tests

Run all tests:

```bash
npm test
```

Run specific test types:

```bash
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e        # End-to-end tests only
```

Generate test coverage report:

```bash
npm run test:coverage
```

## Project Structure

```
secureballot/
├── src/                      # Source directory
│   ├── config/               # Configuration files
│   ├── controllers/          # API route controllers
│   ├── db/                   # Database-related files
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

### Docker Deployment (Alternative)

1. Build the Docker image:

```bash
docker build -t secureballot .
```

2. Run the container:

```bash
docker run -p 5000:5000 --env-file .env secureballot
```

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
