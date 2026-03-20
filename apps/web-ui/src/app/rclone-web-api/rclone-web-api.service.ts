import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, catchError, map, startWith, of, switchMap, take } from 'rxjs';
import { Result, toFailure, toPending, toSuccess } from '../shared/results/results';
import { selectToken } from '../auth/store';
import { environment } from '../../environment/environment';

export interface ListRemotesResponse {
  remotes: string[];
}

export interface ListOperationsResponse {
  list: any[];
}

@Injectable({ providedIn: 'root' })
export class RcloneWebApiService {
  private http = inject(HttpClient);
  private store = inject(Store);
  private readonly apiUrl = environment.webApiEndpoint;

  private getToken(): Observable<string | null> {
    return this.store.select(selectToken).pipe(take(1));
  }

  listRemotes(): Observable<Result<ListRemotesResponse>> {
    return this.getToken().pipe(
      switchMap(token => {
        if (!token) {
          return of(toFailure<ListRemotesResponse>(new Error('No token available in store')));
        }
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.post<ListRemotesResponse>(`${this.apiUrl}/config/listremotes`, {}, { headers }).pipe(
          map(response => toSuccess(response)),
          catchError(error => of(toFailure<ListRemotesResponse>(new Error(error.message ?? 'Unknown error'))))
        );
      }),
      startWith(toPending<ListRemotesResponse>())
    );
  }

  listOperations(remoteId: string): Observable<Result<ListOperationsResponse>> {
    return this.getToken().pipe(
      switchMap(token => {
        if (!token) {
          return of(toFailure<ListOperationsResponse>(new Error('No token available in store')));
        }
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.post<ListOperationsResponse>(`${this.apiUrl}/operations/list`, {
          fs: remoteId,
          remote: ''
        }, { headers }).pipe(
          map(response => toSuccess(response)),
          catchError(error => of(toFailure<ListOperationsResponse>(new Error(error.message ?? 'Unknown error'))))
        );
      }),
      startWith(toPending<ListOperationsResponse>())
    );
  }
}
