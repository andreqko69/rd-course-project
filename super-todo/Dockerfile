# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

# Build the application
RUN pnpm run build

# Runner stage - minimal Alpine image with non-root user
FROM alpine:3.23.2 AS runner

RUN adduser -D nodeuser

WORKDIR /app

# Install Node.js runtime in Alpine
RUN apk add --no-cache nodejs

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy node_modules from builder stage (pre-built)
COPY --from=builder /app/node_modules ./node_modules

# Copy package.json for reference
COPY package.json .

# Change ownership of app directory to non-root user
RUN chown -R nodeuser:nodeuser /app

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
