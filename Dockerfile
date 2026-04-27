# --- STAGE 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
# Copy only package files first to leverage Docker cache
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts
# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# --- STAGE 2: Build Backend ---
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
# Install only production dependencies for a smaller image
RUN npm ci --only=production --ignore-scripts
COPY backend/ ./

# --- STAGE 3: Final Production Image ---
FROM node:20-alpine
WORKDIR /app

# SECURITY: Create a non-root user to run the app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy the backend files from Stage 2
COPY --from=backend-builder /app/backend ./backend
# Copy the frontend build artifacts into the backend's public folder
COPY --from=frontend-builder /app/frontend/build ./backend/public

EXPOSE 3000
WORKDIR /app/backend
CMD ["node", "index.js"]