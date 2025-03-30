/**
 * Configuration for E2E tests
 */

module.exports = {
  // API configuration
  apiConfig: {
    baseURL: process.env.E2E_API_BASE_URL || 'http://localhost:3000',
    timeout: 10000,
    validateStatus: function (status) {
      return status < 500; // Resolve only if the status code is less than 500
    }
  },
  
  // Test data settings
  testDataSettings: {
    // Directory to store generated test data
    outputDir: './tests/e2e/data/generated',
    // Whether to clean up test data after test runs
    cleanupAfterTests: true
  },
  
  // Test execution settings
  testSettings: {
    // Whether to run tests in parallel
    parallel: false,
    // How many retries for failed tests
    retries: 2,
    // Screenshot settings for UI tests
    screenshots: {
      enabled: true,
      path: './tests/e2e/screenshots'
    }
  },
  
  // Environment specific configurations
  environments: {
    development: {
      apiBaseURL: 'http://localhost:3000',
      webAppURL: 'http://localhost:3001'
    },
    staging: {
      apiBaseURL: 'https://api-staging.securevote.gov.ng',
      webAppURL: 'https://staging.securevote.gov.ng'
    },
    production: {
      apiBaseURL: 'https://api.securevote.gov.ng',
      webAppURL: 'https://securevote.gov.ng'
    }
  },
  
  // Default environment to use
  environment: process.env.E2E_ENVIRONMENT || 'development'
}; 