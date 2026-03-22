import { Result, toSuccess } from '../../../shared/results/results';
import { TokenResponse } from '../../services/webapi.service';
import { loadAuth, loadAuthResult } from '../auth.actions';

describe('Auth Actions', () => {
  describe('loadAuth', () => {
    it('should create an action to load auth details', () => {
      const code = 'test-auth-code';
      const action = loadAuth({ code });

      expect(action.type).toBe('[Auth] Load auth details from auth code');
      expect(action.code).toBe(code);
    });
  });

  describe('loadAuthResult', () => {
    it('should create an action to save auth results', () => {
      const result: Result<TokenResponse> = toSuccess({
        token: 'mockAccessToken',
      });
      const action = loadAuthResult({ result });

      expect(action.type).toBe('[Auth] Saves results of getting auth details of a user');
      expect(action.result).toEqual(result);
    });
  });
});
