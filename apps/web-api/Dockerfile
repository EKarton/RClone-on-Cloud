# Build stage
FROM golang:alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code 
# (.dockerignore handles excluding unnecessary files)
COPY . .

# Build the binary
# -ldflags="-s -w" strips debug information and symbol tables to reduce binary size
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o rclone-cloud-web-api .

# Final stage
# Using a fresh, small alpine image for the runtime
FROM alpine:3.20

WORKDIR /app

# Install ca-certificates for secure HTTPS connections
RUN apk --no-cache add ca-certificates

# Create a non-root user for security
# Explicitly set UID/GID for predictability
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1000
USER appuser

# Copy the binary from the build stage
COPY --from=builder /app/rclone-cloud-web-api .

# Expose the API port
EXPOSE 3000

# Run the binary
# Using exec form for better signal handling
ENTRYPOINT ["./rclone-cloud-web-api"]
