import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import {
  hasFailed,
  Result,
  toPending,
  toSuccess,
} from '../../../shared/results/results';
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

    const emissions: Result<TokenResponse>[] = [];
    service.fetchAccessToken(mockCode).subscribe((response) => {
      emissions.push(response);
    });

    const req = httpMock.expectOne(
      `${environment.webApiEndpoint}/auth/v1/google/callback`,
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: mockCode });

    req.flush(mockResponse);

    expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
  });

  it('should handle error response', () => {
    const mockCode = 'test-auth-code';

    const emissions: Result<TokenResponse>[] = [];
    service.fetchAccessToken(mockCode).subscribe({
      next: (response) => {
        emissions.push(response);
      },
    });

    const req = httpMock.expectOne(
      `${environment.webApiEndpoint}/auth/v1/google/callback`,
    );

    req.flush('Server error', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(emissions.length).toBe(2);
    expect(emissions[0]).toEqual(toPending());
    expect(hasFailed(emissions[1])).toBeTrue();
    expect(emissions[1].error).toBeInstanceOf(HttpErrorResponse);
    expect((emissions[1].error as HttpErrorResponse).error).toBe(
      'Server error',
    );
  });
});
