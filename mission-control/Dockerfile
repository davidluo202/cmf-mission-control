FROM node:20-slim
WORKDIR /app

# Build tools for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy everything from mission-control/ into /app
COPY . .

# Install deps from server/package.json
WORKDIR /app/server
RUN npm ci

# Build client and place artifacts where server expects them
WORKDIR /app/client
RUN npm ci
RUN npm run build

WORKDIR /app
RUN rm -rf /app/server/client-dist && mkdir -p /app/server/client-dist \
  && cp -a /app/client/dist/. /app/server/client-dist/

ENV DATA_DIR=/data
ENV PORT=8765
RUN mkdir -p /data

EXPOSE 8765
CMD ["node", "server/index.js"]
