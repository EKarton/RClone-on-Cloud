import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { authFeature } from './auth/store/auth.reducer';
import { webApiAuthRequestInterceptor } from './content-page/interceptors/webapi-auth-request.interceptor';
import { webApiHttpCacheInterceptor } from './content-page/interceptors/webapi-cache.interceptor';
import { ThemeEffects } from './themes/store/theme.effects';
import { themeFeature } from './themes/store/theme.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([webApiAuthRequestInterceptor, webApiHttpCacheInterceptor])),
    provideRouter(routes),
    provideStore({}),

    provideState(themeFeature),
    provideState(authFeature),

    provideEffects(ThemeEffects),

    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};
