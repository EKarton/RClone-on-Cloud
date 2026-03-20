import {
  HttpClient,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { HttpCacheService } from '../http-cache.service';
import { webApiHttpCacheInterceptor } from '../webapi-cache.interceptor';

describe('webApiHttpCacheInterceptor', () => {
  let mockCacheService: jasmine.SpyObj<HttpCacheService>;
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    mockCacheService = jasmine.createSpyObj<HttpCacheService>(
      'HttpCacheService',
      ['get', 'set'],
    );

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

  it('should return cached response if available', (done) => {
    mockCacheService.get.and.returnValue(
      new HttpResponse({
        body: 'My data',
        status: 200,
      }),
    );

    httpClient.get(environment.webApiEndpoint).subscribe((res) => {
      expect(res).toEqual('My data');
      expect(mockCacheService.get).toHaveBeenCalledWith(
        environment.webApiEndpoint,
      );
      done();
    });
  });

  it('should call next() and cache the response if not cached', (done) => {
    mockCacheService.get.and.returnValue(undefined);

    httpClient.get(environment.webApiEndpoint).subscribe((res) => {
      expect(res).toEqual('My data');
      expect(mockCacheService.get).toHaveBeenCalledWith(
        environment.webApiEndpoint,
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        environment.webApiEndpoint,
        jasmine.any(HttpResponse),
        60 * 60 * 1000,
      );
      done();
    });
    httpMock.expectOne(environment.webApiEndpoint).flush('My data');
  });

  it('should skip caching for non-GET requests', (done) => {
    httpClient.post(environment.webApiEndpoint, {}).subscribe((res) => {
      expect(res).toEqual('My data');
      expect(mockCacheService.get).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
      done();
    });
    httpMock.expectOne(environment.webApiEndpoint).flush('My data');
  });

  it('should skip caching for URLs outside webApiEndpoint', (done) => {
    const testUrl = 'https://other.com/api/data';
    httpClient.get(testUrl).subscribe((res) => {
      expect(res).toEqual('My data');
      expect(mockCacheService.get).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
      done();
    });
    httpMock.expectOne(testUrl).flush('My data');
  });
});
