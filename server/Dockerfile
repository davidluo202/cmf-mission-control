FROM node:20-slim
WORKDIR /app

# Copy root schema file
COPY ../schema.sql /schema.sql

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code
COPY index.js .

# Create data directory
RUN mkdir -p /data

ENV DATA_DIR=/data
ENV PORT=8765

EXPOSE 8765
CMD ["node", "index.js"]
