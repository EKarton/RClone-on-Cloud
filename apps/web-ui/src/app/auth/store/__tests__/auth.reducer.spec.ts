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

  it('should update the state with loadAuth action', () => {
    const action = authActions.loadAuth({ code: 'test' });
    const state = authReducer(initialState, action);

    expect(state.authToken.isLoading).toBeTrue();
  });

  it('should update the state with loadAuthStarted action', () => {
    const action = authActions.loadAuthStarted();
    const state = authReducer(initialState, action);

    expect(state.authToken.isLoading).toBeTrue();
  });

  it('should update the state with loadAuthResult action', () => {
    const mockResult = toSuccess<TokenResponse>({
      token: 'mockAccessToken',
    });

    const action = authActions.loadAuthResult({ result: mockResult });
    const state = authReducer(initialState, action);

    expect(state.authToken).toEqual(toSuccess('mockAccessToken'));
  });

  it('should handle loadAuthResult action with missing data gracefully', () => {
    const error = new Error('Random error');
    const mockResult = toFailure<TokenResponse>(error);

    const action = authActions.loadAuthResult({ result: mockResult });
    const state = authReducer(initialState, action);

    expect(state.authToken).toEqual(toFailure('Random error' as any));
    // Actually toFailure(error) stores the error object.
    expect(state.authToken.error).toBe(error);
  });
});
