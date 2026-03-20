import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, mergeMap } from 'rxjs/operators';

import { toResult } from '../../shared/results/rxjs/toResult';
import { TokenResponse, WebApiService } from '../services/webapi.service';
import * as authActions from './auth.actions';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly webApiService = inject(WebApiService);

  loadAlbumDetails$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(authActions.loadAuth),
      mergeMap(({ code }) => {
        return this.webApiService.fetchAccessToken(code).pipe(
          toResult<TokenResponse>(),
          map((result) => authActions.loadAuthResult({ result })),
        );
      }),
    );
  });
}
