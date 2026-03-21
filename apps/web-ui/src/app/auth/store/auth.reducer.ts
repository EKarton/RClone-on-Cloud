import { createFeature, createReducer, on } from '@ngrx/store';

import { toPending, toSuccess, toFailure } from '../../shared/results/results';
import * as authActions from './auth.actions';
import { AuthState, buildInitialState, FEATURE_KEY } from './auth.state';

/** The auth reducer */
export const authReducer = createReducer(
  buildInitialState(),

  on(authActions.loadAuth, (state): AuthState => {
    return {
      ...state,
      authToken: toPending<string>(),
    };
  }),

  on(authActions.loadAuthStarted, (state): AuthState => {
    return {
      ...state,
      authToken: toPending<string>(),
    };
  }),

  on(authActions.loadAuthResult, (_state, { result }): AuthState => {
    if (result.error) {
      return {
        authToken: toFailure<string>(result.error),
      };
    }
    return {
      authToken: toSuccess<string>(result.data?.token ?? ''),
    };
  }),
);

export const authFeature = createFeature({
  name: FEATURE_KEY,
  reducer: authReducer,
});
