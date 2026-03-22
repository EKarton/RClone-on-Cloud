# ☁️ RClone-on-Cloud

**RClone-on-Cloud** transforms the popular [rclone](https://rclone.org/) utility into a secure, scalable, and stateless web service. It provides a restricted API gateway that proxies Remote Control (`rc`) operations, securing your remote configurations in a MongoDB database rather than relying on local files.

This repository is structured as a monorepo containing two core applications:

1. **[Web API (`apps/web-api`)](./apps/web-api/README.md)**: The core REST API that exposes the secure rclone interface.
2. **[Web UI (`apps/web-ui`)](./apps/web-ui/README.md)**: The Angular frontend that provides a user-friendly interface to browse remotes and view files.
3. **[CLI Client (`apps/cli`)](./apps/cli/README.md)**: A command-line companion tool to help synchronize, migrate, and manage your configurations between your local machine and your MongoDB database.

---

## 🏗️ Architecture & Security Model

Running `rclone` in the cloud securely presents two major challenges: securing the Remote Control endpoints against abuse, and protecting the plaintext remote secrets (passwords, tokens, API keys) normally stored in `rclone.conf`.

RClone-on-Cloud solves this by:

- **1. Centralized MongoDB Configuration (Encrypted-at-Rest)**
  The applications bypass the local filesystem entirely. Rclone configurations are dynamically pulled from a MongoDB collection. Before any configuration is written to the database, it is encrypted locally using **AES-256-GCM** with a symmetric key (`RCLONE_ENCRYPTION_KEY`). This ensures your credentials are never stored in plaintext.

- **2. Google OAuth2 + JWT Gateway**
  The Web API requires users to authenticate via **Google OAuth2**. It enforces a strict allowlist of authorized Google Account Subject IDs. If an authorized user logs in, the API issues a short-lived, **Asymmetrically Signed JWT** (RSA/Ed25519) that must be passed as a Bearer token to access the rclone endpoints.

- **3. Restricted Operation Allowlist**
  The Web API does not expose the entire `rclone rc` surface area. It acts as an active proxy, explicitly blocking any administrative or dangerous core commands (e.g., `core/version`, `fscache/clear`) and only forwarding known safe data-transfer commands (`sync/copy`, `operations/deletefile`, etc.).

---

## 📂 Project Structure

```text
.
├── apps/
│   ├── cli/       # Go 1.25 Cobra CLI (Migrate & Dump Configs to MongoDB)
│   ├── web-api/   # Go 1.25 REST API (Rclone RC Proxy, Google OAuth2, JWTs)
│   └── web-ui/    # Angular Web UI (Frontend for browsing remotes and files)
├── .github/
│   └── workflows/ # Automated CI/CD (Linting, Tests, Docker Builds)
└── README.md
```

*(Note: The `apps/cli` application explicitly consumes the `apps/web-api` module to reuse the MongoDB config and encryption storage layers.)*

---

## 🛠️ Continuous Integration (CI/CD)

This repository enforces strict code quality and build verification through GitHub Actions:
- **Build Checks**: Both applications are built on every push and PR using `go build ./...`
- **Linting**: Automated linting via [`golangci-lint`](https://golangci-lint.run/).
- **Testing (`testcontainers-go`)**: The test suites for both apps automatically spin up ephemeral Dockerized MongoDB instances (`mongo:7.0`) to run integration and unit tests (`go test -v -race ./...`).
- **Docker Verification**: Verifies the production `Dockerfile` builds successfully.

---

## 📖 Getting Started

To get started, head over to the documentation for each application:
- 👉 **[CLI Documentation](./apps/cli/README.md)** (Use this to upload your local `rclone.conf` to your database)
- 👉 **[Web API Documentation](./apps/web-api/README.md)** (Start here to deploy your server)
- 👉 **[Web UI Documentation](./apps/web-ui/README.md)** (Learn how to run the frontend application)
