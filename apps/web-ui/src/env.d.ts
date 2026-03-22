interface ImportMetaEnv {
  readonly NODE_ENV: string;
  readonly NG_APP_LOGIN_URL: string;
  readonly NG_APP_WEB_API_ENDPOINT: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
