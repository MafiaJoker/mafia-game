# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_SHOW_TEST_LOGIN=false
ARG VITE_APP_COMMIT_HASH=
ARG VITE_APP_VERSION=

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_TELEGRAM_BOT_USERNAME=${VITE_TELEGRAM_BOT_USERNAME} \
    VITE_SHOW_TEST_LOGIN=${VITE_SHOW_TEST_LOGIN} \
    VITE_APP_COMMIT_HASH=${VITE_APP_COMMIT_HASH} \
    VITE_APP_VERSION=${VITE_APP_VERSION} \
    NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

COPY index.html vite.config.mjs ./
COPY src ./src
COPY favicon.ico ./

RUN npm run build


FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY --chown=nginx:nginx nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 8080
