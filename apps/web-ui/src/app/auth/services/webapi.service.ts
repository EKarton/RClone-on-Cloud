import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, startWith, of } from 'rxjs';
import { Result, toFailure, toPending, toSuccess } from '../../shared/results/results';
import { environment } from '../../../environment/environment';

export interface TokenResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthWebApiService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.webApiEndpoint;

  fetchAccessToken(code: string): Observable<Result<TokenResponse>> {
    return this.http.get<TokenResponse>(`${this.apiUrl}/auth/v1/google/callback`, {
      params: { code }
    }).pipe(
      map(response => toSuccess(response)),
      catchError(error => of(toFailure<TokenResponse>(new Error(error.message ?? 'Unknown error')))),
      startWith(toPending<TokenResponse>())
    );
  }
}
