# 🌌 RClone-on-Cloud CLI

The **RClone-on-Cloud CLI** is a powerful extension of the legendary `rclone`, redesigned to store your cloud configurations securely in **MongoDB** with **AES-256-GCM** encryption. 

Manage your cloud files with the same familiar `rclone` syntax while keeping your configurations centralized and secure.

---

## 🚀 Quick Start

### 1. Configure your Environment
Set your MongoDB connection and encryption key as environment variables.

```bash
# Your MongoDB connection string
export MONGO_URL="mongodb+srv://admin:password@cluster.mongodb.net/yourdb"

# Your 32-character encryption key (must match your Web API key)
export MONGO_KEY="your-super-secret-encryption-key-32"
```

> [!TIP]
> You can also use `--mongo-url` and `--mongo-key` flags directly on any command.

### 2. Run any RClone Command
Once configured, you can run any standard `rclone` command. The CLI automatically loads your remotes from MongoDB.

```bash
# List all your remotes stored in MongoDB
go run . listremotes

# Sync a local folder to a cloud remote
go run . sync ./local-folder my-remote:cloud-folder -P

# Mount a remote
go run . mount my-remote: /path/to/mount
```

---

## 🛠️ Custom Commands

We've added specialized commands to help you manage your configuration lifecycle.

### 🍱 Migration (`migrate`)
Move your existing local `rclone.conf` into the secure MongoDB storage.

```bash
go run . migrate --from-file ~/.config/rclone/rclone.conf
```
*This reads your local config, encrypts it, and upserts it into MongoDB.*

### 📥 Dump (`dump`)
Need your configs back in a standard INI format? Export them effortlessly.

```bash
go run . dump --to-file ./exported-rclone.conf
```
*This fetches your encrypted configs from MongoDB and decrypts them into a local file.*

---

## ⚙️ Advanced Configuration

You can further customize the MongoDB storage using these optional variables:

| Environment Var | Flag | Default | Description |
| :--- | :--- | :--- | :--- |
| `MONGO_DB` | `--mongo-db` | `rclone` | MongoDB database name |
| `MONGO_COL` | `--mongo-col` | `configs` | MongoDB collection name |

---

## 🏗️ Development

### Building the Binary
```bash
go build -o rclone-cloud .
```

### Running Tests
The CLI uses `testcontainers-go` for end-to-end testing with an ephemeral MongoDB instance. Ensure Docker is running.
```bash
go test ./... -v
```

---

<div align="center">
  <sub>Built with ❤️ for the RClone Community</sub>
</div>
