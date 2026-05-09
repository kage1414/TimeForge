FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:22-alpine
RUN apk add --no-cache \
      python3 make g++ \
      chromium nss freetype harfbuzz ca-certificates ttf-freefont \
      font-noto-emoji
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY --from=builder /app/dist ./dist
ENV DATABASE_PATH=/data/db.sqlite
ENV EXPORT_DIR=/data/exports
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "dist/index.js"]
