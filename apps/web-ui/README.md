# Photos Drive Web UI

[![Netlify Status](https://api.netlify.com/api/v1/badges/36282e46-c4ab-407f-8a6e-b6dbb4f40748/deploy-status)](https://app.netlify.com/sites/photos-drive-demo/deploys)
![check-code-coverage](https://img.shields.io/badge/code--coverage-100-brightgreen)

## Description

This project is a web ui for Photos Drive. This web ui allows users to list and see their photos and videos on a web browser. This web ui will only read photos and videos and never modify anything in the database.

## Getting Started

### Installation

1. First, get the Gemini API key by following [this guide](./docs/generate_gemini_api_key.md)

1. Next, install angular by running:

    ```bash
    npm install -g @angular/cli
    ```

1. Then, install the project's dependencies by running:

    ```bash
    npm install
    ```

1. Then, create a `.env` file to store your environment variables, like:

    ```text
    NG_APP_LOGIN_URL=http://localhost:3000/auth/v1/google
    NG_APP_WEB_API_ENDPOINT=http://localhost:3000

    NG_APP_GEMINI_API_KEY="YOUR_GEMINI_KEY"
    NG_APP_GEMINI_MODEL="gemini-2.5-flash"
    ```

    where:
    - `NG_APP_LOGIN_URL`: is the login url of your [web-api](./../web-api)
    - `NG_APP_WEB_API_ENDPOINT`: is the domain of your [web-api](./../web-api)
    - `NG_APP_GEMINI_API_KEY`: is the Gemini API key from the first step
    - `NG_APP_GEMINI_MODEL`: is the Gemini model to use (ex: 'gemini-2.5-flash')

1. Next, run:

    ```bash
    npm run dev
    ```

    It should start a local development server of this app to <http://localhost:4200>. Once the server is running, open your browser and navigate to <http://localhost:4200>. The application will automatically reload whenever you modify any of the source files.

## Development

### Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

### Building

To build a production-level project run:

```bash
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

You can run the optimized build of your app on <http://localhost:4200> by running:

```bash

npm run serve
```

### Linting

To check for code styles, run

```bash
npm run lint
```

To automatically fix errors in code styles, run:

```bash
npm run lint:fix
```

### Running unit tests

To run all unit tests, run:

```bash
npm run test
```

It will also check for code coverage, which you can see from the `./coverage` directory.

To only run specific unit test(s), run:

```bash
npm run test:in <path-to-test-file>
```

For instance, to only run tests under `src/app/content-page/store/media-items`, run:

```bash
npm run test:in src/app/content-page/store/media-items
```

### Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

### Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Deployment

- If you are deploying to Netlify, refer to the [docs](./docs/deploying_to_netlify.md)

## Usage

Please note that this project is used for educational purposes and is not intended to be used commercially. We are not liable for any damages/changes done by this project.

## Credits

Emilio Kartono, who made the entire project.

UX Library provided by Daisy UI.

Icons provided by <https://heroicons.com>.

## License

This project is protected under the GNU licence. Please refer to the root project's LICENSE.txt for more information.
