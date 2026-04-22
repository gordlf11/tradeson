# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set production env vars for Vite build (VITE_* vars are baked in at build time)
ENV VITE_API_URL=https://tradeson-api-63629008205.us-central1.run.app
ENV VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51TO5HGKGm5c0ariT5SXQnpXu8cQxvjQy24Jzi2hsMSkIgCMfPTMr6CySdG5IZkIlUcQHDyywQOhfCgPFCN3IxEsD00MUSU3JtQ

# Build the application
RUN npm run build

# Production stage - using a simpler nginx setup
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 8080
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]