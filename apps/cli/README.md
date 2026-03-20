# RClone-Cloud CLI

The **RClone-Cloud CLI** is a Go-based command-line tool built to help you transition your local `rclone` configurations to the secure, MongoDB-backed storage used by the RClone-Cloud Web API. 

## ✨ Features

- **Migrate (`migrate`)**: Parses an existing local `rclone.conf` file, encrypts the sensitive configuration values using AES-256-GCM, and securely upserts them into a MongoDB collection.
- **Dump (`dump`)**: Connects to the MongoDB database, decrypts all remote configurations, and reconstructs a standard, INI-formatted `rclone.conf` file on your local machine.

---

## 🛠️ Prerequisites

- **Go 1.25+**
- **MongoDB** (A running instance to connect to)
- An existing **rclone config file** (for migration)

---

## 🚀 Getting Started

### Installation
You can build the binary locally:
```shell
mkdir -p bin
go build -o bin/rclone-cloud-cli .
```

### Encryption Key
Both the `dump` and `migrate` commands require the same encryption key that the Web API uses to encrypt/decrypt configurations at rest. You must set this via the `RCLONE_ENCRYPTION_KEY` environment variable.

```shell
# Must be a strong, consistent secret
export RCLONE_ENCRYPTION_KEY="your-strong-secret-key"
```

---

## 💻 Usage

### 1. Migrating to MongoDB
To migrate an existing `rclone.conf` to your MongoDB instance, use the `migrate` command.

```shell
./bin/rclone-cloud-cli migrate \
  --from-file ~/.config/rclone/rclone.conf \
  --to-mongodb-uri "mongodb+srv://admin:password@cluster.mongodb.net"
```

*This reads your local config, flattens the properties, encrypts them, and saves them to the `rclone.configs` collection in MongoDB.*

### 2. Dumping from MongoDB
If you need to view your database configs, debug, or take a backup, you can use the `dump` command to recreate a local `.conf` file from the database.

```shell
./bin/rclone-cloud-cli dump \
  --from-mongodb-uri "mongodb+srv://admin:password@cluster.mongodb.net" \
  --to-file ./dumped-rclone.conf
```

### 3. Making Config Changes
Currently, the Web API does not provide endpoints to mutate config state. To add or modify a remote:
1. Dump the current config from the database: `dump --to-file temp.conf`
2. Make your edits to `temp.conf` directly (or use standard `rclone config` targeting `temp.conf`)
3. Migrate the changes back to the database: `migrate --from-file temp.conf`

---

## 🧑‍💻 Contributing

### Running Tests
The CLI tests utilize `testcontainers-go` to spin up ephemeral MongoDB instances to ensure the commands work end-to-end. Ensure Docker is running.

```shell
# Run tests
go test ./... -v -race -coverprofile=coverage.out

# View coverage in browser
go tool cover -html=coverage.out
```

### Linting
We use `golangci-lint` to maintain code quality:
```shell
golangci-lint run ./...
```

