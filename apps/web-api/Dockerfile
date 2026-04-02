# Build stage
FROM golang:alpine AS builder

# Install build dependencies and runtime certs
RUN apk add --no-cache git ca-certificates

# Create a non-root user for security (accessible in final stage)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1000

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
# Using 'scratch' for the absolute slimmest image
FROM scratch

WORKDIR /app

# Copy the binary from the build stage
COPY --from=builder /app/rclone-cloud-web-api .

# Copy ca-certificates for secure HTTPS connections
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the non-root user details we created in the builder
# (Wait, builder needs to create the user first - I'll update that too)
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Use the non-root user for security
USER appuser

# Expose the API port
EXPOSE 3000

# Run the binary
ENTRYPOINT ["./rclone-cloud-web-api"]
