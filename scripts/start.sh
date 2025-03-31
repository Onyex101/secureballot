#!/bin/sh

# Set environment to test for database operations
export NODE_ENV=test

# Run database migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate

# Start the server
echo "Starting the server..."
node dist/server.js 