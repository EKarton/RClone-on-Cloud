# RClone-Cloud Web API

This is a web API for RClone-Cloud.

## Features

- [ ] OAuth2 authentication
- [ ] Integrates with https://github.com/EKarton/RClone-Drive-WebUI

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
go run .
```

Build the app by running:

```shell
mkdir -p bin
go build -o bin/rclone-svc .
```

Run tests by running:

```shell
go test ./... -v
```
