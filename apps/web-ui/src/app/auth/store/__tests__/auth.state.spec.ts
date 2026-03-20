import {
  AuthState,
  buildInitialState,
  selectAuthState,
  selectAuthToken,
  selectMapboxApiToken,
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

  it('should select the auth token', () => {
    const state: AuthState = {
      authToken: 'mockAccessToken',
      userProfileUrl: 'mockUserProfileUrl',
      mapboxApiToken: 'mockMapboxApiToken',
    };

    const result = selectAuthToken.projector(state);
    expect(result).toBe('mockAccessToken');
  });

  it('should select the user profile URL', () => {
    const state: AuthState = {
      authToken: 'mockAccessToken',
      userProfileUrl: 'mockUserProfileUrl',
      mapboxApiToken: 'mockMapboxApiToken',
    };

    const result = selectUserProfileUrl.projector(state);
    expect(result).toBe('mockUserProfileUrl');
  });

  it('should return empty string for auth token when state is initial', () => {
    const result = selectAuthToken.projector(initialState);
    expect(result).toBe('');
  });

  it('should return empty string for user profile URL when state is initial', () => {
    const result = selectUserProfileUrl.projector(initialState);
    expect(result).toBe('');
  });

  it('should return empty string for mapbox api token when state is initial', () => {
    const result = selectMapboxApiToken.projector(initialState);
    expect(result).toBe('');
  });
});
