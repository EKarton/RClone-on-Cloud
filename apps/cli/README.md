# RClone-Cloud CLI

This is a CLI for RClone-Cloud.

## Features

- [x] Migrate rclone.conf to MongoDB
- [x] Dump MongoDB configs to an INI file

## Getting started

Prerequisites:

- Docker
- Go
- MongoDB URI
- RClone config file

1. First, install dependencies by running:

```shell
go install .
```

1. Generate a random string. This will be used to encrypt the contents of your RClone config file in MongoDB.

1. Migrate your RClone config file to MongoDB by running:

```shell
export RCLONE_CONFIG_ENCRYPTION_KEY=<RANDOM_STRING>
go run . migrate --from-file <path/to/rclone.conf> --to-mongodb-uri <mongodb-uri>
```

for example,

```shell
export RCLONE_CONFIG_ENCRYPTION_KEY=123
go run . migrate --from-file ~/.config/rclone/rclone.conf --to-mongodb-uri mongodb+srv://admin:password.mongodb.net
```

1. To dump the contents of your RClone config in MongoDB to your local machine, run:

```shell
export RCLONE_CONFIG_ENCRYPTION_KEY=<YOUR_ENCRYPTION_KEY>
go run . dump --from-mongodb-uri <path/to/mongodb-uri> --to-file <path/to/output/file>
```

for example,

```shell
export RCLONE_CONFIG_ENCRYPTION_KEY=123
go run . dump --from-mongodb-uri mongodb+srv://admin:password.mongodb.net --to-file ~/.config/rclone/rclone.conf
```

## Making changes to RClone config in MongoDB

1. First, download your rclone.conf file from MongoDB by running:

```shell
export RCLONE_CONFIG_ENCRYPTION_KEY=<YOUR_ENCRYPTION_KEY>
./bin/rclone-cloud-cli dump --from-mongodb-uri <path/to/mongodb-uri> --to-file <path/to/output/file>
```

1. Make your changes to the rclone.conf file, like:

```shell
rclone sync . my-remote: <path/to/mongodb-uri>
```

1. Then, upload your rclone.conf file by running:

```shell
export RCLONE_CONFIG_ENCRYPTION_KEY=<YOUR_ENCRYPTION_KEY>
./bin/rclone-cloud-cli migrate --from-file <path/to/rclone.conf> --to-mongodb-uri <mongodb-uri>
```

## Contributing

1. Run tests by running:

```shell
go test ./... -v -coverprofile=coverage.out
```

1. See test coverage by running:

```shell
go tool cover -html=coverage.out
```

1. Build the app by running:

```shell
mkdir -p bin
go build -o bin/rclone-cloud-cli .
```
