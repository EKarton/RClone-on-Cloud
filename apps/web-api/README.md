# RClone-Cloud Web API

This is a web API for RClone-Cloud.

## Features

- [x] OAuth2 authentication
- [x] Full RClone RCD support (https://rclone.org/commands/rclone_rcd)

## Getting started

Prerequisites:

- Docker
- Go

1. First, build a `.env` file with these required environment variables:

```
RCLONE_CONFIG_ENCRYPTION_KEY=<Your encryption key>
RCLONE_CONFIG_MONGODB_URI=<Your MongoDB URI>
AUTH_ALLOWED_GOOGLE_IDS=<Your Google IDs>
AUTH_JWT_PUBLIC_KEY_PATH=<Your JWT public key path>
AUTH_JWT_PRIVATE_KEY_PATH=<Your JWT private key path>
AUTH_GOOGLE_CLIENT_ID=<Your Google client ID>
AUTH_GOOGLE_CLIENT_SECRET=123
AUTH_GOOGLE_REDIRECT_URL=http://localhost:3000/auth/v1/google/callback
LISTEN_ADDR=:8080
```

2. Install dependencies by running:

```shell
go install .
```

3. Run the app locally by running:

```shell
go run .
```

4. Build a production version of the app by running:

```shell
mkdir -p bin
go build -o bin/rclone-svc .
```

5. Run tests by running:

```shell
go test ./... -coverprofile=coverage.out
```

6. See code coverage after running the above command:

```shell
go tool cover -html=coverage.out
```

## Running with Docker

You can run the API as a lightweight Docker container.

### 1. Build the image

```shell
docker build -t rclone-cloud-api .
```

### 2. Run the container

Ensure you have a `.env` file populated with the required environment variables.

```shell
docker run --env-file .env -p 8080:8080 rclone-cloud-api
```
