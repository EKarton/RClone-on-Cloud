import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, throwError } from 'rxjs';

import { Result, toFailure, toSuccess } from '../../../shared/results/results';
import { WebApiService } from '../../services/webapi.service';
import { TokenResponse } from '../../services/webapi.service';
import * as authActions from '../auth.actions';
import { AuthEffects } from '../auth.effects';

describe('AuthEffects', () => {
  let actions$: Actions;
  let effects: AuthEffects;
  let webApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('WebApiService', ['fetchAccessToken']);

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        { provide: WebApiService, useValue: spy },
      ],
    });

    effects = TestBed.inject(AuthEffects);
    webApiService = TestBed.inject(
      WebApiService,
    ) as jasmine.SpyObj<WebApiService>;
  });

  it('should dispatch loadAuthResult action on successful token fetch', (done) => {
    const code = 'test-auth-code';
    const tokenResponse: TokenResponse = {
      accessToken: 'mockAccessToken',
      userProfileUrl: 'http://profile.com/1',
      mapboxApiToken: 'mockMapboxApiToken',
    };
    const result: Result<TokenResponse> = toSuccess(tokenResponse);

    actions$ = of(authActions.loadAuth({ code }));
    webApiService.fetchAccessToken.and.returnValue(of(tokenResponse));

    effects.loadAlbumDetails$.subscribe((action) => {
      expect(action).toEqual(authActions.loadAuthResult({ result }));
      done();
    });
  });

  it('should handle errors gracefully', (done) => {
    const error = new Error('Some error');
    const code = 'test-auth-code';

    actions$ = of(authActions.loadAuth({ code }));
    webApiService.fetchAccessToken.and.returnValue(throwError(() => error));

    effects.loadAlbumDetails$.subscribe((action) => {
      expect(action).toEqual(
        authActions.loadAuthResult({ result: toFailure(error) }),
      );
      done();
    });
  });
});
