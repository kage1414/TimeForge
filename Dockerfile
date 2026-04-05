# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ .
RUN yarn build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package.json backend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY backend/ .
RUN yarn build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app
COPY backend/package.json backend/yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/src/db/migrations ./dist/db/migrations
COPY --from=frontend-builder /app/dist ./public
EXPOSE 4000
CMD ["node", "dist/index.js"]
