'use strict';

/**
 * Utility functions for optimized database seeding
 * 
 * This file contains helper functions to optimize the seeding process
 * for large datasets, including parallel processing, connection pooling,
 * and memory management.
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

/**
 * Process data in parallel using worker threads
 * 
 * @param {Array} data - The data to process
 * @param {Function} processorFn - The function to process each batch
 * @param {Object} options - Options for parallel processing
 * @param {number} options.batchSize - Size of each batch (default: 10000)
 * @param {number} options.maxWorkers - Maximum number of worker threads (default: CPU cores - 1)
 * @returns {Promise<Array>} - The processed data
 */
async function processInParallel(data, processorFn, options = {}) {
  const batchSize = options.batchSize || 10000;
  const maxWorkers = options.maxWorkers || Math.max(1, os.cpus().length - 1);
  
  // If data is small enough, process it directly
  if (data.length <= batchSize || maxWorkers <= 1) {
    return processorFn(data);
  }
  
  // Split data into batches
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  
  console.log(`Processing ${data.length} records in ${batches.length} batches using ${maxWorkers} workers`);
  
  // Process batches in parallel using worker threads
  const workers = Math.min(maxWorkers, batches.length);
  const results = [];
  
  // Create a queue of batches
  const queue = [...batches];
  const activeWorkers = new Set();
  
  return new Promise((resolve, reject) => {
    // Start initial workers
    for (let i = 0; i < workers; i++) {
      if (queue.length > 0) {
        startWorker(queue.shift());
      }
    }
    
    function startWorker(batch) {
      const worker = new Worker(__filename, {
        workerData: { batch, processorFn: processorFn.toString() }
      });
      
      activeWorkers.add(worker);
      
      worker.on('message', (result) => {
        results.push(...result);
        activeWorkers.delete(worker);
        
        // If there are more batches, start a new worker
        if (queue.length > 0) {
          startWorker(queue.shift());
        } else if (activeWorkers.size === 0) {
          // All workers are done
          resolve(results);
        }
      });
      
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    }
  });
}

/**
 * Optimize database connection for bulk operations
 * 
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} - The optimized sequelize instance
 */
function optimizeDbConnection(sequelize) {
  // Increase connection pool size for parallel operations
  if (sequelize.config.pool) {
    sequelize.config.pool.max = Math.max(sequelize.config.pool.max || 5, 25);
    sequelize.config.pool.acquire = 60000; // Increase acquire timeout
    sequelize.config.pool.idle = 10000; // Increase idle timeout
  }
  
  // Disable logging for better performance
  sequelize.options.logging = false;
  
  return sequelize;
}

/**
 * Temporarily disable foreign key constraints for better performance
 * 
 * @param {Object} queryInterface - Sequelize QueryInterface
 * @param {boolean} disable - Whether to disable (true) or enable (false) constraints
 * @returns {Promise<void>}
 */
async function toggleForeignKeyConstraints(queryInterface, disable = true) {
  const dialect = queryInterface.sequelize.getDialect();
  let query = '';
  
  switch (dialect) {
    case 'mysql':
      query = disable 
        ? 'SET FOREIGN_KEY_CHECKS = 0;' 
        : 'SET FOREIGN_KEY_CHECKS = 1;';
      break;
    case 'postgres':
      // For PostgreSQL, set session_replication_role to bypass triggers instead
      // This doesn't require superuser privileges
      query = disable 
        ? 'SET session_replication_role = replica;' 
        : 'SET session_replication_role = default;';
      break;
    case 'sqlite':
      query = disable 
        ? 'PRAGMA foreign_keys = OFF;' 
        : 'PRAGMA foreign_keys = ON;';
      break;
    default:
      console.warn(`Foreign key constraint toggling not supported for dialect: ${dialect}`);
      return;
  }
  
  try {
    await queryInterface.sequelize.query(query);
    console.log(`Foreign key constraints ${disable ? 'disabled' : 'enabled'}`);
  } catch (error) {
    console.error(`Error ${disable ? 'disabling' : 'enabling'} foreign key constraints:`, error.message);
    // Try to continue even if we can't disable/enable constraints
  }
}

/**
 * Temporarily disable indexes for better bulk insert performance
 * 
 * @param {Object} queryInterface - Sequelize QueryInterface
 * @param {string} tableName - Name of the table
 * @param {boolean} disable - Whether to disable (true) or enable (false) indexes
 * @returns {Promise<void>}
 */
async function toggleTableIndexes(queryInterface, tableName, disable = true) {
  const dialect = queryInterface.sequelize.getDialect();
  let query = '';
  
  switch (dialect) {
    case 'mysql':
      if (disable) {
        query = `ALTER TABLE ${tableName} DISABLE KEYS;`;
      } else {
        query = `ALTER TABLE ${tableName} ENABLE KEYS;`;
      }
      break;
    case 'postgres':
      // PostgreSQL doesn't have a direct way to disable indexes
      // We could drop and recreate them, but that's risky
      console.warn('Index disabling not directly supported in PostgreSQL');
      return;
    default:
      console.warn(`Index toggling not supported for dialect: ${dialect}`);
      return;
  }
  
  try {
    if (query) {
      await queryInterface.sequelize.query(query);
      console.log(`Indexes for table ${tableName} ${disable ? 'disabled' : 'enabled'}`);
    }
  } catch (error) {
    console.error(`Error ${disable ? 'disabling' : 'enabling'} indexes for table ${tableName}:`, error.message);
  }
}

/**
 * Insert data in batches with optimized connection handling
 * 
 * @param {Object} queryInterface - Sequelize QueryInterface
 * @param {string} tableName - Name of the table
 * @param {Array} data - Data to insert
 * @param {Object} options - Options for batch insert
 * @param {number} options.batchSize - Size of each batch (default: 10000)
 * @param {boolean} options.useTransaction - Whether to use a transaction (default: true)
 * @param {boolean} options.disableConstraints - Whether to disable foreign key constraints (default: false)
 * @param {boolean} options.disableIndexes - Whether to disable indexes (default: false)
 * @returns {Promise<number>} - Number of inserted records
 */
async function optimizedBatchInsert(queryInterface, tableName, data, options = {}) {
  const batchSize = options.batchSize || 10000;
  const useTransaction = options.useTransaction !== false;
  const disableConstraints = options.disableConstraints === true;
  const disableIndexes = options.disableIndexes === true;
  
  console.log(`Optimized batch inserting ${data.length} records into ${tableName}...`);
  
  // Split data into batches
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  
  console.log(`Split into ${batches.length} batches of max ${batchSize} records each`);
  
  // Optimize database connection
  optimizeDbConnection(queryInterface.sequelize);
  
  // Temporarily disable constraints and indexes if requested
  if (disableConstraints) {
    await toggleForeignKeyConstraints(queryInterface, true);
  }
  
  if (disableIndexes) {
    await toggleTableIndexes(queryInterface, tableName, true);
  }
  
  let insertedCount = 0;
  
  try {
    if (useTransaction) {
      // Use a single transaction for all batches
      const transaction = await queryInterface.sequelize.transaction();
      
      try {
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          await queryInterface.bulkInsert(tableName, batch, { transaction });
          insertedCount += batch.length;
          console.log(`Inserted batch ${i + 1}/${batches.length} (${insertedCount}/${data.length} records)`);
        }
        
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } else {
      // Insert each batch without a transaction
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await queryInterface.bulkInsert(tableName, batch);
        insertedCount += batch.length;
        console.log(`Inserted batch ${i + 1}/${batches.length} (${insertedCount}/${data.length} records)`);
      }
    }
  } finally {
    // Re-enable constraints and indexes
    if (disableIndexes) {
      await toggleTableIndexes(queryInterface, tableName, false);
    }
    
    if (disableConstraints) {
      await toggleForeignKeyConstraints(queryInterface, false);
    }
  }
  
  return insertedCount;
}

/**
 * Generate data in memory-efficient chunks
 * 
 * @param {number} totalCount - Total number of records to generate
 * @param {Function} generatorFn - Function to generate a single record
 * @param {Object} options - Options for data generation
 * @param {number} options.chunkSize - Size of each chunk (default: 10000)
 * @param {Function} options.onChunkGenerated - Callback when a chunk is generated
 * @returns {Promise<Array>} - Generated data (empty if using onChunkGenerated)
 */
async function generateDataInChunks(totalCount, generatorFn, options = {}) {
  const chunkSize = options.chunkSize || 10000;
  const onChunkGenerated = options.onChunkGenerated;
  
  console.log(`Generating ${totalCount} records in chunks of ${chunkSize}...`);
  
  // If not using callback, collect all data
  const allData = onChunkGenerated ? null : [];
  
  for (let i = 0; i < totalCount; i += chunkSize) {
    const currentChunkSize = Math.min(chunkSize, totalCount - i);
    const chunk = [];
    
    for (let j = 0; j < currentChunkSize; j++) {
      chunk.push(generatorFn(i + j));
    }
    
    if (onChunkGenerated) {
      await onChunkGenerated(chunk, i / chunkSize);
    } else if (allData) {
      allData.push(...chunk);
    }
    
    console.log(`Generated chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(totalCount / chunkSize)} (${i + currentChunkSize}/${totalCount} records)`);
    
    // Force garbage collection if available (Node.js with --expose-gc flag)
    if (global.gc) {
      global.gc();
    }
  }
  
  return allData || [];
}

/**
 * Run a function with performance monitoring
 * 
 * @param {Function} fn - Function to run
 * @param {string} label - Label for the performance measurement
 * @returns {Promise<any>} - Result of the function
 */
async function withPerformanceMonitoring(fn, label) {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  
  console.log(`Starting ${label}...`);
  console.log(`Initial memory usage: ${startMemory.toFixed(2)} MB`);
  
  try {
    const result = await fn();
    
    const endTime = process.hrtime(startTime);
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    const executionTime = (endTime[0] + endTime[1] / 1e9).toFixed(2);
    const memoryDiff = (endMemory - startMemory).toFixed(2);
    
    console.log(`Completed ${label} in ${executionTime} seconds`);
    console.log(`Memory usage: ${endMemory.toFixed(2)} MB (${memoryDiff > 0 ? '+' : ''}${memoryDiff} MB)`);
    
    return result;
  } catch (error) {
    console.error(`Error in ${label}:`, error);
    throw error;
  }
}

// Worker thread code
if (!isMainThread) {
  const { batch, processorFn } = workerData;
  
  // Convert string function back to function
  const fn = new Function(`return ${processorFn}`)();
  
  // Process the batch
  const result = fn(batch);
  
  // Send the result back to the main thread
  parentPort.postMessage(result);
}

module.exports = {
  processInParallel,
  optimizeDbConnection,
  toggleForeignKeyConstraints,
  toggleTableIndexes,
  optimizedBatchInsert,
  generateDataInChunks,
  withPerformanceMonitoring
}; 