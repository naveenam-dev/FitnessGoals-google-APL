# Use a full Node.js image to ensure native dependencies like sqlite3 work correctly
FROM node:24

# Set working directory
WORKDIR /app

# Copy server package files first for better caching
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm install --production

# Copy the rest of the application
COPY . .

# Create directory for SQLite database
RUN mkdir -p /app/data && chmod 777 /app/data

# Set environment variables
# Cloud Run will override PORT, but we set a default
ENV PORT=8080
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/fitness_aura.sqlite

# Expose port (Cloud Run ignores this but good for documentation)
EXPOSE 8080

# Start the application, listening on all interfaces
CMD ["node", "server/server.js"]
