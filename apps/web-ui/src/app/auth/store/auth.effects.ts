import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, switchMap, map } from 'rxjs/operators';
import { authActions } from './auth.actions';
import { AuthWebApiService } from '../services/webapi.service';
import { hasSucceed } from '../../shared/results/results';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private webapiService = inject(AuthWebApiService);

  loadAuth$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(authActions.loadAuth),
      switchMap(({ code }) =>
        this.webapiService.fetchAccessToken(code).pipe(
          filter(result => !result.isLoading),
          map(result => {
            if (hasSucceed(result) && result.data) {
              return authActions.loadAuthSuccess({ token: result.data.token });
            } else {
              return authActions.loadAuthFailure({ error: result.error?.message ?? 'Unknown error' });
            }
          })
        )
      )
    );
  });
}
