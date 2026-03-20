import {
  hasFailed,
  hasSucceed,
  isPending,
  Result,
  toFailure,
  toPending,
  toSuccess,
} from '../results';

describe('Results', () => {
  describe('isPending', () => {
    it('should return true when isLoading is true', () => {
      const result: Result<string> = {
        data: undefined,
        isLoading: true,
        error: undefined,
      };
      expect(isPending(result)).toBe(true);
    });

    it('should return false when isLoading is false', () => {
      const result: Result<string> = {
        data: 'test',
        isLoading: false,
        error: undefined,
      };
      expect(isPending(result)).toBe(false);
    });
  });

  describe('hasSucceed', () => {
    it('should return true when data is defined, error is undefined, and isLoading is false', () => {
      const result: Result<string> = {
        data: 'test',
        isLoading: false,
        error: undefined,
      };
      expect(hasSucceed(result)).toBe(true);
    });

    it('should return false when error is defined', () => {
      const result: Result<string> = {
        data: 'test',
        isLoading: false,
        error: new Error(),
      };
      expect(hasSucceed(result)).toBe(false);
    });

    it('should return false when isLoading is true', () => {
      const result: Result<string> = {
        data: 'test',
        isLoading: true,
        error: undefined,
      };
      expect(hasSucceed(result)).toBe(false);
    });
  });

  describe('hasFailed', () => {
    it('should return true when error is defined', () => {
      const result: Result<string> = {
        data: undefined,
        isLoading: false,
        error: new Error(),
      };
      expect(hasFailed(result)).toBe(true);
    });

    it('should return false when error is undefined', () => {
      const result: Result<string> = {
        data: 'test',
        isLoading: false,
        error: undefined,
      };
      expect(hasFailed(result)).toBe(false);
    });
  });

  describe('toPending', () => {
    it('should return a pending result', () => {
      const result = toPending<string>();
      expect(result).toEqual({
        data: undefined,
        isLoading: true,
        error: undefined,
      });
    });
  });

  describe('toSuccess', () => {
    it('should return a success result with the provided data', () => {
      const data = 'test';
      const result = toSuccess(data);
      expect(result).toEqual({
        data: 'test',
        isLoading: false,
        error: undefined,
      });
    });
  });

  describe('toFailure', () => {
    it('should return a failure result with the provided error', () => {
      const error = new Error('Test error');
      const result = toFailure<string>(error);
      expect(result).toEqual({
        data: undefined,
        isLoading: false,
        error: error,
      });
    });
  });
});
