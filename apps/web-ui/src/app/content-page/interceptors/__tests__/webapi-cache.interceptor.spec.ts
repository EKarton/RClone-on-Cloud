import {
  HttpClient,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Mocked, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import { HttpCacheService } from '../http-cache.service';
import { webApiHttpCacheInterceptor } from '../webapi-cache.interceptor';

describe('webApiHttpCacheInterceptor', () => {
  let mockCacheService: Mocked<HttpCacheService>;
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
    } as unknown as Mocked<HttpCacheService>;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([webApiHttpCacheInterceptor])),
        provideHttpClientTesting(),
        { provide: HttpCacheService, useValue: mockCacheService },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should return cached response if available', async () => {
    mockCacheService.get.mockReturnValue(
      new HttpResponse({
        body: 'My data',
        status: 200,
      }),
    );

    const promise = new Promise<void>((resolve) => {
      httpClient.get(environment.webApiEndpoint).subscribe((res) => {
        expect(res).toEqual('My data');
        expect(mockCacheService.get).toHaveBeenCalledWith(environment.webApiEndpoint);
        resolve();
      });
    });

    await promise;
  });

  it('should call next() and cache the response if not cached', async () => {
    mockCacheService.get.mockReturnValue(undefined);

    const promise = new Promise<void>((resolve) => {
      httpClient.get(environment.webApiEndpoint).subscribe((res) => {
        expect(res).toEqual('My data');
        expect(mockCacheService.get).toHaveBeenCalledWith(environment.webApiEndpoint);
        expect(mockCacheService.set).toHaveBeenCalledWith(
          environment.webApiEndpoint,
          expect.any(HttpResponse),
          60 * 60 * 1000,
        );
        resolve();
      });
    });

    httpMock.expectOne(environment.webApiEndpoint).flush('My data');
    await promise;
  });

  it('should skip caching for non-GET requests', async () => {
    const promise = new Promise<void>((resolve) => {
      httpClient.post(environment.webApiEndpoint, {}).subscribe((res) => {
        expect(res).toEqual('My data');
        expect(mockCacheService.get).not.toHaveBeenCalled();
        expect(mockCacheService.set).not.toHaveBeenCalled();
        resolve();
      });
    });

    httpMock.expectOne(environment.webApiEndpoint).flush('My data');
    await promise;
  });

  it('should skip caching for URLs outside webApiEndpoint', async () => {
    const testUrl = 'https://other.com/api/data';
    const promise = new Promise<void>((resolve) => {
      httpClient.get(testUrl).subscribe((res) => {
        expect(res).toEqual('My data');
        expect(mockCacheService.get).not.toHaveBeenCalled();
        expect(mockCacheService.set).not.toHaveBeenCalled();
        resolve();
      });
    });

    httpMock.expectOne(testUrl).flush('My data');
    await promise;
  });
});
