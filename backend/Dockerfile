# Multi-stage Dockerfile for building TypeScript backend

# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Remove dev dependencies to reduce size (keep only production deps)
RUN npm prune --production

# Runtime stage
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy production node_modules and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

EXPOSE 3001
CMD ["node", "dist/index.js"]
