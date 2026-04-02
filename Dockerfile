# ============================================
# Link2Global - 跨境电商自动化上架系统
# Dockerfile for production deployment
# ============================================

# Stage 1: Dependencies
FROM node:20-slim AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9.0.0 2>/dev/null || true
RUN pnpm install --frozen-lockfile --prefer-offline

# Stage 2: Builder
FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm next build

# Stage 3: Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs

# Install sharp for image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

USER nodejs

EXPOSE 5000

ENV PORT=5000
ENV NEXT_TELEMETRY_DISABLED=1

# Use dumb-init to handle signal forwarding
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
