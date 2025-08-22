# Use the official Node.js runtime as the base image
FROM node:20-alpine

# Install security updates and dumb-init for proper signal handling
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create a non-root user first (better security practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set the working directory in the container
WORKDIR /app

# Copy package files and install dependencies as root for proper permissions
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy application code
COPY . .

# Create uploads directory and change ownership in one layer
RUN mkdir -p /app/uploads && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the port that the app runs on
EXPOSE 3001

# Create volume for uploads folder (temporary files)
VOLUME ["/app/uploads"]

# Define environment variable for production
ENV NODE_ENV=production

# Health check with improved reliability
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Command to run the application
CMD ["npm", "start"]