# The rclone-cloud CLI tool

This is a CLI tool used to migrate your existing RClone config to the cloud, and for managing your RClone instances remotely.

This tool simply wraps around the popular [rclone](https://github.com/rclone/rclone) project but changes the config backend to MongoDB.

It stores your RClone configs in MongoDB with AES-256-GCM encryption, and listens to any MongoDB config changes made by the Web API.

## Features

- Migrate your RClone config file to MongoDB with AES-256-GCM encryption
- Run all rclone commands with your encrypted RClone configs stored in MongoDB

## Requirements

- Go
- Docker (not needed if you are not running test cases)
- golangci-lint (not needed if you are not running linting)

## Quick start

1. Clone and build the binary by running:

   ```bash
   git clone https://github.com/ekarton/RClone-on-Cloud.git
   cd RClone-on-Cloud/apps/cli
   go mod download
   go build -o rclone-cloud .
   ```

2. Set the environment variables:

   ```bash
   export MONGO_URL="mongodb+srv://admin:password@cluster.mongodb.net/yourdb"
   export MONGO_KEY="your-32-character-encryption-key"
   ```

3. Migrate your rclone config file by running:

   ```bash
   ./rclone-cloud migrate --from-file ~/.config/rclone/rclone.conf
   ```

4. Run any RClone command like you would with the RClone CLI, such as:

   ```bash
   ./rclone-cloud listremotes
   ```

5. You can also export your RClone configs stored in MongoDB back to a file by running:

   ```bash
   ./rclone-cloud dump --to-file ./exported-rclone.conf
   ```

## Usage

### Common commands

```bash
# List all remotes
./rclone-cloud listremotes

# Upload everything under ./local-folder to your cloud folder under your remote
./rclone-cloud sync ./local-folder my-remote:cloud-folder -P

# Migrate your rclone config file to MongoDB with AES-256-GCM encryption
./rclone-cloud migrate --from-file <path>

# Export configurations to a file
./rclone-cloud dump --to-file <path>

# Show help
./rclone-cloud --help

# Show version
./rclone-cloud --version
```

## Configuration

./rclone-cloud checks configuration in this order:

1. Command-line flags
2. Environment variables
3. Default values

Environment variables:

```bash
export MONGO_URL=your_mongodb_url
export MONGO_KEY=your_32_char_key
export MONGO_DB=rclone
export MONGO_COL=configs
```

## Development

```bash
# Install dependencies
go mod download

# Run tests (requires Docker for MongoDB container)
go test ./... -v

# Build binary
go build -o rclone-cloud .

# Lint
golangci-lint run ./...
```

## License

Refer to the entire project's license at [LICENSE](../../LICENSE).
