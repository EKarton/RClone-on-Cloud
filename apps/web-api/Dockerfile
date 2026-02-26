# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o rclone-cloud-api .

# Final stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for secure connections
RUN apk --no-cache add ca-certificates

# Create a non-root user for security
RUN adduser -D -u 1000 appuser
USER appuser

# Copy the binary from the build stage
COPY --from=builder /app/rclone-cloud-api .

# Expose the API port
EXPOSE 8080

# Run the binary
CMD ["./rclone-cloud-api"]
