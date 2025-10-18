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

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs .env ./

RUN mkdir -p /app/Uploads && \
    chown -R nestjs:nodejs /app/Uploads && \
    chmod 755 /app/Uploads

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/main"]