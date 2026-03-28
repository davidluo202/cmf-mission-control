FROM node:20-slim
WORKDIR /app

# Install build tools for better-sqlite3 native module
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY index.js .

RUN mkdir -p /data
ENV DATA_DIR=/data
ENV PORT=8765

EXPOSE 8765
CMD ["node", "index.js"]
