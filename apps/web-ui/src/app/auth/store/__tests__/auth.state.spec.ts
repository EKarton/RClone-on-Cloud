import {
  AuthState,
  buildInitialState,
  selectAuthState,
  selectAuthToken,
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
      authToken: 'mockAccessToken',
    };

    const result = selectAuthToken.projector(state);
    expect(result).toEqual('mockAccessToken');
  });
});
