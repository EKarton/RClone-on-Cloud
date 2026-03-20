import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { HttpCacheService } from './http-cache.service';

export const webApiHttpCacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cacheService = inject(HttpCacheService);

  // Only cache GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  // Only cache web api endpoints
  if (!req.url.startsWith(environment.webApiEndpoint)) {
    return next(req);
  }

  const cachedResponse = cacheService.get(req.urlWithParams);
  if (cachedResponse) {
    console.log(`Cache hit: ${req.url}`);
    return of(cachedResponse);
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const ttl = getTTLForUrl();
        cacheService.set(req.urlWithParams, event, ttl);
      }
    }),
  );
};

// TTL logic — customize this per endpoint
function getTTLForUrl(): number {
  return 60 * 60 * 1000;
}
