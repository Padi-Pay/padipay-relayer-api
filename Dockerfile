FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package metadata
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code
COPY src/ src/

# Create a non-root user for security
USER node

# Expose the API port (defaults to 3000)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
