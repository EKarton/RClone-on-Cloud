# RClone-Cloud CLI

This is a CLI for RClone-Cloud.

## Features

- [x] Migrate rclone.conf to MongoDB

## Getting started

Prerequisites:

- Docker
- Go

Install dependencies by running:

```shell
go install .
```

Run the app locally by running:

```shell
go run . migrate <path/to/rclone.conf>
```

for example,

```shell
go run . migrate ~/.config/rclone/rclone.conf
```

Build the app by running:

```shell
mkdir bin
go build -o bin/rclone-cli .
```

Run tests by running:

```shell
go test ./... -v
```
