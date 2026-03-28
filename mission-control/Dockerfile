FROM node:20-slim
WORKDIR /app

# Build tools for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy everything from mission-control/ into /app
COPY . .

# Install deps from server/package.json
WORKDIR /app/server
RUN npm ci

# Go back to root
WORKDIR /app

ENV DATA_DIR=/data
ENV PORT=8765
RUN mkdir -p /data

EXPOSE 8765
CMD ["node", "server/index.js"]
