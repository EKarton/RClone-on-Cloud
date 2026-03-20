import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LRUCache } from 'lru-cache';

/** The max number of http requests to cache (100M). */
export const MAX_CACHE_SIZE = 100000;

@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  private cache = new LRUCache<string, HttpResponse<unknown>>({
    max: MAX_CACHE_SIZE,
    ttlAutopurge: true,
  });

  get(url: string): HttpResponse<unknown> | undefined {
    const cached = this.cache.get(url);
    return cached?.clone();
  }

  set(url: string, response: HttpResponse<unknown>, ttlMs: number): void {
    this.cache.set(url, response.clone(), { ttl: ttlMs });
  }

  invalidate(url: string): void {
    this.cache.delete(url);
  }

  clear(): void {
    this.cache.clear();
  }
}
