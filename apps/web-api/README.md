# RClone-Cloud Web API

A secure, stateless HTTP interface to rclone for managing remote storage configurations and operations via MongoDB, protected by Google OAuth2 and JWT authentication.

## Overview

This API provides a centralized management layer for rclone remotes, enabling systems and users to interact with cloud storage providers through a hardened HTTP interface. It supports dynamic configuration loading from MongoDB and granular control over allowed rclone operations.

## Features

- Authentication and authorization via Google SSO and JWT
- Secure storage of encrypted rclone configurations in MongoDB
- Restricted proxy for rclone remote control (RC) operations
- Standardized JSON responses for all endpoints
- Integrated OpenTelemetry for tracing and performance monitoring

## Tech Stack

- Language: Go 1.25+
- Database: MongoDB 7.0+
- Auth: JWT / Google OAuth2
- Testing: Go test / Testcontainers
- Observability: OpenTelemetry (OTLP)

## Project Structure

```text
.
├── auth/               # Google OAuth2 and JWT implementation
├── docs/               # Technical documentation and setup guides
├── rclone/             # Rclone core integration and handlers
│   ├── configs/        # MongoDB configuration storage logic
├── shared/             # Shared utilities (CORS, JWT)
├── telemetry/          # OpenTelemetry initialization
├── Dockerfile          # Production container definition
├── env.go              # Environment configuration loading
├── main.go             # Application entrypoint
└── README.md
```

## Prerequisites

- Go 1.25 or higher
- golangci-lint (for linting)
- MongoDB 7.0+
- Docker (for containerized deployment and integration tests)
- Google Cloud Project with OAuth2 credentials

## Getting Started

1. Create a `.env` file in the `apps/web-api` directory.

   ```env
   RCLONE_CONFIG_MONGO_KEY=your-aes-256-key
   RCLONE_CONFIG_MONGO_URI=mongodb://localhost:27017
   RCLONE_CONFIG_MONGO_DB=rclone
   RCLONE_CONFIG_MONGO_COL=configs

   AUTH_ALLOWED_GOOGLE_IDS=id1,id2
   AUTH_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
   AUTH_GOOGLE_CLIENT_SECRET=your-secret
   AUTH_GOOGLE_REDIRECT_URL=http://localhost:8080/auth/v1/google/callback

   LISTEN_ADDR=:8080
   CORS_ALLOWED_URLS=http://localhost:4200

   AUTH_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   AUTH_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

   OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net
   OTEL_EXPORTER_OTLP_HEADERS=api-key=your-key
   ```

2. Install dependencies, build the binary and run the application by running

   ```bash
   go mod download
   go build -o rclone-cloud-web-api
   ./rclone-cloud-web-api
   ```

   or run with Docker:

   ```bash
   docker build -t rclone-cloud-web-api .
   docker run -d --name rclone-web-api --env-file .env -p 8080:8080 rclone-cloud-web-api
   ```

   The API will be available at:

   ```text
   http://localhost:8080
   ```

3. Run unit and integration tests with:

   ```bash
   go test -v ./...
   ```

4. Run linter by running:

   ```bash
   golangci-lint run ./...
   ```

## Authentication

The API utilizes a dual-layer authentication strategy:

1. **Google OAuth2**: Used for initial user identification and onboarding.
2. **JWT**: Short-lived tokens issued by the API after successful Google verification.

Clients must include the JWT in the Authorization header:

```http
Authorization: Bearer <token>
```

## API Conventions

- Base URL Prefix: `/api/v1/rclone/` for storage operations
- Authentication Prefix: `/auth/v1/google/`
- Content type: `application/json`
- Date format: ISO 8601
- Error Format: JSON with an "error" field

## Endpoints

| Method | Route                             | Description                      |
| ------ | --------------------------------- | -------------------------------- |
| GET    | /auth/v1/google/login             | Initiate Google OAuth2 flow      |
| POST   | /auth/v1/google/callback          | Exchange Google code for API JWT |
| POST   | /api/v1/rclone/rc/noop            | Rclone no-op check (heartbeat)   |
| POST   | /api/v1/rclone/config/listremotes | List all configured remotes      |
| POST   | /api/v1/rclone/operations/list    | List items in a remote path      |
| POST   | /api/v1/rclone/sync/copy          | Copy items between remotes       |
| GET    | /api/v1/rclone/[{remote}]/{path}  | Direct file/directory access     |

## Example Request

```bash
curl -X POST http://localhost:8080/api/v1/rclone/operations/list \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fs": "mys3:",
    "remote": "backups/daily"
  }'
```

## Example Response

```json
{
  "list": [
    {
      "Path": "db_dump.sql",
      "Name": "db_dump.sql",
      "Size": 450231,
      "MimeType": "application/sql",
      "IsDir": false
    }
  ]
}
```

## Error Handling

Example error response:

```json
{
  "error": "unauthorized access for user id: 1015389426"
}
```

## Observability

- Metrics/Tracing: OpenTelemetry (OTLP) integrated for request tracking and performance monitoring.
- Logs: Structured logging via standard output, compatible with cloud logging providers.

## Deployment

Deploy as a stateless container to Kubernetes, ECS, or similar platforms. Ensure the MongoDB instance is accessible and environment variables for encryption keys and OAuth2 are correctly provisioned via secrets management.

## Security Notes

- Do not commit secrets or `.env` files to source control
- Regularly rotate the `RCLONE_CONFIG_MONGO_KEY` and JWT asymmetric keys
- Enforce HTTPS for all non-local traffic
- Maintain a strict `AUTH_ALLOWED_GOOGLE_IDS` allowlist

## Roadmap

- [ ] Implement rate limiting for each endpoint
- [ ] Generate OpenAPI documentation from route definitions
- [ ] Implement health check endpoint (`/health`)

## Contributing

Please open an issue to discuss proposed changes before submitting a pull request. Ensure all contributions include appropriate unit tests and adhere to the project's Go linting standards.
