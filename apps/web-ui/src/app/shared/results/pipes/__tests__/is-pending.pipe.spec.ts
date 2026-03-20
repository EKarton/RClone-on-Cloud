import { Result, toFailure, toSuccess } from '../../results';
import { IsPendingPipe } from '../is-pending.pipe';

describe('IsPendingPipe', () => {
  let pipe: IsPendingPipe;

  beforeEach(() => {
    pipe = new IsPendingPipe();
  });

  it('should return true for a pending result', () => {
    const pendingResult: Result<number> = {
      data: undefined,
      isLoading: true,
      error: undefined,
    };
    expect(pipe.transform(pendingResult)).toBe(true);
  });

  it('should return false for a successful result', () => {
    const successResult: Result<number> = toSuccess(42);
    expect(pipe.transform(successResult)).toBe(false);
  });

  it('should return false for a failed result', () => {
    const failedResult: Result<number> = toFailure(new Error('Test error'));
    expect(pipe.transform(failedResult)).toBe(false);
  });
});
