import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { hasFailed, toSuccess } from '../../../shared/results/results';
import { TokenResponse, WebApiService } from '../webapi.service';

describe('WebApiService', () => {
  let service: WebApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WebApiService,
      ],
    });

    service = TestBed.inject(WebApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch access token', () => {
    const mockCode = 'test-auth-code';
    const mockResponse: TokenResponse = {
      token: 'mockAccessToken',
    };

    service.fetchAccessToken(mockCode).subscribe((response) => {
      expect(response).toEqual(toSuccess(mockResponse));
    });

    const req = httpMock.expectOne(
      `${environment.webApiEndpoint}/auth/v1/google/callback`,
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: mockCode });

    req.flush(mockResponse);
  });

  it('should handle error response', () => {
    const mockCode = 'test-auth-code';

    service.fetchAccessToken(mockCode).subscribe({
      next: (response) => {
        expect(hasFailed(response)).toBeTrue();
        expect(response.error).toBeInstanceOf(HttpErrorResponse);
        expect((response.error as HttpErrorResponse).error).toBe(
          'Server error',
        );
      },
    });

    const req = httpMock.expectOne(
      `${environment.webApiEndpoint}/auth/v1/google/callback`,
    );

    req.flush('Server error', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  });
});
