FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile --production
RUN yarn add @nestjs/cli --dev

COPY . .

RUN yarn run build

RUN yarn cache clean

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache tini curl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

RUN mkdir -p /app/uploads/public /app/uploads/protected && \
    chown -R nestjs:nodejs /app/uploads && \
    chmod -R 755 /app/uploads

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs .env ./
COPY --chown=nestjs:nodejs package.json ./

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/main"]