import * as authActions from '../auth.actions';
import { authReducer } from '../auth.reducer';
import { AuthState, buildInitialState } from '../auth.state';

describe('Auth Reducer', () => {
  let initialState: AuthState;

  beforeEach(() => {
    initialState = buildInitialState();
  });

  it('should update the state with setAuthToken action', () => {
    const action = authActions.setAuthToken({ authToken: 'mockAccessToken' });
    const state = authReducer(initialState, action);

    expect(state.authToken).toEqual('mockAccessToken');
  });
});
