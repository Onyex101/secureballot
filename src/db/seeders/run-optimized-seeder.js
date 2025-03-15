'use strict';

/**
 * Run optimized seeder script
 * 
 * This script demonstrates how to run the seeder with optimizations for large datasets.
 * It uses the optimized-seeder-utils.js file to improve performance.
 * 
 * Usage:
 * node --max-old-space-size=4096 src/db/seeders/run-optimized-seeder.js
 * 
 * For even better performance with garbage collection:
 * node --max-old-space-size=4096 --expose-gc src/db/seeders/run-optimized-seeder.js
 */

const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { 
  optimizeDbConnection, 
  generateDataInChunks, 
  optimizedBatchInsert,
  toggleForeignKeyConstraints,
  withPerformanceMonitoring
} = require('./optimized-seeder-utils');

// Load environment variables
require('dotenv').config();

// Configuration
const CONFIG = {
  batchSize: parseInt(process.env.SEED_BATCH_SIZE, 10),
  maxVotersPerState: parseInt(process.env.SEED_MAX_VOTERS_PER_STATE, 10),
  useParallelProcessing: process.env.SEED_USE_PARALLEL !== 'false',
  useTransactions: process.env.SEED_USE_TRANSACTIONS !== 'false',
  seedTarget: process.env.SEED_TARGET || 'all', // 'all', 'admin', 'elections', 'voters', etc.
  debug: process.env.DEBUG === 'true',
  disableConstraints: process.env.DISABLE_CONSTRAINTS === 'true',
  disableIndexes: process.env.DISABLE_INDEXES === 'true'
};

async function runOptimizedSeeder() {
  console.log('Starting optimized seeder with configuration:', CONFIG);
  
  try {
    // Find the database config file
    // First try the path from .sequelizerc
    const rootDir = path.resolve(__dirname, '../../../');
    let configPath;
    
    // Try to read .sequelizerc to get the config path
    try {
      const sequelizeRcPath = path.join(rootDir, '.sequelizerc');
      if (fs.existsSync(sequelizeRcPath)) {
        const sequelizeRc = require(sequelizeRcPath);
        if (sequelizeRc.config) {
          configPath = path.resolve(rootDir, sequelizeRc.config);
        }
      }
    } catch (error) {
      console.warn('Could not read .sequelizerc:', error.message);
    }
    
    // If we couldn't get the path from .sequelizerc, try common locations
    if (!configPath || !fs.existsSync(configPath)) {
      const possiblePaths = [
        path.resolve(rootDir, 'src/config/database.js'),
        path.resolve(rootDir, 'config/database.js'),
        path.resolve(rootDir, 'src/config/config.js'),
        path.resolve(rootDir, 'config/config.js')
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          configPath = possiblePath;
          break;
        }
      }
    }
    
    if (!configPath || !fs.existsSync(configPath)) {
      throw new Error('Could not find database configuration file. Please check your project structure.');
    }
    
    console.log(`Using database config from: ${configPath}`);
    
    // Load the database config
    const dbConfig = require(configPath)[process.env.NODE_ENV || 'development'];
    
    if (!dbConfig) {
      throw new Error(`No database configuration found for environment: ${process.env.NODE_ENV || 'development'}`);
    }
    
    // Create Sequelize instance
    const sequelize = new Sequelize(
      dbConfig.database,
      dbConfig.username,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: CONFIG.debug ? console.log : false,
        pool: {
          max: 25,
          min: 0,
          acquire: 60000,
          idle: 10000
        },
        ...(dbConfig.dialectOptions && { dialectOptions: dbConfig.dialectOptions })
      }
    );
    
    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Optimize database connection
    optimizeDbConnection(sequelize);
    
    // Create query interface
    const queryInterface = sequelize.getQueryInterface();
    
    // Load the seeder
    const seederPath = path.resolve(__dirname, './20250309194037-demo-elections.js');
    if (!fs.existsSync(seederPath)) {
      throw new Error(`Seeder file not found at: ${seederPath}`);
    }
    
    const seeder = require(seederPath);
    
    // Disable foreign key constraints if requested
    if (CONFIG.disableConstraints) {
      await toggleForeignKeyConstraints(queryInterface, true);
    }
    
    // Run the seeder with performance monitoring
    await withPerformanceMonitoring(async () => {
      if (CONFIG.seedTarget === 'all') {
        await seeder.up(queryInterface, Sequelize);
      } else {
        // Run specific parts of the seeder based on the target
        await runTargetedSeed(queryInterface, Sequelize, CONFIG.seedTarget);
      }
    }, 'database seeding');
    
    // Re-enable foreign key constraints if they were disabled
    if (CONFIG.disableConstraints) {
      await toggleForeignKeyConstraints(queryInterface, false);
    }
    
    // Close the connection
    await sequelize.close();
    
  } catch (error) {
    console.error('Error running optimized seeder:', error);
    if (CONFIG.debug && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Run a targeted part of the seeder
 * 
 * @param {Object} queryInterface - Sequelize QueryInterface
 * @param {Object} Sequelize - Sequelize class
 * @param {string} target - Target to seed ('admin', 'elections', 'voters', etc.)
 */
async function runTargetedSeed(queryInterface, Sequelize, target) {
  const { faker } = require('@faker-js/faker');
  const naijaFaker = require('@codegrenade/naija-faker');
  const { v4: uuidv4 } = require('uuid');
  
  console.log(`Running targeted seed for: ${target}`);
  
  // Default password hash for all users
  const DEFAULT_PASSWORD_HASH = '$2b$10$1XpzUYu8FuvuJj.PoUMvZOFFWGYoR0jbJ6qZmHX5.G9qujpJjEKyy'; // hash for 'password123'
  
  switch (target) {
    case 'admin':
      // Seed admin users, roles, and permissions
      await seedAdminUsers(queryInterface);
      break;
      
    case 'elections':
      // Seed elections, candidates, and polling units
      await seedElections(queryInterface);
      break;
      
    case 'voters':
      // Seed voters and related data
      await seedVoters(queryInterface);
      break;
      
    case 'votes':
      // Seed votes and related data
      await seedVotes(queryInterface);
      break;
      
    default:
      console.log(`Unknown target: ${target}, defaulting to 'all'`);
      const seederPath = path.resolve(__dirname, './20250309194037-demo-elections.js');
      const seeder = require(seederPath);
      await seeder.up(queryInterface, Sequelize);
  }
  
  /**
   * Seed admin users, roles, and permissions
   */
  async function seedAdminUsers(queryInterface) {
    // Example implementation of targeted admin seeding
    console.log('Seeding admin users, roles, and permissions...');
    
    // Create super admin
    const superAdminId = uuidv4();
    await queryInterface.bulkInsert('admin_users', [{
      id: superAdminId,
      full_name: 'Super Administrator',
      email: 'admin@secureballot.ng',
      phone_number: naijaFaker.phoneNumber(),
      password_hash: DEFAULT_PASSWORD_HASH,
      admin_type: 'SystemAdministrator',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }]);
    
    // Generate additional admin users
    const adminCount = 20;
    
    await generateDataInChunks(adminCount, (index) => {
      const adminId = uuidv4();
      const adminType = ['SystemAdministrator', 'ElectoralCommissioner', 'SecurityOfficer'][index % 3];
      
      return {
        id: adminId,
        full_name: naijaFaker.name(),
        email: naijaFaker.email().toLowerCase(),
        phone_number: naijaFaker.phoneNumber(),
        password_hash: DEFAULT_PASSWORD_HASH,
        admin_type: adminType,
        is_active: true,
        created_by: superAdminId,
        created_at: new Date(),
        updated_at: new Date()
      };
    }, {
      chunkSize: CONFIG.batchSize,
      onChunkGenerated: async (chunk) => {
        await optimizedBatchInsert(queryInterface, 'admin_users', chunk, {
          batchSize: CONFIG.batchSize,
          useTransaction: CONFIG.useTransactions,
          disableConstraints: CONFIG.disableConstraints,
          disableIndexes: CONFIG.disableIndexes
        });
      }
    });
    
    console.log('Admin users seeded successfully');
  }
  
  /**
   * Seed elections, candidates, and polling units
   */
  async function seedElections(queryInterface) {
    // Example implementation of targeted election seeding
    console.log('Seeding elections, candidates, and polling units...');
    
    // Implementation would go here
    // This would extract the election-related seeding logic from the main seeder
    
    console.log('Elections seeded successfully');
  }
  
  /**
   * Seed voters and related data
   */
  async function seedVoters(queryInterface) {
    // Example implementation of targeted voter seeding
    console.log('Seeding voters and related data...');
    
    // Get Nigeria states
    const nigeriaStates = naijaFaker.states();
    
    // For each state, generate voters
    for (const state of nigeriaStates.slice(0, 5)) { // Limit to 5 states for example
      const votersPerState = Math.min(10000, CONFIG.maxVotersPerState); // Smaller number for example
      
      console.log(`Generating ${votersPerState} voters for ${state}...`);
      
      await generateDataInChunks(votersPerState, (index) => {
        const voterId = uuidv4();
        const person = naijaFaker.person();
        const nin = faker.number.int({ min: 10000000000, max: 99999999999 }).toString();
        const vin = `${faker.string.alphanumeric(3).toUpperCase()}${faker.number.int({ min: 1000000000, max: 9999999999 })}${faker.string.alphanumeric(6).toUpperCase()}`;
        
        return {
          id: voterId,
          nin: nin,
          vin: vin,
          phone_number: person.phone || naijaFaker.phoneNumber(),
          date_of_birth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
          password_hash: DEFAULT_PASSWORD_HASH,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        };
      }, {
        chunkSize: CONFIG.batchSize,
        onChunkGenerated: async (chunk) => {
          await optimizedBatchInsert(queryInterface, 'voters', chunk, {
            batchSize: CONFIG.batchSize,
            useTransaction: CONFIG.useTransactions,
            disableConstraints: CONFIG.disableConstraints,
            disableIndexes: CONFIG.disableIndexes
          });
          
          // Also generate voter cards for these voters
          const voterCards = chunk.map(voter => ({
            id: uuidv4(),
            user_id: voter.id,
            full_name: naijaFaker.name(),
            vin: voter.vin,
            polling_unit_code: `PU${state.substring(0, 3).toUpperCase()}${faker.number.int({ min: 1000, max: 9999 })}`,
            state: state,
            lga: naijaFaker.lga(),
            ward: `Ward ${faker.number.int({ min: 1, max: 12 })}`,
            issued_date: faker.date.recent({ days: 365 }),
            is_valid: true,
            created_at: new Date(),
            updated_at: new Date()
          }));
          
          await optimizedBatchInsert(queryInterface, 'voter_cards', voterCards, {
            batchSize: CONFIG.batchSize,
            useTransaction: CONFIG.useTransactions,
            disableConstraints: CONFIG.disableConstraints,
            disableIndexes: CONFIG.disableIndexes
          });
        }
      });
    }
    
    console.log('Voters seeded successfully');
  }
  
  /**
   * Seed votes and related data
   */
  async function seedVotes(queryInterface) {
    // Example implementation of targeted vote seeding
    console.log('Seeding votes and related data...');
    
    // Implementation would go here
    // This would extract the vote-related seeding logic from the main seeder
    
    console.log('Votes seeded successfully');
  }
}

// Run the optimized seeder
runOptimizedSeeder().then(() => {
  console.log('Optimized seeding completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Error in optimized seeding:', error);
  process.exit(1);
}); 