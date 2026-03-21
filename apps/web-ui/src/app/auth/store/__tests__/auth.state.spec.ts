import { toPending, toSuccess } from '../../../shared/results/results';
import {
  AuthState,
  buildInitialState,
  selectAuthState,
  selectAuthToken,
  selectAuthTokenResult,
  selectUserProfileUrl,
} from '../auth.state';

describe('Auth Selectors', () => {
  let initialState: AuthState;

  beforeEach(() => {
    initialState = buildInitialState();
  });

  it('should select the auth state', () => {
    const result = selectAuthState.projector(initialState);
    expect(result).toEqual(initialState);
  });

  it('should select the auth token result', () => {
    const state: AuthState = {
      authToken: toSuccess('mockAccessToken'),
    };

    const result = selectAuthTokenResult.projector(state);
    expect(result).toEqual(toSuccess('mockAccessToken'));
  });

  it('should select the auth token value', () => {
    const result = selectAuthToken.projector(toSuccess('mockAccessToken'));
    expect(result).toBe('mockAccessToken');
  });

  it('should select the user profile URL', () => {
    const result = selectUserProfileUrl.projector(initialState);
    expect(result).toBe('');
  });

  it('should return pending for auth token result when state is initial', () => {
    const result = selectAuthTokenResult.projector(initialState);
    expect(result).toEqual(toPending());
  });

  it('should return empty string for auth token value when token is pending', () => {
    const result = selectAuthToken.projector(toPending());
    expect(result).toBe('');
  });
});
