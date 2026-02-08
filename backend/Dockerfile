FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

# better-sqlite3 and bcrypt need native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build
RUN CI=true pnpm prune --prod

# --- Production ---
FROM node:20-alpine

# Native modules need libstdc++ at runtime
RUN apk add --no-cache libstdc++

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main"]
