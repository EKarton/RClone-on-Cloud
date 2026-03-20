import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { WINDOW } from '../../../app.tokens';
import { webApiAuthRequestInterceptor } from '../webapi-auth-request.interceptor';

describe('webApiAuthRequestInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let windowMock: {
    localStorage: { setItem: jasmine.Spy };
    location: { href: string; pathname: string };
  };

  beforeEach(() => {
    windowMock = {
      localStorage: {
        setItem: jasmine.createSpy('setItem'),
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
        { provide: WINDOW, useValue: windowMock },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should redirect to login page and save path to local storage when web api request returns 401 error', (done) => {
    const testUrl = `${environment.webApiEndpoint}/test`;

    httpClient.get(testUrl).subscribe({
      next: () => fail('Should not have succeeded'),
      error: () => fail('Should not have failed'),
      complete: () => {
        expect(windowMock.location.href).toBe(environment.loginUrl);
        expect(windowMock.localStorage.setItem).toHaveBeenCalledWith(
          'auth_redirect_path',
          '/content/home',
        );
        done();
      },
    });

    httpMock
      .expectOne(testUrl)
      .flush('', { status: 401, statusText: 'Unauthorized' });
  });

  it('should not redirect on 401 error for non-web api requests', () => {
    const testUrl = 'https://example.com/api';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 401 error'),
      error: (error) => {
        expect(error.status).toBe(401);
        expect(windowMock.location.href).not.toBe(environment.loginUrl);
      },
    });

    httpMock
      .expectOne(testUrl)
      .flush('', { status: 401, statusText: 'Unauthorized' });
  });

  it('should pass through non-401 errors', () => {
    const testUrl = `${environment.webApiEndpoint}/test`;

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 500 error'),
      error: (error) => {
        expect(error.status).toBe(500);
        expect(windowMock.location.href).not.toBe(environment.loginUrl);
      },
    });

    httpMock
      .expectOne(testUrl)
      .flush('', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should pass through successful requests', () => {
    const testUrl = `${environment.webApiEndpoint}/test`;
    const testData = { message: 'Success' };

    httpClient.get(testUrl).subscribe((data) => {
      expect(data).toEqual(testData);
      expect(windowMock.location.href).not.toBe(environment.loginUrl);
    });

    httpMock.expectOne(testUrl).flush(testData);
  });
});
