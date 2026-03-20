# RClone-Cloud Web API

This is a web API for RClone-Cloud.

## Features

- [x] OAuth2 authentication
- [x] Full RClone RCD support (https://rclone.org/commands/rclone_rcd)

## Getting started

Prerequisites:

- Docker
- Go

1. First, follow [this guide](./docs/setup_oauth2.md) to create a new GCP project for the Web API, create a new OAuth2 client, and obtain the client ID and client secrets from your newly created OAuth2 client.

1. Generate public and private keys by running:

   ```bash
   openssl genpkey -algorithm ed25519 -out private.pem
   openssl pkey -in private.pem -pubout -out public.pem
   ```

   It will create two files: `private.pem` and `public.pem`.

1. Now, run this to set the `private.pem` file and `public.pem` file as a single string:

   ```bash
   export ACCESS_TOKEN_JWT_PRIVATE_KEY=$(tr -d '\n' < private.pem)
   export ACCESS_TOKEN_JWT_PUBLIC_KEY=$(tr -d '\n' < public.pem)

   echo ${ACCESS_TOKEN_JWT_PRIVATE_KEY}
   echo ${ACCESS_TOKEN_JWT_PUBLIC_KEY}
   ```

1. First, build a `.env` file with these required environment variables:

   ```env
   RCLONE_CONFIG_ENCRYPTION_KEY=<Any string used as a secret>
   RCLONE_CONFIG_MONGODB_URI=<Your MongoDB URI>
   AUTH_ALLOWED_GOOGLE_IDS=<Your Google IDs>
   AUTH_JWT_PUBLIC_KEY=<Your JWT public key (Raw PEM string)>
   AUTH_JWT_PRIVATE_KEY=<Your JWT private key (Raw PEM string)>
   AUTH_GOOGLE_CLIENT_ID=<Your Google client ID>
   AUTH_GOOGLE_CLIENT_SECRET=123
   AUTH_GOOGLE_REDIRECT_URL=http://localhost:4200/auth/v1/google/callback
   LISTEN_ADDR=:3000
   ```

1. Install dependencies by running:

   ```shell
   go install .
   ```

1. Run the app locally by running:

   ```shell
   go run .
   ```

1. Build a production version of the app by running:

   ```shell
   mkdir -p bin
   go build -o bin/rclone-cloud-web-api .
   ```

1. Run tests by running:

   ```shell
   go test ./... -v -coverprofile=coverage.out
   ```

1. See code coverage after running the above command:

   ```shell
   go tool cover -html=coverage.out
   ```

1. Run linting by running:

   ```shell
   golangci-lint run ./...
   ```

## Running with Docker

You can run the API as a lightweight Docker container.

### 1. Build the image

```shell
docker build -t rclone-cloud-web-api .
```

### 2. Run the container

Ensure you have a `.env` file populated with the required environment variables.

```shell
docker run --env-file .env -p 9000:9000 rclone-cloud-web-api
```
