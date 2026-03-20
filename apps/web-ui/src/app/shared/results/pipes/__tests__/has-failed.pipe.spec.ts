import { Result, toFailure, toSuccess } from '../../results';
import { HasFailedPipe } from '../has-failed.pipe';

describe('HasFailedPipe', () => {
  let pipe: HasFailedPipe;

  beforeEach(() => {
    pipe = new HasFailedPipe();
  });

  it('should return true for a failed result', () => {
    const failedResult: Result<number> = toFailure(new Error('Test error'));
    expect(pipe.transform(failedResult)).toBe(true);
  });

  it('should return false for a successful result', () => {
    const successResult: Result<number> = toSuccess(42);
    expect(pipe.transform(successResult)).toBe(false);
  });

  it('should return false for a pending result', () => {
    const pendingResult: Result<number> = {
      data: undefined,
      isLoading: true,
      error: undefined,
    };
    expect(pipe.transform(pendingResult)).toBe(false);
  });
});
