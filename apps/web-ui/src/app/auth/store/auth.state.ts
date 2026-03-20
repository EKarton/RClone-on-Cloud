import { createFeatureSelector, createSelector } from '@ngrx/store';

/** The type defs of this NgRx store. */
export interface AuthState {
  authToken: string;
  userProfileUrl: string;
  mapboxApiToken: string;
}

/** Used to build the initial state of the NgRx store. */
export const buildInitialState: () => AuthState = () => ({
  authToken: '',
  userProfileUrl: '',
  mapboxApiToken: '',
});

/** The feature key shared with the reducer. */
export const FEATURE_KEY = 'Auth';

/** Returns the entire state of the auth store */
export const selectAuthState = createFeatureSelector<AuthState>(FEATURE_KEY);

/** Returns the auth token. */
export const selectAuthToken = createSelector(
  selectAuthState,
  (state) => state.authToken,
);

/** Returns the user profile url. */
export const selectUserProfileUrl = createSelector(
  selectAuthState,
  (state) => state.userProfileUrl,
);

/** Returns the mapbox api token. */
export const selectMapboxApiToken = createSelector(
  selectAuthState,
  (state) => state.mapboxApiToken,
);
