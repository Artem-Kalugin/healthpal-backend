FROM node:22-alpine

WORKDIR /app

RUN apk add python3 make g++

RUN corepack enable

ENV HUSKY=0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

ENTRYPOINT ["pnpm", "seed"]