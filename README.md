# RClone-on-Cloud

### Description

The **RClone-on-Cloud** project aims to provide a secure, scalable, and stateless web service for [rclone](https://rclone.org/). It stores the rclone configuration files in a secure, centralized MongoDB storage, encrypted with AES-256-GCM and authenticated with a Google OAuth2 + JWT gateway.

The RClone-on-Cloud project is a full stack web development project. It is comprised of several components: the **Web API**, **Web UI**, and the **CLI Client**.

### Table of Contents

- Walkthrough
- Installation
- Usage
- Credits
- License

### Walkthrough of this project

This project consists of several components, each responsible for performing a certain task to manage your cloud configurations securely. The diagram below illustrates the system architecture of the project.

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "background": "transparent",
    "mainBkg": "transparent",
    "primaryColor": "transparent",
    "primaryBorderColor": "#444",
    "lineColor": "#444",
    "textColor": "#111",
    "nodeBorder": "#444",
    'edgeLabelBackground': 'transparent',
  }
}}%%
graph LR
    subgraph "Local Environment"
        CLI[CLI Client]
    end

    subgraph "Cloud / Storage"
        MongoDB[(RClone Configs in\n MongoDB)]
    end

    subgraph "Cloud / Web"
        WebUI[Web UI]
        WebAPI[Web API]
    end

    WebUI --> WebAPI
    WebAPI <--> MongoDB
    CLI <--> MongoDB
```

Users can use the front-end web application to browse their cloud files from their remotes directly from their browser.

<div width="100%">
    <p align="center">
<img src="./apps/web-ui/public/assets/home-page/contents-table-view.png" width="600px"/>
    </p>
</div>

The application includes a file viewers to easily preview your content stored on the cloud.

<div width="100%">
    <p align="center">
    <img src="./apps/web-ui/public/assets/home-page/pdf-viewer.png"  width="600px"/>
    </p>
</div>

Users can also modify content in the cloud, such as uploading new content, renaming files / directories, moving files / directories, and deleting files / directories.

<div width="100%">
    <p align="center">
    <img src="./apps/web-ui/public/assets/home-page/modify-content.png"  width="600px"/>
    </p>
</div>

It also provides a mobile-responsive interface for managing your files on the go.

### Installation

##### Required Programs and Tools:

- Go 1.25+
- Node.js & npm
- MongoDB 7.0+ (Local or Atlas)

##### Set up the database

- Install MongoDB on your machine or use a MongoDB Atlas instance.
- Create a new database (default name: `rclone`) and a collection (default name: `configs`).
- Ensure you have a valid connection string (e.g., `mongodb://localhost:27017`).

##### Set up the Web API:

- Set up your Google Cloud OAuth2 credentials.
- Navigate to the `apps/web-api` directory.
- Create a `.env` file and set the following environment variables:
  - `RCLONE_CONFIG_MONGO_KEY`: A 32-character encryption key.
  - `RCLONE_CONFIG_MONGO_URI`: Your MongoDB connection URI.
  - `AUTH_GOOGLE_CLIENT_ID` / `AUTH_GOOGLE_CLIENT_SECRET`: Your Google Cloud OAuth2 credentials.
- Generate an RSA or Ed25519 key pair for JWT signing and add the PEM strings to your `.env` (refer to the [Web API README](./apps/web-api/README.md) for details).
- Download dependencies and run the API:
  ```bash
  go mod download
  go run .
  ```

##### Set up the Web UI:

1. Navigate to the `apps/web-ui` directory.
2. Install the project's dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file to store your API endpoints:

   ```text
   NG_APP_LOGIN_URL=http://localhost:3000/auth/v1/google
   NG_APP_WEB_API_ENDPOINT=http://localhost:3000
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

##### Set up the CLI:

1. Navigate to the `apps/cli` directory.
2. Build the binary locally:

   ```bash
   go build -o rclone-cloud .
   ```

3. Set your environment variables (`MONGO_URL` and `MONGO_KEY`) to match those used by the Web API.
4. Migrate your existing `rclone.conf` to the MongoDB storage by running:

   ```bash
   ./rclone-cloud migrate --from-file <path/to/rclone.conf>
   ```

5. Now, you can run any RClone command such as:

   ```bash
   ./rclone-cloud listremotes
   ./rclone-cloud config
   ./rclone-cloud lsd <remote>:
   ./rclone-cloud ls <remote>:
   ./rclone-cloud sync . <remote>:Documents
   ./rclone-cloud copy file.txt <remote>:
   ...
   ```

   You can find more available commands at https://rclone.org/commands.

- Note: each time the configs change in MongoDB, the CLI and the Web API automatically picks up the new changes.

### Usage

Please note that this project is used for educational purposes and is not intended to be used commercially. We are not liable for any damages/changes done by this project.

### Credits

Emilio Kartono, who made the entire project.

### License

This project is protected under the GNU licence. Please refer to the [LICENSE](./LICENSE) for more information.
