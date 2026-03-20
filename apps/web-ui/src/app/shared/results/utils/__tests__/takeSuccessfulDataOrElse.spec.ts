import { Result, toFailure, toPending, toSuccess } from '../../results';
import { takeSuccessfulDataOrElse } from '../takeSuccessfulDataOrElse';

describe('takeSuccessfulDataOrElse', () => {
  it('should return defaultValue when result is pending', () => {
    const result = toPending<number>();
    const output = takeSuccessfulDataOrElse(result, 123);

    expect(output).toBe(123);
  });

  it('should return defaultValue when result has failed', () => {
    const result = toFailure<number>(new Error('fail'));
    const output = takeSuccessfulDataOrElse(result, 456);

    expect(output).toBe(456);
  });

  it('should return result.data when result is success', () => {
    const result = toSuccess<number>(789);

    const output = takeSuccessfulDataOrElse(result, 0);

    expect(output).toBe(789);
  });

  it('should return defaultValue if result.data is undefined even if success', () => {
    const result: Result<number> = {
      data: undefined,
      isLoading: false,
      error: undefined,
    };
    const output = takeSuccessfulDataOrElse(result, 42);

    expect(output).toBeUndefined();
  });
});
