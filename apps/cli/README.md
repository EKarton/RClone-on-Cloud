# RClone-Cloud CLI

This is a CLI for RClone-Cloud.

## Features

- [x] Migrate rclone.conf to MongoDB
- [x] Dump MongoDB configs to an INI file

## Getting started

Prerequisites:

- Docker
- Go

Install dependencies by running:

```shell
go install .
```

Build the app by running:

```shell
mkdir -p bin
go build -o bin/rclone-cloud-cli .
```

Run the app locally by running:

```shell
go run . migrate <path/to/rclone.conf>
```

for example,

```shell
go run . migrate ~/.config/rclone/rclone.conf
```

Run tests by running:

```shell
go test ./... -v -coverprofile=coverage.out
```

See test coverage by running:

```shell
go tool cover -html=coverage.out
```

## Usage

1. Migrate rclone.conf to MongoDB by running:

```shell
./bin/rclone-cloud-cli migrate --from-file <path/to/rclone.conf> --to-mongodb-uri <mongodb-uri>
```

1. Dump MongoDB configs to an INI file by running:

```shell
./bin/rclone-cloud-cli dump --from-mongodb-uri <path/to/mongodb-uri> --to-file <path/to/output/file>
```

## Making changes to RClone config in MongoDB

1. First, download your rclone.conf file by running:

```shell
./bin/rclone-cloud-cli dump --from-mongodb-uri <path/to/mongodb-uri> --to-file <path/to/output/file>
```

1. Make your changes to the rclone.conf file

1. Then, upload your rclone.conf file by running:

```shell
./bin/rclone-cloud-cli migrate --from-file <path/to/rclone.conf> --to-mongodb-uri <mongodb-uri>
```
