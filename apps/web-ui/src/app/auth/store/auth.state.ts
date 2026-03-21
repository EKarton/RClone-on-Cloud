import { createFeatureSelector, createSelector } from '@ngrx/store';

/** The type defs of this NgRx store. */
export interface AuthState {
  authToken: string;
}

/** Used to build the initial state of the NgRx store. */
export const buildInitialState: () => AuthState = () => ({
  authToken: '',
});

/** The feature key shared with the reducer. */
export const FEATURE_KEY = 'Auth';

/** Returns the entire state of the auth store */
export const selectAuthState = createFeatureSelector<AuthState>(FEATURE_KEY);

/** Returns the auth token value as a string. */
export const selectAuthToken = createSelector(
  selectAuthState,
  (state) => state.authToken,
);
