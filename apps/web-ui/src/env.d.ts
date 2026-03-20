// Define the type of the environment variables.
declare interface Env {
  readonly NODE_ENV: string;
  readonly NG_APP_LOGIN_URL: string;
  readonly NG_APP_WEB_API_ENDPOINT: string;
  readonly NG_APP_GEMINI_API_KEY: string;
  readonly NG_APP_GEMINI_MODEL: string;
}

declare interface ImportMeta {
  readonly env: Env;
}
