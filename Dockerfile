FROM node:20-slim
WORKDIR /app

# Copy schema to root
COPY schema.sql ./

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server code
COPY server/index.js ./server/

# Create data directory
RUN mkdir -p /data

ENV DATA_DIR=/data
ENV PORT=8765

EXPOSE 8765
CMD ["node", "server/index.js"]
