FROM node:20-alpine AS builder

# Accept build arguments
ARG VITE_API_URL
ARG VITE_DEBUG_MODE
ARG VITE_APP_NAME
ARG VITE_SPECTATOR_DARK_MODE

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEBUG_MODE=$VITE_DEBUG_MODE
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_SPECTATOR_DARK_MODE=$VITE_SPECTATOR_DARK_MODE

# Build for production
RUN npm run build

# Production image with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
