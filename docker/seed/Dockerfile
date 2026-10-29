FROM node:22-alpine

WORKDIR /app

RUN corepack enable

ENV HUSKY=0

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    mkdir -p /app/uploads/public /app/uploads/protected && \
    chown -R nestjs:nodejs /app

COPY --chown=nestjs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./

USER nestjs

RUN pnpm install --frozen-lockfile

COPY --chown=nestjs:nodejs . .

ENTRYPOINT ["pnpm", "seed"]
