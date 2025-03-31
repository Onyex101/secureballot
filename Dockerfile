FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Install TypeScript for build
RUN npm install typescript

# Build TypeScript
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Make startup script executable
RUN chmod +x scripts/start.sh

# Expose port
EXPOSE 5000

# Create volume for logs
VOLUME [ "/usr/src/app/logs" ]

# Start the server using the startup script
CMD ["./scripts/start.sh"] 