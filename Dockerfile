FROM node:20-slim
WORKDIR /app/server

# Install server dependencies (npm install, no lockfile required)
COPY server/package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy server code and schema
COPY server/index.js ./
WORKDIR /app
COPY schema.sql ./

# Create data directory
RUN mkdir -p /data

ENV DATA_DIR=/data
ENV PORT=8765

EXPOSE 8765
CMD ["node", "server/index.js"]
