# Stages:  base → dev-deps → lint / test      (CI runs these with --target)
#          base → prod-deps → runtime          (the image that ships)
# BuildKit only builds the stages the chosen --target depends on, so building
# `runtime` never runs lint or tests, and `--target test` never builds runtime.

FROM node:20-alpine AS base
WORKDIR /app
# Only the manifests first: the `npm ci` layer below stays cached until they change.
COPY package.json package-lock.json ./

FROM base AS dev-deps
RUN npm ci

FROM dev-deps AS lint
COPY . .
RUN npm run lint

FROM dev-deps AS test
COPY . .
RUN npm test

FROM base AS prod-deps
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY migrations ./migrations
# Declared late on purpose: the version changes every commit, and everything after
# an ARG is rebuilt when it changes. Here that is nothing expensive.
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
# The official image ships a non-root `node` user; a compromised app then isn't root.
USER node
EXPOSE 3000
# Exec form, not `npm start`: node becomes PID 1 and receives SIGTERM directly.
CMD ["node", "src/server.js"]
