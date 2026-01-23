# Stage 1: Build
# Using Node 24 (LTS) for maximum performance and security patches in 2026
FROM node:24-bookworm-slim AS builder

# Enable corepack for pnpm (corepack remains the standard for pnpm management)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# SECURITY: Use the built-in 'node' user for a non-privileged build process
RUN chown node:node /app
USER node

# CACHE: Optimized dependency installation
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# BUILD: Compile the Angular 21+ SPA (Outputs to dist/client)
COPY --chown=node:node . .
RUN pnpm run build

# STAGE 2: Runtime - Serve with Nginx
# Nginx 1.27+ on Alpine for a minimal, hardened production server
FROM nginx:alpine

# Custom configuration for SPA routing and /api proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built Static assets (SPA files) from the builder stage to Nginx default public directory
COPY --from=builder /app/dist/client /usr/share/nginx/html

# EXPOSE 80 (Standard Nginx port)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
