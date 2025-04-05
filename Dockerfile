FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 5000

# Create volume for logs
VOLUME [ "/usr/src/app/logs" ]

CMD ["node", "dist/server.js"]