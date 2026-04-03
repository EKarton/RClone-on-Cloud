# The rclone-cloud CLI tool

This is a CLI tool used to migrate your existing RClone config to the cloud, and for managing your RClone instances on that config.

It stores your RClone configurations in MongoDB with AES-256-GCM encryption, and listens to any MongoDB config changes made by the Web API.

## Features

- Migrate your RClone config file to MongoDB with AES-256-GCM encryption
- Run all rclone commands with your encrypted RClone configs stored in MongoDB

## Requirements

- Go
- Docker (not needed if you are not running test cases)

## Quick start

1. Clone and build the binary by running:

   ```bash
   git clone https://github.com/ekarton/RClone-on-Cloud.git
   cd RClone-on-Cloud/apps/cli
   go build -o rclone-cloud .
   ```

2. Set the environment variables:

   ```bash
   export MONGO_URL="mongodb+srv://admin:password@cluster.mongodb.net/yourdb"
   export MONGO_KEY="your-32-character-encryption-key"
   ```

3. Migrate your rclone config file by running:

   ```bash
   rclone-cloud migrate --from-file ~/.config/rclone/rclone.conf
   ```

4. Run any RClone command like you would with the RClone CLI, such as:

   ```bash
   rclone-cloud listremotes
   ```

5. You can also export your RClone configs stored in MongoDB back to a file by running:

   ```bash
   rclone-cloud dump --to-file ./exported-rclone.conf
   ```

## Usage

### Common commands

```bash
rclone-cloud listremotes
rclone-cloud sync ./local-folder my-remote:cloud-folder -P
rclone-cloud migrate --from-file <path>
rclone-cloud dump --to-file <path>
rclone-cloud --help
rclone-cloud --version
```

## Examples

### List all remotes

```bash
rclone-cloud listremotes
```

### Sync local folder to a remote

```bash
rclone-cloud sync ./local-folder my-remote:cloud-folder -P
```

### Export configurations to a file

```bash
rclone-cloud dump --to-file ./exported-rclone.conf
```

## Configuration

rclone-cloud checks configuration in this order:

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
```

## License

Refer to the entire project's license at [LICENSE](../../LICENSE).
