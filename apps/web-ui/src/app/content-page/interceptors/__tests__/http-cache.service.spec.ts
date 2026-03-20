import { HttpResponse } from '@angular/common/http';

import { HttpCacheService, MAX_CACHE_SIZE } from '../http-cache.service';

describe('HttpCacheService', () => {
  let service: HttpCacheService;
  const testUrl = '/api/test';

  beforeEach(() => {
    service = new HttpCacheService();
    service.clear();
  });

  function createResponse<T>(body: T): HttpResponse<T> {
    return new HttpResponse<T>({
      body,
      status: 200,
      statusText: 'OK',
      url: testUrl,
    });
  }

  it('should store and retrieve a cached response', () => {
    const response = createResponse({ message: 'success' });

    service.set(testUrl, response, 1000); // 1s TTL
    const cached = service.get(testUrl);

    expect(cached).toBeTruthy();
    expect(cached?.body).toEqual({ message: 'success' });
    expect(cached).not.toBe(response); // ensure it's cloned
  });

  it('should return undefined if no cached entry exists', () => {
    const cached = service.get('/not/cached');
    expect(cached).toBeUndefined();
  });

  it('should delete a cached entry', () => {
    const response = createResponse({ data: 'test' });

    service.set(testUrl, response, 1000);
    expect(service.get(testUrl)).toBeTruthy();

    service.invalidate(testUrl);
    expect(service.get(testUrl)).toBeUndefined();
  });

  it('should clear all cached entries', () => {
    service.set('/1', createResponse({}), 1000);
    service.set('/2', createResponse({}), 1000);

    expect(service.get('/1')).toBeTruthy();
    expect(service.get('/2')).toBeTruthy();

    service.clear();

    expect(service.get('/1')).toBeUndefined();
    expect(service.get('/2')).toBeUndefined();
  });

  it('should respect TTL and expire entries', (done) => {
    const response = createResponse({ msg: 'temp' });

    service.set(testUrl, response, 100); // 100ms TTL
    expect(service.get(testUrl)).toBeTruthy();
    setTimeout(() => {
      expect(service.get(testUrl)).toBeUndefined();
      done();
    }, 150);
  });

  it('should enforce max cache size (evict old entries)', () => {
    const entriesToAdd = MAX_CACHE_SIZE + 10;

    for (let i = 0; i < entriesToAdd; i++) {
      service.set(`/entry/${i}`, createResponse({ i }), 5000);
    }

    // Oldest should be evicted
    expect(service.get('/entry/0')).toBeUndefined();
    expect(service.get(`/entry/${entriesToAdd - 1}`)).toBeTruthy();
  });
});
