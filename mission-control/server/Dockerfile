FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.js .
RUN mkdir -p /data
ENV DATA_DIR=/data
ENV PORT=8765
EXPOSE 8765
CMD ["node", "index.js"]
