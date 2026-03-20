# RClone-Cloud Web UI

This project is a modern, responsive Angular application acting as the frontend for the [RClone-Cloud Web API](../web-api). It allows you to securely authenticate via Google OAuth2 and manage your configured RClone remote backends directly from your browser.

## Tech Stack
- **Framework**: Angular 19 (Standalone Components)
- **Styling**: Tailwind CSS & DaisyUI
- **State Management**: NgRx (Store, Effects)
- **Tooling**: Vite/esbuild & `@ngx-env/builder` for native `.env` variable parsing

## Prerequisites
Before you begin, ensure you have Node.js and npm installed.

You will also need to install the Angular CLI globally if you haven't already:
```bash
npm install -g @angular/cli
```

## Getting Started

1. **Install Dependencies**
   Navigate to the `apps/web-ui` directory and install the required npm packages:
   ```bash
   cd apps/web-ui
   npm install
   ```

2. **Configure Environment Variables**
   The application uses `@ngx-env/builder` to load environment variables from a `.env` file. Create a `.env` file in the root of the `apps/web-ui` directory:
   ```bash
   NG_APP_LOGIN_URL=http://localhost:3000/auth/v1/google/login
   NG_APP_WEB_API_ENDPOINT=http://localhost:3000
   ```
   *(Ensure these URLs point to where your Go Web API is currently running. If you deploy to production, update these values accordingly!)*

3. **Run the Development Server**
   Start the Angular application locally:
   ```bash
   ng serve
   ```
   The application will be available at `http://localhost:4200/`.

## Architecture Overview

1. **Authentication Flow**
   When a user clicks "Login", they are redirected to the Go API's Google OAuth2 login endpoint. Upon successful login, Google redirects the user back to `/auth/v1/google/callback` on this Angular app, providing an authorization `code`. The Angular NgRx Effects layer then securely exchanges this code for a JWT via the API, saving it into the local state.
   
2. **RClone Services**
   The `RcloneWebApiService` interacts seamlessly with the Web API. It directly injects the NgRx Auth Store to extract the stored JWT and uses it as an `Authorization: Bearer` header when querying endpoints like `/config/listremotes` and `/operations/list`.

3. **Result Wrapper Pattern**
   To gracefully handle HTTP network and validation errors without tearing down RxJS observable streams, we utilize a custom `Result<T>` wrapper pattern. All API fetches return cleanly typed models dictating both `data`, `isLoading`, and `error` states directly to the components.

## Testing & Linting

To execute the unit tests (Vitest configuration):
```bash
ng test
```

To run the TypeScript linter:
```bash
ng lint
```

## Building for Production

To build a minimized, statically-compiled version of the Web UI for production deployment:
```bash
ng build
```
The compiled assets will be available in the `dist/web-ui` directory, ready to be served by NGINX, Apache, or exported to GitHub Pages/Render!
