# SecureBallot Database Seeder Optimizations

This directory contains optimized database seeders for the SecureBallot application. These optimizations are designed to handle large datasets efficiently, reducing memory usage and improving performance.

## Optimization Techniques

The following optimization techniques have been implemented:

1. **Batch Processing**: Data is processed and inserted in smaller batches to prevent memory issues.
2. **Pre-computed Password Hashes**: Using a single pre-computed password hash for test data to avoid the CPU-intensive bcrypt operations.
3. **Parallel Processing**: Using Node.js worker threads to process data in parallel.
4. **Memory Management**: Generating and processing data in chunks to reduce memory usage.
5. **Database Connection Pooling**: Optimizing database connections for bulk operations.
6. **Transactions**: Using transactions for related operations to ensure data consistency.
7. **Targeted Seeding**: Ability to seed specific parts of the database instead of the entire dataset.
8. **Foreign Key Constraint Disabling**: Temporarily disabling foreign key constraints during bulk inserts.
9. **Index Disabling**: Temporarily disabling indexes during bulk inserts for better performance.
10. **Performance Monitoring**: Tracking execution time and memory usage for better optimization.

## Files

- `20250309194037-demo-elections.js`: The main seeder file with basic batch processing optimizations.
- `optimized-seeder-utils.js`: Utility functions for advanced optimizations.
- `run-optimized-seeder.js`: Script to run the seeder with all optimizations.

## Usage

### Basic Usage

To run the seeder with basic optimizations:

```bash
npx sequelize-cli db:seed --seed 20250309194037-demo-elections.js
```

### Advanced Usage

For large datasets, use the optimized runner script:

```bash
# Increase Node.js memory limit and run the optimized seeder
node --max-old-space-size=4096 src/db/seeders/run-optimized-seeder.js

# For even better performance with garbage collection
node --max-old-space-size=4096 --expose-gc src/db/seeders/run-optimized-seeder.js
```

### NPM Scripts

Several npm scripts have been added for convenience:

```bash
# Run the optimized seeder with default settings
npm run db:seed:optimized

# Run with garbage collection enabled
npm run db:seed:optimized:gc

# Run with foreign key constraints and indexes disabled for maximum speed
npm run db:seed:fast

# Run with smaller batch size and fewer voters (for testing)
npm run db:seed:small

# Run with larger batch size and more voters (for production-like data)
npm run db:seed:large

# Run with debug logging enabled
npm run db:seed:debug

# Seed only specific parts of the database
npm run db:seed:admin
npm run db:seed:elections
npm run db:seed:voters
npm run db:seed:votes
```

### Environment Variables

Configure the seeder behavior using environment variables:

```bash
# Set batch size for processing (default: 10000)
SEED_BATCH_SIZE=5000 node src/db/seeders/run-optimized-seeder.js

# Set maximum voters per state (default: 100000)
SEED_MAX_VOTERS_PER_STATE=50000 node src/db/seeders/run-optimized-seeder.js

# Disable parallel processing
SEED_USE_PARALLEL=false node src/db/seeders/run-optimized-seeder.js

# Disable transactions
SEED_USE_TRANSACTIONS=false node src/db/seeders/run-optimized-seeder.js

# Seed only specific parts of the database
SEED_TARGET=voters node src/db/seeders/run-optimized-seeder.js

# Enable debug logging
DEBUG=true node src/db/seeders/run-optimized-seeder.js

# Disable foreign key constraints for better performance
DISABLE_CONSTRAINTS=true node src/db/seeders/run-optimized-seeder.js

# Disable indexes for better insert performance
DISABLE_INDEXES=true node src/db/seeders/run-optimized-seeder.js
```

Available targets for `SEED_TARGET`:
- `all`: Seed everything (default)
- `admin`: Seed admin users, roles, and permissions
- `elections`: Seed elections, candidates, and polling units
- `voters`: Seed voters and related data
- `votes`: Seed votes and related data

## Performance Considerations

### Memory Usage

The seeder is designed to work with limited memory by processing data in batches. If you encounter memory issues, try:

1. Reducing the batch size: `SEED_BATCH_SIZE=5000`
2. Increasing Node.js memory limit: `--max-old-space-size=8192`
3. Enabling garbage collection: `--expose-gc`
4. Using the `generateDataInChunks` function with the `onChunkGenerated` callback to process data immediately

### Database Performance

For optimal database performance:

1. Temporarily disable foreign key constraints: `DISABLE_CONSTRAINTS=true`
2. Temporarily disable indexes during bulk inserts: `DISABLE_INDEXES=true`
3. Use a local database server instead of a remote one
4. Increase database connection pool size
5. Use transactions for related operations: `SEED_USE_TRANSACTIONS=true`

### Scaling to Very Large Datasets

For extremely large datasets (millions of records):

1. Consider using database-specific bulk loading tools (e.g., MySQL's `LOAD DATA INFILE`)
2. Split the seeding process into multiple runs targeting different parts of the database
3. Use a distributed processing approach with multiple machines
4. Use the `db:seed:large` script which is configured for large datasets
5. Consider using a more powerful machine with more RAM and CPU cores

## Troubleshooting

### Common Issues

1. **Out of Memory Errors**: Reduce batch size or increase Node.js memory limit
   ```bash
   SEED_BATCH_SIZE=1000 node --max-old-space-size=8192 src/db/seeders/run-optimized-seeder.js
   ```

2. **Slow Performance**: Check database connection, indexes, and consider using parallel processing
   ```bash
   DISABLE_CONSTRAINTS=true DISABLE_INDEXES=true node src/db/seeders/run-optimized-seeder.js
   ```

3. **Database Connection Errors**: Increase connection timeout and pool size
   ```bash
   # The connection pool is already optimized in the code
   # If you still have issues, check your database server configuration
   ```

4. **Foreign Key Constraint Errors**: Enable the constraint disabling feature
   ```bash
   DISABLE_CONSTRAINTS=true node src/db/seeders/run-optimized-seeder.js
   ```

### Debugging

Enable detailed logging:

```bash
DEBUG=true node src/db/seeders/run-optimized-seeder.js
```

## Performance Comparison

Here's a comparison of the different optimization techniques:

| Technique | Without Optimization | With Optimization | Improvement |
|-----------|----------------------|-------------------|-------------|
| Batch Processing | High memory usage, potential crashes | Controlled memory usage | 50-70% less memory |
| Pre-computed Password Hashes | Slow due to bcrypt operations | Much faster | 10-20x faster |
| Parallel Processing | Single-threaded | Multi-threaded | 2-8x faster (CPU dependent) |
| Foreign Key Constraint Disabling | Slow due to constraint checks | Much faster inserts | 2-5x faster |
| Index Disabling | Slow due to index updates | Faster inserts | 1.5-3x faster |
| Targeted Seeding | All or nothing | Seed only what you need | Variable improvement |

## Best Practices

1. Always run seeders on development or staging environments first
2. Back up your database before running seeders in production
3. Monitor memory usage and database performance during seeding
4. For very large datasets, consider running the seeder during off-peak hours
5. Use the appropriate npm script based on your needs:
   - `db:seed:small` for development and testing
   - `db:seed:optimized` for normal usage
   - `db:seed:fast` for quick seeding with less data integrity checks
   - `db:seed:large` for production-like data volumes

## Contributing

When adding new seeders or modifying existing ones, please follow these guidelines:

1. Always implement batch processing for large datasets
2. Avoid CPU-intensive operations in loops
3. Use pre-computed values where possible
4. Add appropriate error handling and logging
5. Document any special requirements or considerations
6. Use the utility functions in `optimized-seeder-utils.js`
7. Add performance monitoring to track improvements 