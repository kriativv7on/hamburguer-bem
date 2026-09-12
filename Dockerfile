# ---------- Stage 1: build ----------
FROM node:22-slim AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---------- Stage 2: runtime ----------
FROM node:22-slim AS runtime
WORKDIR /app

RUN corepack enable

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist

# Diretório do banco SQLite (montado como volume persistente)
RUN mkdir -p /data

EXPOSE 3000
CMD ["node", "dist/index.js"]