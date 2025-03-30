#!/usr/bin/env node
/**
 * Main Test Runner for E2E Tests
 * 
 * This script provides a CLI for running end-to-end tests for the SecureBallot system.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('./config');
const setup = require('./setup');

// Command line argument parsing
const args = process.argv.slice(2);
const options = {
  environment: config.environment,
  cleanup: config.testDataSettings.cleanupAfterTests,
  tests: [],
  verbose: false,
  help: false
};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--env' || arg === '-e') {
    options.environment = args[++i];
  } else if (arg === '--no-cleanup') {
    options.cleanup = false;
  } else if (arg === '--verbose' || arg === '-v') {
    options.verbose = true;
  } else if (arg === '--help' || arg === '-h') {
    options.help = true;
  } else if (arg.startsWith('-')) {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  } else {
    options.tests.push(arg);
  }
}

// Show help if requested
if (options.help) {
  console.log(`
SecureBallot E2E Test Runner

Usage: node tests/e2e/index.js [options] [test-files]

Options:
  --env, -e ENV     Set the environment to use (development, staging, production)
  --no-cleanup      Don't clean up test data after tests
  --verbose, -v     Show verbose output
  --help, -h        Show this help message

Examples:
  # Run all tests in development environment
  node tests/e2e/index.js

  # Run specific tests in staging environment
  node tests/e2e/index.js --env staging auth elections

  # Run auth tests only
  node tests/e2e/index.js auth
  `);
  process.exit(0);
}

// Set environment variable for test environment
process.env.E2E_ENVIRONMENT = options.environment;
process.env.E2E_CLEANUP = options.cleanup ? 'true' : 'false';

/**
 * Get all test files to run
 */
function getTestFiles() {
  const testDir = path.join(__dirname, 'tests');
  const allFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js'))
    .map(file => path.basename(file, '.test.js'));
  
  if (options.tests.length === 0) {
    return allFiles;
  }
  
  // Filter to requested tests
  return options.tests
    .map(test => {
      if (test.endsWith('.test.js')) {
        return path.basename(test, '.test.js');
      }
      if (test.endsWith('.js')) {
        return path.basename(test, '.js');
      }
      return test;
    })
    .filter(test => {
      const exists = allFiles.includes(test);
      if (!exists) {
        console.warn(`Warning: Test file '${test}' not found.`);
      }
      return exists;
    });
}

/**
 * Run the tests
 */
async function runTests() {
  try {
    console.log(`Running E2E tests in '${options.environment}' environment`);
    
    // Run setup
    await setup.setup();
    
    // Get test files to run
    const testFiles = getTestFiles();
    console.log(`Running the following test files: ${testFiles.join(', ')}`);
    
    // Build the Jest command
    let jestCommand = 'npx jest';
    
    // Add test files
    if (testFiles.length > 0) {
      jestCommand += ` ${testFiles.map(f => `./tests/e2e/tests/${f}.test.js`).join(' ')}`;
    } else {
      jestCommand += ' ./tests/e2e/tests';
    }
    
    // Add Jest options
    if (options.verbose) {
      jestCommand += ' --verbose';
    }
    
    // Run Jest
    console.log(`\nRunning tests with command: ${jestCommand}\n`);
    execSync(jestCommand, { stdio: 'inherit' });
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error.message);
    process.exit(1);
  } finally {
    // Run cleanup
    if (options.cleanup) {
      await setup.cleanup();
    } else {
      console.log('Skipping cleanup as requested');
    }
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error in test runner:', error);
  process.exit(1);
}); 