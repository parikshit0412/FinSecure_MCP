# ==========================================
# Stage 1: Build Next.js Static Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install frontend dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code and build static export
COPY frontend/ ./
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

# ==========================================
# Stage 2: Python Backend + Production Server
# ==========================================
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend static export from Stage 1
COPY --from=frontend-builder /app/frontend/out ./frontend/out

# Default environment variables for Render
ENV PORT=10000
ENV USE_SQLITE=true
ENV PYTHONUNBUFFERED=1

EXPOSE 10000

# Start unified FastAPI + MCP server
CMD ["sh", "-c", "uvicorn backend.api:app --host 0.0.0.0 --port ${PORT:-10000}"]
