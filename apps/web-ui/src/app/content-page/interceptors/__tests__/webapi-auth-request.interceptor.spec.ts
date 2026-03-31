import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Mock, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import { WINDOW } from '../../../app.tokens';
import { webApiAuthRequestInterceptor } from '../webapi-auth-request.interceptor';

describe('webApiAuthRequestInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let windowMock: {
    localStorage: { setItem: Mock };
    location: { href: string; pathname: string };
  };
  let router: Router;

  beforeEach(() => {
    windowMock = {
      localStorage: {
        setItem: vi.fn(),
      },
      location: {
        href: '',
        pathname: '/content/home',
      },
    };

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptors([webApiAuthRequestInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: WINDOW, useValue: windowMock },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should navigate to login page and save path to local storage when web api request returns 401 error', async () => {
    const testUrl = `${environment.webApiEndpoint}/test`;

    const promise = new Promise<void>((resolve) => {
      httpClient.get(testUrl).subscribe({
        complete: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/auth/v1/google/login']);
          expect(windowMock.localStorage.setItem).toHaveBeenCalledWith(
            'auth_redirect_path',
            '/content/home',
          );
          resolve();
        },
      });
    });

    httpMock.expectOne(testUrl).flush('', { status: 401, statusText: 'Unauthorized' });

    await promise;
  });

  it('should not redirect on 401 error for non-web api requests', () => {
    const testUrl = 'https://example.com/api';

    httpClient.get(testUrl).subscribe({
      error: (error) => {
        expect(error.status).toBe(401);
        expect(router.navigate).not.toHaveBeenCalled();
      },
    });

    httpMock.expectOne(testUrl).flush('', { status: 401, statusText: 'Unauthorized' });
  });

  it('should pass through non-401 errors', () => {
    const testUrl = `${environment.webApiEndpoint}/test`;

    httpClient.get(testUrl).subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
        expect(router.navigate).not.toHaveBeenCalled();
      },
    });

    httpMock.expectOne(testUrl).flush('', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should pass through successful requests', () => {
    const testUrl = `${environment.webApiEndpoint}/test`;
    const testData = { message: 'Success' };

    httpClient.get(testUrl).subscribe((data) => {
      expect(data).toEqual(testData);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    httpMock.expectOne(testUrl).flush(testData);
  });
});
