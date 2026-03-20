import { createFeature, createReducer, on } from '@ngrx/store';

import * as authActions from './auth.actions';
import { AuthState, buildInitialState, FEATURE_KEY } from './auth.state';

/** The auth reducer */
export const authReducer = createReducer(
  buildInitialState(),

  on(authActions.loadAuthResult, (state, { result }): AuthState => {
    return {
      ...state,
      authToken: result.data?.accessToken ?? '',
      userProfileUrl: result.data?.userProfileUrl ?? '',
      mapboxApiToken: result.data?.mapboxApiToken ?? '',
    };
  }),
);

export const authFeature = createFeature({
  name: FEATURE_KEY,
  reducer: authReducer,
});
