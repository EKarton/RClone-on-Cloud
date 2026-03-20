import { toFailure, toSuccess } from '../../../shared/results/results';
import { TokenResponse } from '../../services/webapi.service';
import * as authActions from '../auth.actions';
import { authReducer } from '../auth.reducer';
import { AuthState, buildInitialState } from '../auth.state';

describe('Auth Reducer', () => {
  let initialState: AuthState;

  beforeEach(() => {
    initialState = buildInitialState();
  });

  it('should update the state with loadAuthResult action', () => {
    const mockResult = toSuccess<TokenResponse>({
      accessToken: 'mockAccessToken',
      userProfileUrl: 'mockUserProfileUrl',
      mapboxApiToken: 'mockMapboxApiToken',
    });

    const action = authActions.loadAuthResult({ result: mockResult });
    const state = authReducer(initialState, action);

    expect(state.authToken).toEqual('mockAccessToken');
    expect(state.userProfileUrl).toEqual('mockUserProfileUrl');
    expect(state.mapboxApiToken).toEqual('mockMapboxApiToken');
  });

  it('should handle loadAuthResult action with missing data gracefully', () => {
    const mockResult = toFailure<TokenResponse>(new Error('Random error'));

    const action = authActions.loadAuthResult({ result: mockResult });
    const state = authReducer(initialState, action);

    expect(state.authToken).toEqual('');
    expect(state.userProfileUrl).toEqual('');
    expect(state.mapboxApiToken).toEqual('');
  });
});
