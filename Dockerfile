FROM node:20-alpine AS base

# ---

# Build stage
FROM base AS build

# Enable pnpm via corepack
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
# Generate .nuxt/tsconfig.json for both root layer and playground
# Root tsconfig.json extends ./.nuxt/tsconfig.json which Vite resolves at build time
RUN pnpm nuxt prepare && pnpm nuxt prepare playground
RUN pnpm build

# ---

# Production stage — serve static output with nginx
FROM nginx:alpine AS production

# Copy static files from the Nitro static build output
COPY --from=build /app/playground/.output/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
