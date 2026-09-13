# Dockerfile for Full-Stack Online Assessment Platform
FROM node:20-alpine AS builder

WORKDIR /app

# Build Client
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client ./client
RUN cd client && npm run build

# Setup Server
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev
COPY server ./server

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production
ENV RETENTION_HOURS=24

WORKDIR /app/server
CMD ["node", "src/index.js"]
