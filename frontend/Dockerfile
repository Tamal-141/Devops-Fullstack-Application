# Stages:  deps → lint                      (CI runs it with --target)
#          deps → build → runtime            (the image that ships)
# Node is only needed to *build* the static files. The shipped image is plain nginx
# plus those files — no node_modules, no source, no Node runtime.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS lint
COPY . .
RUN npm run lint

FROM deps AS build
COPY . .
RUN npm run build

FROM nginx:1.30-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
