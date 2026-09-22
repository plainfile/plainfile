# syntax=docker/dockerfile:1

# Build stage: install dependencies, build the Vite app and prerender static pages.
FROM node:22-slim AS builder

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install Chromium and runtime libraries required by Puppeteer.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxss1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci
RUN npx playwright install  

# Optional build-time arg for Google Analytics.
ARG VITE_GA_MEASUREMENT_ID

COPY . .
RUN npm run build
RUN npm run prerender 

# Runtime stage: lightweight Caddy image serving the prerendered static site.
FROM caddy:2-alpine

COPY --from=builder /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
