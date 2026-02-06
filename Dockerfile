# --- Development stage (with hot reload) ---
FROM node:22-alpine AS development

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm prisma generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

# Default command for development (hot reload with tsx watch)
CMD ["pnpm", "dev"]

# --- Build stage ---
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# --- Production stage ---
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client in production node_modules
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm prisma generate

# Copy built files
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]