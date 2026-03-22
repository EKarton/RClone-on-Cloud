export const environment = {
  nodeEnv: import.meta.env.NODE_ENV || 'development',
  loginUrl:
    import.meta.env.NG_APP_LOGIN_URL ||
    'http://localhost:3000/auth/v1/google/login',
  webApiEndpoint:
    import.meta.env.NG_APP_WEB_API_ENDPOINT || 'http://localhost:3000',
};
