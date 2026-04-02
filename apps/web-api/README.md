# RClone-Cloud Web API

The **RClone-Cloud Web API** is a secure, stateless HTTP interface to [rclone](https://rclone.org/). Built with Go 1.25, it securely manages your rclone remote configurations via MongoDB and exposes a curated list of remote control (`rc`) operations protected by Google OAuth2 and JWT-based authentication.

## ✨ Features

- **Restricted Rclone Proxy**: Safely exposes a subset of `rclone rc` operations (e.g., `operations/list`, `sync/copy`, `operations/deletefile`) while rejecting administrative or dangerous commands.
- **MongoDB Config Storage**: Rclone configurations are entirely stateless to the container and are dynamically loaded from a MongoDB collection.
- **Encrypted at Rest**: All remote configuration secrets and tokens in MongoDB are encrypted at rest using AES-256-GCM.
- **Google OAuth2 Authentication**: Authenticate directly with Google. Access is strictly limited to an allowlist of permitted Google subject IDs.
- **JWT Authorization**: The API issues its own short-lived, signed JWTs to authorized users. These are required as Bearer tokens to access the `rclone` endpoints.
- **Docker Ready**: Designed to be lightweight and scalable as a simple Docker container.

---

## 🛠️ Prerequisites

- **Go 1.25+** (if running locally)
- **Docker** (if running via container)
- **MongoDB 7.0+** (can use Atlas or run locally)
- **Google Cloud Console Project** (for OAuth2 Client IDs)

---

## 🚀 Getting Started

### 1. Configure Google OAuth2
Follow [this guide](./docs/setup_oauth2.md) to create a new Google Cloud project, configure the OAuth consent screen, and obtain your **Client ID** and **Client Secret**.

### 2. Generate JWT Keys
The API requires an asymmetric key pair to sign and verify its own JWTs. You can generate an RSA or Ed25519 key pair:

```bash
# Generate Ed25519 private key
openssl genpkey -algorithm ed25519 -out private.pem
# Extract the public key
openssl pkey -in private.pem -pubout -out public.pem
```

*(Note: When setting the environment variables, you must provide the raw, multiline PEM strings.)*

### 3. Environment Variables
Create a `.env` file in the `apps/web-api` directory with the following variables:

```env
# Encryption key for MongoDB configs (must be a strong secret)
RCLONE_CONFIG_MONGO_KEY=super-secret-aes-key-change-me

# MongoDB Connection
RCLONE_CONFIG_MONGO_URI=mongodb://localhost:27017
RCLONE_CONFIG_MONGO_DB=rclone
RCLONE_CONFIG_MONGO_COL=configs

# Comma-separated list of allowed Google Account Subject IDs (Required for access)
AUTH_ALLOWED_GOOGLE_IDS=10123456789,10987654321

# Google OAuth2 Credentials
AUTH_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
AUTH_GOOGLE_REDIRECT_URL=http://localhost:3000/auth/v1/google/callback

# Server Configuration
LISTEN_ADDR=:3000

# JWT Keys (Ensure formatting is preserved if exporting via bash, or just paste the multi-line string into your deployment environment)
AUTH_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
AUTH_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
```

---

## 💻 Development

### Running Locally
To run the server locally on your machine:
```shell
# Download dependencies
go mod download

# Run the API
go run .
```

### Running Tests
The test suite utilizes `testcontainers-go` to spin up ephemeral MongoDB instances to ensure the configuration storage and retrieval logic is fully tested. Ensure Docker is running locally before running the tests.

```shell
# Run all tests with race detection
go test -v -race ./...

# View coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Running Linting
We use `golangci-lint` to maintain code quality:
```shell
golangci-lint run ./...
```

---

## 🐳 Docker Deployment

The API is bundled with a `Dockerfile` for seamless deployment.

**1. Build the image:**
```shell
docker build -t rclone-cloud-web-api .
```

**2. Run the container:**
Make sure you pass in the `.env` file containing your secrets.
```shell
docker run -d \
  --name rclone-api \
  --env-file .env \
  -p 3000:3000 \
  rclone-cloud-web-api
```
