import { createFeature, createReducer, on } from '@ngrx/store';
import { authActions } from './auth.actions';

export interface AuthState {
  token: string | null;
  error: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  token: null,
  error: null,
  loading: false,
};

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialState,
    on(authActions.loadAuth, (state) => ({ ...state, loading: true, error: null })),
    on(authActions.loadAuthSuccess, (state, { token }) => ({ ...state, loading: false, token, error: null })),
    on(authActions.loadAuthFailure, (state, { error }) => ({ ...state, loading: false, error })),
  ),
});

export const { selectToken, selectLoading, selectError, name, reducer } = authFeature;
