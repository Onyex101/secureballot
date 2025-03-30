# SecureBallot E2E Tests

This directory contains end-to-end (E2E) tests for the SecureBallot application. These tests verify that all components of the system work together correctly from a user's perspective.

## Structure

```
tests/e2e/
├── config.js                 # Configuration for E2E tests
├── data/                     # Test data directory
│   ├── api-endpoints.json    # API endpoints definition
│   └── generated/            # Generated test data (created at runtime)
├── index.js                  # Main test runner
├── setup.js                  # Test setup and teardown
├── tests/                    # Test files
│   ├── auth.test.js          # Authentication flow tests
│   ├── elections.test.js     # Elections flow tests
│   ├── mobile.test.js        # Mobile app flow tests
│   └── ussd.test.js          # USSD flow tests
└── utils/                    # Utility functions
    ├── apiClient.js          # API client for making requests
    └── testDataGenerator.js  # Test data generation utilities
```

## Prerequisites

Before running the tests, ensure you have the following installed:

- Node.js (v14 or later)
- npm or yarn

And the following npm packages:
- jest
- axios
- uuid
- @faker-js/faker (optional, for better test data)
- @codegrenade/naija-faker (optional, for Nigeria-specific data)

## Installing Dependencies

```bash
npm install jest axios uuid
npm install --save-dev @faker-js/faker @codegrenade/naija-faker
```

## Running Tests

To run all tests in the development environment:

```bash
node tests/e2e/index.js
```

To run specific test flows:

```bash
# Run only authentication tests
node tests/e2e/index.js auth

# Run authentication and elections tests
node tests/e2e/index.js auth elections
```

To specify an environment:

```bash
node tests/e2e/index.js --env staging
```

Available options:

```
--env, -e ENV     Set the environment to use (development, staging, production)
--no-cleanup      Don't clean up test data after tests
--verbose, -v     Show verbose output
--help, -h        Show this help message
```

## Adding New Tests

To add a new test flow:

1. Create a new file in the `tests` directory with a `.test.js` extension
2. Import the necessary utilities:
   ```javascript
   const apiClient = require('../utils/apiClient');
   const testDataGenerator = require('../utils/testDataGenerator');
   const config = require('../config');
   const endpoints = require('../data/api-endpoints.json');
   ```
3. Use Jest's `describe` and `test` functions to organize your tests
4. Use the apiClient utility to make API calls

## Test Data Generation

The system can generate realistic test data for your tests. The test data generator creates:

- Voters with realistic Nigerian information
- Elections with appropriate types and statuses
- Candidates with party affiliations

Test data is automatically generated during test setup and cleaned up after tests run (unless `--no-cleanup` is specified).

## Environments

Three environments are supported:

- `development` - Local development environment (default)
- `staging` - Staging/QA environment
- `production` - Production environment

Configure these in `config.js`.

## API Client

The API client utility provides methods for making authenticated requests to the API:

```javascript
// GET request
const response = await apiClient.get('/api/v1/elections', { status: 'active' });

// POST request
const response = await apiClient.post('/api/v1/auth/login', { 
  identifier: '12345678901', 
  password: 'Password123!' 
});

// Setting auth token for subsequent requests
apiClient.setAuthToken(token);

// Clearing auth token
apiClient.clearAuthToken();
``` 