FROM node:22-alpine

WORKDIR /app

RUN apk add python3 make g++

COPY . .

RUN ls

RUN yarn install --frozen-lockfile

ENTRYPOINT ["yarn", "seed"]